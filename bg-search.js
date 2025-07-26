import {
  createResponseCallback,
  BackgroundUtils,
  AsyncSeries
} from "./utils.js";

export const Search = {
  init: function (objRequest, funcResponse) {
    AsyncSeries.run(
      {
        objMessaging: BackgroundUtils.messaging('search', {
          'search-lookup': Search.lookup,
          'search-delete': Search.delete
        }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  lookup: async function (objRequest, funcResponse) {
    try {
      // Use the database provider factory instead of direct IndexedDB access
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse({ objVideos: [] });
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse({ objVideos: [] });
        return;
      }

      // Get all videos from the current provider
      const allVideos = await currentProvider.getAllVideos();
      
      // Filter videos based on search query
      let filteredVideos = [];
      
      if (!objRequest.strQuery || objRequest.strQuery.trim() === '') {
        // Empty query - show all videos
        filteredVideos = allVideos;
      } else {
        // Non-empty query - search in both ID and title (case-insensitive)
        const searchTerm = objRequest.strQuery.toLowerCase().trim();
        filteredVideos = allVideos.filter(video => {
          const videoId = (video.strIdent || '').toLowerCase();
          const videoTitle = (video.strTitle || '').toLowerCase();
          return videoId.includes(searchTerm) || videoTitle.includes(searchTerm);
        });
      }

      // Sort by timestamp (newest first) to match original behavior
      filteredVideos.sort((a, b) => (b.intTimestamp || 0) - (a.intTimestamp || 0));

      // Apply pagination
      const skip = objRequest.intSkip || 0;
      const length = objRequest.intLength || filteredVideos.length;
      const paginatedVideos = filteredVideos.slice(skip, skip + length);

      // Return in the expected format
      funcResponse({ objVideos: paginatedVideos });
      
    } catch (error) {
      console.error("Search lookup error:", error);
      funcResponse({ objVideos: [] });
    }
  },

  delete: async function (objRequest, funcResponse, funcProgress) {
    try {
      // Use the database provider factory instead of direct IndexedDB access
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse({ success: false });
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse({ success: false });
        return;
      }

      // Step 1: Delete from database
      funcProgress({
        strProgress: "1/2 - deleting it from the database",
      });

      await currentProvider.deleteVideo(objRequest.strIdent);

      // Step 2: Delete from browser history  
      funcProgress({
        strProgress: "2/2 - deleting it from the history in the browser",
      });

      // Search for YouTube URLs containing this video ID
      const historyResults = await new Promise((resolve) => {
        chrome.history.search(
          {
            text: objRequest.strIdent,
            startTime: 0,
            maxResults: 1000000,
          },
          resolve
        );
      });

      // Delete matching URLs from browser history
      for (let historyResult of historyResults) {
        if (
          historyResult.url.indexOf("https://www.youtube.com/watch?v=") !== 0 &&
          historyResult.url.indexOf("https://www.youtube.com/shorts/") !== 0 &&
          historyResult.url.indexOf("https://m.youtube.com/watch?v=") !== 0
        ) {
          continue;
        } else if (
          historyResult.title === undefined ||
          historyResult.title === null
        ) {
          continue;
        }

        chrome.history.deleteUrl({
          url: historyResult.url,
        });
      }

      funcResponse({ success: true });
      
    } catch (error) {
      console.error("Search delete error:", error);
      funcResponse({ success: false });
    }
  },
};