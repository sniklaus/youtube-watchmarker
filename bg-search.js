import {
  Node,
  createResponseCallback,
  setStorageSync,
  funcHackyparse,
  bgObject,
} from "./utils.js";
import { Database } from "./bg-database.js";

export const Search = {
  init: function (objRequest, funcResponse) {
    console.log("Search.init called");
    Node.series(
      {
        objMessaging: bgObject.messaging('search', {
          'searchLookup': Search.lookup,
          'searchDelete': Search.delete
        }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  lookup: function (objRequest, funcResponse) {
    Node.series(
      {
        objDatabase: function (objArgs, funcCallback) {
          return funcCallback(
            Database.objDatabase
              .transaction(["storeDatabase"], "readonly")
              .objectStore("storeDatabase"),
          );
        },
        objGet: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase
            .index("intTimestamp")
            .openCursor(null, "prev");

          objQuery.skip = objRequest.intSkip;
          objQuery.results = [];

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback(objQuery.results);
            }

            if (objQuery.results.length === objRequest.intLength) {
              return funcCallback(objQuery.results);
            }

            if (
              objQuery.result.value.strIdent
                .toLowerCase()
                .indexOf(objRequest.strQuery.toLowerCase()) !== -1 ||
              objQuery.result.value.strTitle
                .toLowerCase()
                .indexOf(objRequest.strQuery.toLowerCase()) !== -1
            ) {
              if (objQuery.skip !== 0) {
                objQuery.skip -= 1;
              } else if (objQuery.skip === 0) {
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
    Node.series(
      {
        objDatabase: function (objArgs, funcCallback) {
          return funcCallback(
            Database.objDatabase
              .transaction(["storeDatabase"], "readwrite")
              .objectStore("storeDatabase"),
          );
        },
        objDelete: function (objArgs, funcCallback) {
          funcProgress({
            strProgress: "1/4 - deleting it from the database",
          });

          let objQuery = objArgs.objDatabase.delete(objRequest.strIdent);

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
        objHistory: function (objArgs, funcCallback) {
          funcProgress({
            strProgress: "2/4 - deleting it from the history in the browser",
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
        objYoulookup: function (objArgs, funcCallback) {
          funcProgress({
            strProgress: "3/4 - locating it in the history on youtube",
          });

          if ((objArgs.intRetry = (objArgs.intRetry || 10) - 1) === 0) {
            return funcCallback(null);
          }

          if (objArgs.strContinuation === undefined) {
            objArgs.strContinuation = null;
            objArgs.strClicktrack = null;
            objArgs.objYtcfg = null;
            objArgs.objYtctx = null;
          }

          let objAjax = new XMLHttpRequest();

          objAjax.onload = function () {
            if (objArgs.objYtcfg === null) {
              objArgs.objYtcfg = funcHackyparse(
                objAjax.responseText
                  .split("ytcfg.set(")
                  .find(function (strData) {
                    return strData.indexOf("INNERTUBE_API_KEY") !== -1;
                  })
                  .slice(0, -2),
              );
            }

            if (objArgs.objYtctx === null) {
              objArgs.objYtctx = funcHackyparse(
                objAjax.responseText.split('"INNERTUBE_CONTEXT":')[1],
              );
            }

            let strRegex = null;
            let objContinuation = new RegExp(
              '"continuationCommand":[^"]*"token":[^"]*"([^"]*)"',
              "g",
            );
            let objClicktrack = new RegExp(
              '"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"',
              "g",
            );
            let objVideo = new RegExp(
              '"videoRenderer":[^"]*"videoId":[^"]*"([^"]{11})".*?"topLevelButtons".*?"clickTrackingParams"[^"]*"([^"]*)".*?"feedbackToken"[^"]*"([^"]*)"',
              "g",
            );
            let strUnescaped = objAjax.responseText
              .split('\\"')
              .join("\\u0022")
              .split("\r")
              .join("")
              .split("\n")
              .join("");

            if ((strRegex = objContinuation.exec(strUnescaped)) !== null) {
              objArgs.strContinuation = strRegex[1];
            }

            if ((strRegex = objClicktrack.exec(strUnescaped)) !== null) {
              objArgs.strClicktrack = strRegex[1];
            }

            while ((strRegex = objVideo.exec(strUnescaped)) !== null) {
              let strIdent = strRegex[1];
              let strClicktrack = strRegex[2];
              let strFeedback = strRegex[3];

              if (strIdent !== objRequest.strIdent) {
                continue;
              }

              return funcCallback({
                strIdent: strIdent,
                strClicktrack: strClicktrack,
                strFeedback: strFeedback,
              });
            }

            return funcCallback({}, "objContauth");
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
        objFeedauth: function (objArgs, funcCallback) {
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
        objYoudelete: function (objArgs, funcCallback) {
          funcProgress({
            strProgress: "4/4 - deleting it from the history on youtube",
          });

          let objAjax = new XMLHttpRequest();

          objAjax.onload = function () {
            funcResponse({});
          };

          objAjax.open(
            "POST",
            "https://www.youtube.com/youtubei/v1/feedback?key=" +
            objArgs.objYtcfg["INNERTUBE_API_KEY"],
          );

          objAjax.setRequestHeader(
            "Authorization",
            objArgs.objFeedauth.strAuth,
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
                  clickTrackingParams: objArgs.objYoulookup.strClicktrack,
                },
              },
              feedbackTokens: [objArgs.objYoulookup.strFeedback],
              isFeedbackTokenUnencrypted: false,
              shouldMerge: false,
            }),
          );
        },
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },
};