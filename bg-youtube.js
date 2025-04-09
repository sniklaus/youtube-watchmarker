import {
  Node,
  createResponseCallback,
  setStorageSync,
  funcHackyparse,
  bgObject,
} from "./utils.js";

export const Youtube = {
  init: function (objRequest, funcResponse) {
    console.log("Youtube.init called");
    Node.series(
      {
        objMessaging: bgObject.messaging('youtube', {
          'youtubeSynchronize': Youtube.synchronize,
          'youtubeLookup': Youtube.lookup,
          'youtubeEnsure': Youtube.ensure,
          'youtubeMark': Youtube.mark
        }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  synchronize: function (objRequest, funcResponse, funcProgress) {
    Node.series(
      {
        objCookies: function (objArgs, funcCallback) {
          let strCookies = ["SAPISID", "__Secure-3PAPISID"];
          let objCookies = {};

          let funcCookie = function () {
            if (strCookies.length === 0) {
              return funcCallback(objCookies);
            }

            let strCookie = strCookies.shift();

            chrome.cookies.get(
              {
                url: "https://www.youtube.com",
                name: strCookie,
              },
              function (objCookie) {
                if (objCookie === null) {
                  objCookies[strCookie] = null;
                } else if (objCookie !== null) {
                  objCookies[strCookie] = objCookie.value;
                }

                funcCookie();
              },
            );
          };

          funcCookie();
        },
        objContauth: function (objArgs, funcCallback) {
          let intTime = Math.round(new Date().getTime() / 1000.0);
          let strCookie =
            objArgs.objCookies["SAPISID"] ||
            objArgs.objCookies["__Secure-3PAPISID"];
          let strOrigin = "https://www.youtube.com";

          // https://stackoverflow.com/a/32065323

          crypto.subtle
            .digest(
              "SHA-1",
              new TextEncoder().encode(
                intTime + " " + strCookie + " " + strOrigin,
              ),
            )
            .then(function (strHash) {
              return funcCallback({
                strAuth:
                  "SAPISIDHASH " +
                  intTime +
                  "_" +
                  Array.from(new Uint8Array(strHash))
                    .map(function (intByte) {
                      return intByte.toString(16).padStart(2, "0");
                    })
                    .join(""),
              });
            });
        },

        /**
         * @typedef {Object} VideoArgs
         * @property {string|null} [strContinuation] - YouTube Continuation token
         * @property {string|null} [strClicktrack] - YouTube Click tracking string
         * @property {Object|null} [objYtcfg] - YouTube config object
         * @property {Object|null} [objYtctx] - YouTube context object
         */
        /**
         * Extract video information from YouTube history page
         * @param {VideoArgs} objArgs - Arguments for the XMLHttpRequest request
         * @param {Function} funcCallback - Callback to be invoked after processing
         */
        objVideos: function (objArgs, funcCallback) {
          if (objArgs.strContinuation === undefined) {
            objArgs.strContinuation = null;
            objArgs.strClicktrack = null;
            objArgs.objYtcfg = null;
            objArgs.objYtctx = null;
          }

          let objAjax = new XMLHttpRequest();

          objAjax.onload = function () {
            const responseText = objAjax.responseText // html text
              .replaceAll('\\"', '\\u0022')
              .replaceAll("\r", "")
              .replaceAll("\n", "");

            // extract youtube config
            if (objArgs.objYtcfg === null) {
              objArgs.objYtcfg = funcHackyparse(
                responseText
                  .split("ytcfg.set(")
                  .find(function (strData) {
                    return strData.indexOf("INNERTUBE_API_KEY") !== -1;
                  })
                  .slice(0, -2),
              );
            }

            // extract youtube context
            if (objArgs.objYtctx === null) {
              objArgs.objYtctx = funcHackyparse(
                responseText.split('"INNERTUBE_CONTEXT":')[1],
              );
            }

            // extract continuation token
            let strRegex = null;
            const objContinuation = new RegExp(
              '"continuationCommand":[^"]*"token":[^"]*"([^"]*)"',
              "g",
            );
            if ((strRegex = objContinuation.exec(responseText)) !== null) {
              objArgs.strContinuation = strRegex[1];
            }

            // extract click tracking params
            const objClicktrack = new RegExp(
              '"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"',
              "g",
            );
            if ((strRegex = objClicktrack.exec(responseText)) !== null) {
              objArgs.strClicktrack = strRegex[1];
            }

            // captures videoIds and titles
            let objVideos = [];
            const objVideo = new RegExp(
              '"videoRenderer":[^"]*"videoId":[^"]*"([^"]{11})"' + // videoId
              '.*?"text"[^"]*"([^"]*)"', // title
              "g",
            );
            while ((strRegex = objVideo.exec(responseText)) !== null) {
              let strIdent = strRegex[1];
              let strTitle = strRegex[2];

              // TODO: this part of code might be unnecessary
              // because 1. the old code had a bug where '\u003D' was not
              // replaced with '=' in the title. 2. this code is not seen
              // in Search.delete.objYoulookup. I've fixed it and I'm 
              // keeping it here just in case it is needed.
              const decodeMap = {
                "\\u0022": '"',
                "\\u0026": '&',
                "\\u003C": '<',
                "\\u003D": '=',
                "\\u003E": '>'
              };
              for (const [encoded, decoded] of Object.entries(decodeMap)) {
                strTitle = strTitle.replaceAll(encoded, decoded);
              }
              /////////////////////////////////////////////////////////

              objVideos.push({
                strIdent: strIdent,
                intTimestamp: null,
                strTitle: strTitle,
                intCount: null,
              });
            }

            return funcCallback(objVideos);
          };

          if (
            objArgs.strContinuation === null ||
            objArgs.strClicktrack === null ||
            objArgs.objYtcfg === null ||
            objArgs.objYtctx === null
          ) {
            objAjax.open("GET", "https://www.youtube.com/feed/history");

            objAjax.send();
          } else if (
            objArgs.strContinuation !== null &&
            objArgs.strClicktrack !== null &&
            objArgs.objYtcfg !== null &&
            objArgs.objYtctx !== null
          ) {
            objAjax.open(
              "POST",
              "https://www.youtube.com/youtubei/v1/browse?key=" +
              objArgs.objYtcfg["INNERTUBE_API_KEY"],
            );

            objAjax.setRequestHeader(
              "Authorization",
              objArgs.objContauth.strAuth,
            );
            objAjax.setRequestHeader("Content-Type", "application/json");
            objAjax.setRequestHeader("X-Origin", "https://www.youtube.com");
            objAjax.setRequestHeader("X-Goog-AuthUser", "0");
            objAjax.setRequestHeader(
              "X-Goog-PageId",
              objArgs.objYtcfg["DELEGATED_SESSION_ID"],
            );
            objAjax.setRequestHeader(
              "X-Goog-Visitor-Id",
              objArgs.objYtctx["client"]["visitorData"],
            );

            objArgs.objYtctx["client"]["screenWidthPoints"] = 1024;
            objArgs.objYtctx["client"]["screenHeightPoints"] = 768;
            objArgs.objYtctx["client"]["screenPixelDensity"] = 1;
            objArgs.objYtctx["client"]["utcOffsetMinutes"] = -420;
            objArgs.objYtctx["client"]["userInterfaceTheme"] =
              "USER_INTERFACE_THEME_LIGHT";

            objArgs.objYtctx["request"]["internalExperimentFlags"] = [];
            objArgs.objYtctx["request"]["consistencyTokenJars"] = [];

            objAjax.send(
              JSON.stringify({
                context: {
                  client: objArgs.objYtctx["client"],
                  request: objArgs.objYtctx["request"],
                  user: {},
                  clickTracking: {
                    clickTrackingParams: objArgs.strClicktrack,
                  },
                },
                continuation: objArgs.strContinuation,
              }),
            );
          }

          if (objArgs.strContinuation !== null) {
            objArgs.strContinuation = null;
          }
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
                  objArgs.objVideo.intTimestamp ||
                  objQuery.result.intTimestamp ||
                  new Date().getTime(),
                strTitle:
                  objArgs.objVideo.strTitle || objQuery.result.strTitle || "",
                intCount:
                  objArgs.objVideo.intCount || objQuery.result.intCount || 1,
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
            "extensions.Youwatch.Youtube.intTimestamp",
            String(new Date().getTime()),
          );

          return funcCallback({});
        },
        objContinuation: function (objArgs, funcCallback) {
          if (objArgs.intExisting < objRequest.intThreshold) {
            if (objArgs.strContinuation !== null) {
              return funcCallback({}, "objContauth");
            }
          }

          return funcCallback({});
        },
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  lookup: function (objRequest, funcResponse) {
    Node.series(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: bgObject.database(),
        objGet: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase
            .index("strIdent")
            .get(objArgs.objVideo.strIdent);

          objQuery.onsuccess = function () {
            if (objQuery.result !== undefined && objQuery.result !== null) {
              return funcCallback({
                strIdent: objQuery.result.strIdent,
                intTimestamp:
                  objQuery.result.intTimestamp || new Date().getTime(),
                strTitle: objQuery.result.strTitle || "",
                intCount: objQuery.result.intCount || 1,
              });
            }

            return funcCallback(null);
          };
        },
      },
      createResponseCallback(objArgs => objArgs.objGet, funcResponse),
    );
  },

  ensure: function (objRequest, funcResponse) {
    Node.series(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: bgObject.database(),
        objGet: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase
            .index("strIdent")
            .get(objArgs.objVideo.strIdent);

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback({
                strIdent: objArgs.objVideo.strIdent,
                intTimestamp:
                  objArgs.objVideo.intTimestamp || new Date().getTime(),
                strTitle: objArgs.objVideo.strTitle || "",
                intCount: objArgs.objVideo.intCount || 1,
              });
            }

            return funcCallback(null);
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
      },
      createResponseCallback(objArgs => objArgs.objGet, funcResponse),
    );
  },

  mark: function (objRequest, funcResponse) {
    Node.series(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: bgObject.database(),
        objGet: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase
            .index("strIdent")
            .get(objArgs.objVideo.strIdent);

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
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
              return funcCallback({
                strIdent: objQuery.result.strIdent,
                intTimestamp:
                  objArgs.objVideo.intTimestamp ||
                  objQuery.result.intTimestamp ||
                  new Date().getTime(),
                strTitle:
                  objArgs.objVideo.strTitle || objQuery.result.strTitle || "",
                intCount: objQuery.result.intCount + 1 || 1,
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
      },
      createResponseCallback(objArgs => objArgs.objGet, funcResponse),
    );
  },
};