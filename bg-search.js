import {
  createResponseCallback,
  funcHackyparse,
  BackgroundUtils,
  AsyncSeries
} from "./utils.js";

export const Search = {
  init: function (objRequest, funcResponse) {
    console.log("Search.init called");
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

  lookup: function (objRequest, funcResponse) {
    AsyncSeries.run(
      {
        objDatabase: BackgroundUtils.database("readonly"),
        objGet: function (objArgs, funcCallback) {
          if (!objArgs.objDatabase) {
            console.error("Database object store not available");
            return funcCallback([]);
          }
          
          let objQuery = objArgs.objDatabase
            .index("intTimestamp")
            .openCursor(null, "prev");

          objQuery.skip = objRequest.intSkip;
          objQuery.results = [];

          objQuery.onerror = function () {
            console.error("Database cursor error:", objQuery.error);
            return funcCallback([]);
          };

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback(objQuery.results);
            }

            if (objQuery.results.length === objRequest.intLength) {
              return funcCallback(objQuery.results);
            }

            // Check if this video matches the search criteria
            let matches = false;
            
            if (!objRequest.strQuery || objRequest.strQuery.trim() === '') {
              // Empty query - show all videos
              matches = true;
            } else {
              // Non-empty query - search in both ID and title (case-insensitive)
              const searchTerm = objRequest.strQuery.toLowerCase().trim();
              const videoId = (objQuery.result.value.strIdent || '').toLowerCase();
              const videoTitle = (objQuery.result.value.strTitle || '').toLowerCase();
              
              matches = videoId.includes(searchTerm) || videoTitle.includes(searchTerm);
            }

            if (matches) {
              if (objQuery.skip !== 0) {
                objQuery.skip -= 1;
              } else {
                objQuery.results.push({
                  strIdent: objQuery.result.value.strIdent,
                  intTimestamp: objQuery.result.value.intTimestamp,
                  strTitle: objQuery.result.value.strTitle,
                  intCount: objQuery.result.value.intCount,
                });
              }
            }

            objQuery.result.continue();
          };
        },
      },
      createResponseCallback(objArgs => ({ objVideos: objArgs.objGet }), funcResponse),
    );
  },

  delete: function (objRequest, funcResponse, funcProgress) {
    AsyncSeries.run(
      {
        objDatabase: BackgroundUtils.database("readwrite"),
        objDelete: function (objArgs, funcCallback) {
          if (!objArgs.objDatabase) {
            console.error("Database object store not available");
            return funcCallback(null);
          }
          
          funcProgress({
            strProgress: "1/2 - deleting it from the database",
          });

          let objQuery = objArgs.objDatabase.delete(objRequest.strIdent);

          objQuery.onerror = function () {
            console.error("Database delete error:", objQuery.error);
            return funcCallback(null);
          };

          objQuery.onsuccess = function () {
            return funcCallback({});
          };
        },
        objCount: BackgroundUtils.count(),
        objHistory: function (objArgs, funcCallback) {
          funcProgress({
            strProgress: "2/2 - deleting it from the history in the browser",
          });

          chrome.history.search(
            {
              text: objRequest.strIdent,
              startTime: 0,
              maxResults: 1000000,
            },
            function (objResults) {
              for (let objResult of objResults) {
                if (
                  objResult.url.indexOf("https://www.youtube.com/watch?v=") !==
                  0 &&
                  objResult.url.indexOf("https://www.youtube.com/shorts/") !==
                  0 &&
                  objResult.url.indexOf("https://m.youtube.com/watch?v=") !== 0
                ) {
                  continue;
                } else if (
                  objResult.title === undefined ||
                  objResult.title === null
                ) {
                  continue;
                }

                chrome.history.deleteUrl({
                  url: objResult.url,
                });
              }

              return funcCallback({});
            },
          );
        },
      },
      createResponseCallback(() => ({ success: true }), funcResponse),
    );
  },
};