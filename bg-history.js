import {
  createResponseCallback,
  BackgroundUtils,
  AsyncSeries
} from "./utils.js";
import { DatabaseUtils } from "./database-utils.js";
import { STORAGE_KEYS } from "./constants.js";

export const History = {
  init: function (objRequest, funcResponse) {
    AsyncSeries.run(
      {
        objMessaging: BackgroundUtils.messaging('history', { 'history-synchronize': History.synchronize }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  synchronize: function (objRequest, funcResponse, funcProgress) {
    // Validate request
    if (!objRequest || typeof objRequest.intTimestamp !== 'number') {
      console.error("Invalid request - missing or invalid timestamp:", objRequest);
      funcResponse(null);
      return;
    }

    AsyncSeries.run(
      {
        objVideos: function (objArgs, funcCallback) {
          chrome.history.search(
            {
              text: "youtube.com",
              startTime: objRequest.intTimestamp,
              maxResults: 1000000,
            },
            function (objResults) {
              if (chrome.runtime.lastError) {
                console.error("Chrome history search error:", chrome.runtime.lastError);
                funcCallback(null);
                return;
              }

              if (!objResults) {
                console.error("No results returned from history search");
                funcCallback(null);
                return;
              }

              let objVideos = [];
              let processedCount = 0;
              let skippedCount = 0;

              for (let objResult of objResults) {
                // Check if URL is a YouTube video URL
                if (
                  objResult.url.indexOf("https://www.youtube.com/watch?v=") !== 0 &&
                  objResult.url.indexOf("https://www.youtube.com/shorts/") !== 0 &&
                  objResult.url.indexOf("https://m.youtube.com/watch?v=") !== 0
                ) {
                  skippedCount++;
                  continue;
                }

                // Check if title exists
                if (
                  objResult.title === undefined ||
                  objResult.title === null ||
                  objResult.title.trim() === ""
                ) {
                  skippedCount++;
                  continue;
                }

                // Clean up YouTube title
                let cleanTitle = objResult.title;
                if (cleanTitle.slice(-10) === " - YouTube") {
                  cleanTitle = cleanTitle.slice(0, -10);
                }

                // Extract video ID from URL
                let videoId;
                
                if (objResult.url.indexOf("https://www.youtube.com/watch?v=") === 0 ||
                    objResult.url.indexOf("https://m.youtube.com/watch?v=") === 0) {
                  // For regular YouTube URLs: https://www.youtube.com/watch?v=VIDEO_ID&other=params
                  const urlParams = new URL(objResult.url).searchParams;
                  videoId = urlParams.get('v');
                } else if (objResult.url.indexOf("https://www.youtube.com/shorts/") === 0) {
                  // For YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID?t=33
                  const shortsPath = objResult.url.replace("https://www.youtube.com/shorts/", "");
                  videoId = shortsPath.split('?')[0]; // Remove any query parameters
                }
                
                // Validate video ID format (11 characters, alphanumeric and dashes/underscores)
                if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                  console.warn("Invalid video ID format:", videoId, "from URL:", objResult.url);
                  skippedCount++;
                  continue;
                }

                objVideos.push({
                  strIdent: videoId,
                  intTimestamp: objResult.lastVisitTime,
                  strTitle: cleanTitle,
                  intCount: objResult.visitCount || 1,
                });
                processedCount++;
              }

              // Store the video count for later use
              objArgs.videoCount = processedCount;

              // If no videos found, return empty array but don't fail
              if (objVideos.length === 0) {
                console.log("No new videos found in browser history since last sync");
                return funcCallback([]);
              }

              return funcCallback(objVideos);
            },
          );
        },
        objProcessVideos: function (objArgs, funcCallback) {
          // If no videos to process, skip to completion
          if (!objArgs.objVideos || objArgs.objVideos.length === 0) {
            console.log("No videos to process, skipping database operations");
            return funcCallback({
              videoCount: objArgs.videoCount || 0,
              processedVideos: 0
            }, []);
          }
          
          // Continue with normal processing
          return funcCallback({}, "objDatabase");
        },
        objDatabase: DatabaseUtils.database("readwrite"),
        objVideo: BackgroundUtils.video(),
        objGet: DatabaseUtils.get((progress) => {
          // Track progress for video count
        }),
        objPut: DatabaseUtils.put(),
        "objVideo-Next": DatabaseUtils.videoNext(),
        objCount: DatabaseUtils.count(),

      },
      createResponseCallback((result) => {
        // Add video count information to the response
        if (result && result.videoCount !== undefined) {
          result.videoCount = result.videoCount;
        } else if (result && result.objVideos) {
          result.videoCount = result.objVideos.length;
        } else {
          result.videoCount = 0;
        }
        return result;
      }, (result) => {
        if (result === null) {
          console.error("History synchronization failed");
        }
        funcResponse(result);
      }),
    );
  },
};