import {
  createResponseCallback,
  BackgroundUtils,
  AsyncSeries
} from "./utils.js";

export const History = {
  init: function (objRequest, funcResponse) {
    console.log("History.init called");
    AsyncSeries.run(
      {
        objMessaging: BackgroundUtils.messaging('history', { 'history-synchronize': History.synchronize }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  synchronize: function (objRequest, funcResponse, funcProgress) {
    console.log("History.synchronize called with request:", objRequest);
    
    // Validate request
    if (!objRequest || typeof objRequest.intTimestamp !== 'number') {
      console.error("Invalid request - missing or invalid timestamp:", objRequest);
      funcResponse(null);
      return;
    }

    console.log("Starting browser history synchronization...");

    AsyncSeries.run(
      {
        objVideos: function (objArgs, funcCallback) {
          console.log("Searching browser history from timestamp:", objRequest.intTimestamp);

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

              console.log(`Found ${objResults.length} history entries`);
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
                const videoId = objResult.url.split("&")[0].slice(-11);
                
                // Validate video ID format (11 characters, alphanumeric and dashes/underscores)
                if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
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

              console.log(`Processed ${processedCount} videos, skipped ${skippedCount} entries`);

              // Store the video count for later use
              objArgs.videoCount = processedCount;

              return funcCallback(objVideos);
            },
          );
        },
        objDatabase: function (objArgs, funcCallback) {
          console.log("Getting database connection...");

          try {
            const dbConnection = BackgroundUtils.database("readwrite");
            dbConnection(objArgs, (result) => {
              if (!result) {
                console.error("Failed to get database connection");
                funcCallback(null);
                return;
              }
              console.log("Database connection established");
              funcCallback(result);
            });
          } catch (error) {
            console.error("Error getting database connection:", error);
            funcCallback(null);
          }
        },
        objVideo: BackgroundUtils.video(),
        objGet: BackgroundUtils.get((progress) => {
          // Track progress for video count
          if (progress && progress.strProgress) {
            console.log("History sync progress:", progress.strProgress);
          }
        }),
        objPut: BackgroundUtils.put(),
        "objVideo-Next": BackgroundUtils.videoNext(),
        objCount: BackgroundUtils.count(),
        objTime: BackgroundUtils.time("extensions.Youwatch.History.intTimestamp"),
      },
      createResponseCallback((result) => {
        console.log("History synchronization completed:", result);
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