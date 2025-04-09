import {
  Node,
  createResponseCallback,
  setStorageSync,
  bgObject
} from "./utils.js";
import { Database } from "./bg-database.js";

export const History = {
  init: function (objRequest, funcResponse) {
    console.log("History.init called");
    Node.series(
      {
        objMessaging: bgObject.messaging('history', { 'historySynchronize': History.synchronize }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  synchronize: function (objRequest, funcResponse, funcProgress) {
    Node.series(
      {
        objVideos: function (objArgs, funcCallback) {
          chrome.history.search(
            {
              text: "youtube.com",
              startTime: objRequest.intTimestamp,
              maxResults: 1000000,
            },
            function (objResults) {
              let objVideos = [];

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

                if (objResult.title.slice(-10) === " - YouTube") {
                  objResult.title = objResult.title.slice(0, -10);
                }

                objVideos.push({
                  strIdent: objResult.url.split("&")[0].slice(-11),
                  intTimestamp: objResult.lastVisitTime,
                  strTitle: objResult.title,
                  intCount: objResult.visitCount,
                });
              }

              return funcCallback(objVideos);
            },
          );
        },
        objDatabase: bgObject.database(),
        objVideo: function (objArgs, funcCallback) {
          if (objArgs.hasOwnProperty("intVideo") === false) {
            objArgs.intVideo = 0;
          }

          if (objArgs.intVideo >= objArgs.objVideos.length) {
            return funcCallback({}, "objVideo-Next");
          }

          return funcCallback(objArgs.objVideos[objArgs.intVideo]);
        },
        objGet: bgObject.get(funcProgress),
        objPut: bgObject.put(),
        "objVideo-Next": function (objArgs, funcCallback) {
          objArgs.intVideo += 1;

          if (objArgs.intVideo < objArgs.objVideos.length) {
            return funcCallback({}, "objVideo");
          }

          objArgs.intVideo = 0;

          return funcCallback({});
        },
        objCount: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase.count();

          objQuery.onsuccess = function () {
            setStorageSync(
              "extensions.Youwatch.Database.intSize",
              String(objQuery.result),
            );

            return funcCallback({});
          };
        },
        objTime: function (objArgs, funcCallback) {
          setStorageSync(
            "extensions.Youwatch.History.intTimestamp",
            String(new Date().getTime()),
          );

          return funcCallback({});
        },
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },
};