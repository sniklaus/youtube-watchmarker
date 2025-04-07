import {
  Node,
  setStorageSync,
} from "./utils.js";
import { Database } from "./bg-database.js";

export const History = {
  init: function (objRequest, funcResponse) {
    console.log("History.init called");
    Node.series(
      {
        objMessaging: function (objArgs, funcCallback) {
          chrome.runtime.onConnect.addListener(function (objPort) {
            if (objPort.name === "history") {
              objPort.onMessage.addListener(function (objData) {
                const strMessage = objData.strMessage;
                const objRequest = objData.objRequest;
                const funcResponse = function (objResponse) {
                  objPort.postMessage({
                    strMessage: strMessage,
                    objResponse: objResponse,
                  });
                };
                const funcProgress = function (objResponse) {
                  objPort.postMessage({
                    strMessage: `${strMessage}-progress`,
                    objResponse: objResponse,
                  });
                };

                if (strMessage === "historySynchronize") {
                  History.synchronize(objRequest, funcResponse, funcProgress);
                } else {
                  console.error("Received unexpected message:", strMessage);
                }
              });
            }
          });

          return funcCallback({});
        },
      },
      function (objArgs) {
        if (objArgs === null) {
          funcResponse(null);
        } else if (objArgs !== null) {
          funcResponse({});
        }
      },
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
        objDatabase: function (objArgs, funcCallback) {
          return funcCallback(
            Database.objDatabase
              .transaction(["storeDatabase"], "readwrite")
              .objectStore("storeDatabase"),
          );
        },
        objVideo: function (objArgs, funcCallback) {
          if (objArgs.hasOwnProperty("intVideo") === false) {
            objArgs.intVideo = 0;
          }

          if (objArgs.intVideo >= objArgs.objVideos.length) {
            return funcCallback({}, "objVideo-Next");
          }

          return funcCallback(objArgs.objVideos[objArgs.intVideo]);
        },
        objGet: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase
            .index("strIdent")
            .get(objArgs.objVideo.strIdent);

          objQuery.onsuccess = function () {
            if (objArgs.intNew === undefined) {
              objArgs.intNew = 0;
              objArgs.intExisting = 0;
            }

            funcProgress({
              strProgress:
                "imported " +
                (objArgs.intNew + objArgs.intExisting) +
                " videos - " +
                objArgs.intNew +
                " were new",
            });

            if (objQuery.result === undefined || objQuery.result === null) {
              objArgs.intNew += 1;

              return funcCallback({
                strIdent: objArgs.objVideo.strIdent,
                intTimestamp:
                  objArgs.objVideo.intTimestamp || new Date().getTime(),
                strTitle: objArgs.objVideo.strTitle || "",
                intCount: objArgs.objVideo.intCount || 1,
              });
            } else if (
              objQuery.result !== undefined &&
              objQuery.result !== null
            ) {
              objArgs.intExisting += 1;

              return funcCallback({
                strIdent: objQuery.result.strIdent,
                intTimestamp:
                  Math.max(
                    objQuery.result.intTimestamp,
                    objArgs.objVideo.intTimestamp,
                  ) || new Date().getTime(),
                strTitle:
                  objQuery.result.strTitle || objArgs.objVideo.strTitle || "",
                intCount:
                  Math.max(
                    objQuery.result.intCount,
                    objArgs.objVideo.intCount,
                  ) || 1,
              });
            }
          };
        },
        objPut: function (objArgs, funcCallback) {
          if (objArgs.objGet.strIdent.trim() === "") {
            return funcCallback({});
          } else if (objArgs.objGet.strTitle.trim() === "") {
            return funcCallback({});
          }

          let objQuery = objArgs.objDatabase.put(objArgs.objGet);

          objQuery.onsuccess = function () {
            return funcCallback({});
          };
        },
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
      function (objArgs) {
        if (objArgs === null) {
          funcResponse(null);
        } else if (objArgs !== null) {
          funcResponse({});
        }
      },
    );
  },
};