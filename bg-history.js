import {
  createResponseCallback,
  BackgroundUtils,
  AsyncSeries,
  decodeHtmlEntitiesAndFixEncoding
} from "./utils.js";

export const History = {
  init: function (objRequest, funcResponse) {
    AsyncSeries.run(
      {
        objMessaging: BackgroundUtils.messaging('history', { 'history-synchronize': History.synchronize }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  synchronize: async function (objRequest, funcResponse, funcProgress) {
    try {
      // Validate request
      if (!objRequest || typeof objRequest.intTimestamp !== 'number') {
        console.error("Invalid request - missing or invalid timestamp:", objRequest);
        funcResponse(null);
        return;
      }

      // Get the database provider factory
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse(null);
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse(null);
        return;
      }

      // Search Chrome history for YouTube videos
      const historyResults = await new Promise((resolve, reject) => {
        chrome.history.search(
          {
            text: "youtube.com",
            startTime: objRequest.intTimestamp,
            maxResults: 1000000,
          },
          function (objResults) {
            if (chrome.runtime.lastError) {
              console.error("Chrome history search error:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }

            if (!objResults) {
              console.error("No results returned from history search");
              reject(new Error("No results returned"));
              return;
            }

            resolve(objResults);
          }
        );
      });

      let processedVideos = [];
      let processedCount = 0;
      let skippedCount = 0;

      for (let historyResult of historyResults) {
        // Check if URL is a YouTube video URL
        if (
          historyResult.url.indexOf("https://www.youtube.com/watch?v=") !== 0 &&
          historyResult.url.indexOf("https://www.youtube.com/shorts/") !== 0 &&
          historyResult.url.indexOf("https://m.youtube.com/watch?v=") !== 0
        ) {
          skippedCount++;
          continue;
        }

        // Check if title exists
        if (
          historyResult.title === undefined ||
          historyResult.title === null ||
          historyResult.title.trim() === ""
        ) {
          skippedCount++;
          continue;
        }

        // Clean up YouTube title
        let cleanTitle = historyResult.title;
        if (cleanTitle.slice(-10) === " - YouTube") {
          cleanTitle = cleanTitle.slice(0, -10);
        }
        
        // Fix UTF-8 double encoding issues in the title
        cleanTitle = decodeHtmlEntitiesAndFixEncoding(cleanTitle);

        // Extract video ID from URL
        let videoId;
        
        if (historyResult.url.indexOf("https://www.youtube.com/watch?v=") === 0 ||
            historyResult.url.indexOf("https://m.youtube.com/watch?v=") === 0) {
          // For regular YouTube URLs: https://www.youtube.com/watch?v=VIDEO_ID&other=params
          const urlParams = new URL(historyResult.url).searchParams;
          videoId = urlParams.get('v');
        } else if (historyResult.url.indexOf("https://www.youtube.com/shorts/") === 0) {
          // For YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID?t=33
          const shortsPath = historyResult.url.replace("https://www.youtube.com/shorts/", "");
          videoId = shortsPath.split('?')[0]; // Remove any query parameters
        }
        
        // Validate video ID format (11 characters, alphanumeric and dashes/underscores)
        if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          console.warn("Invalid video ID format:", videoId, "from URL:", historyResult.url);
          skippedCount++;
          continue;
        }

        // Check if video already exists in the database
        const existingVideo = await currentProvider.getVideo(videoId);
        
        let videoToStore;
        if (existingVideo) {
          // Update existing video with latest timestamp and count
          videoToStore = {
            strIdent: videoId,
            intTimestamp: Math.max(existingVideo.intTimestamp || 0, historyResult.lastVisitTime || 0),
            strTitle: existingVideo.strTitle || cleanTitle,
            intCount: Math.max(existingVideo.intCount || 1, historyResult.visitCount || 1),
          };
        } else {
          // Create new video record
          videoToStore = {
            strIdent: videoId,
            intTimestamp: historyResult.lastVisitTime,
            strTitle: cleanTitle,
            intCount: historyResult.visitCount || 1,
          };
        }

        // Store the video in the current provider
        await currentProvider.putVideo(videoToStore);
        processedVideos.push(videoToStore);
        processedCount++;

        // Report progress every 100 videos
        if (processedCount % 100 === 0 && funcProgress) {
          funcProgress({
            strProgress: `imported ${processedCount} videos`,
          });
        }
      }

      // Return results
      const result = {
        objVideos: processedVideos,
        videoCount: processedCount,
        skippedCount: skippedCount
      };

      console.log(`History sync completed: ${processedCount} videos processed, ${skippedCount} skipped`);
      funcResponse(result);

    } catch (error) {
      console.error("History synchronization error:", error);
      funcResponse(null);
    }
  },
};