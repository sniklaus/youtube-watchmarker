import {
  Node,
  setStorageSync,
  funcHackyparse
} from "./utils.js";
import { Database } from "./bg-database.js";

export const Youtube = {
  init: function (objRequest, funcResponse) {
    console.log("Youtube.init called");
    Node.series(
      {
        objMessaging: function (objArgs, funcCallback) {
          chrome.runtime.onConnect.addListener(function (objPort) {
            if (objPort.name === "youtube") {
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

                if (strMessage === "youtubeSynchronize") {
                  Youtube.synchronize(objRequest, funcResponse, funcProgress);
                } else if (strMessage === "youtubeLookup") {
                  Youtube.lookup(objRequest, funcResponse);
                } else if (strMessage === "youtubeEnsure") {
                  Youtube.ensure(objRequest, funcResponse);
                } else if (strMessage === "youtubeMark") {
                  Youtube.mark(objRequest, funcResponse);
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
        objVideos: function (objArgs, funcCallback) {
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
              '"videoRenderer":[^"]*"videoId":[^"]*"([^"]{11})".*?"text"[^"]*"([^"]*)"',
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

            let objVideos = [];

            while ((strRegex = objVideo.exec(strUnescaped)) !== null) {
              let strIdent = strRegex[1];
              let strTitle = strRegex[2];

              strTitle = strTitle.split("\\u0022").join('"');
              strTitle = strTitle.split("\\u0026").join("&");
              strTitle = strTitle.split("\\u003C").join("<");
              strTitle = strTitle.split("\\u003C").join("=");
              strTitle = strTitle.split("\\u003E").join(">");
              strTitle = strTitle.split("\\u003E").join(">");

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
      function (objArgs) {
        if (objArgs === null) {
          funcResponse(null);
        } else if (objArgs !== null) {
          funcResponse({});
        }
      },
    );
  },

  lookup: function (objRequest, funcResponse) {
    Node.series(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: function (objArgs, funcCallback) {
          return funcCallback(
            Database.objDatabase
              .transaction(["storeDatabase"], "readonly")
              .objectStore("storeDatabase"),
          );
        },
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
      function (objArgs) {
        if (objArgs === null) {
          funcResponse(null);
        } else if (objArgs !== null) {
          funcResponse(objArgs.objGet);
        }
      },
    );
  },

  ensure: function (objRequest, funcResponse) {
    Node.series(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: function (objArgs, funcCallback) {
          return funcCallback(
            Database.objDatabase
              .transaction(["storeDatabase"], "readwrite")
              .objectStore("storeDatabase"),
          );
        },
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
      function (objArgs) {
        if (objArgs === null) {
          funcResponse(null);
        } else if (objArgs !== null) {
          funcResponse(objArgs.objGet);
        }
      },
    );
  },

  mark: function (objRequest, funcResponse) {
    Node.series(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: function (objArgs, funcCallback) {
          return funcCallback(
            Database.objDatabase
              .transaction(["storeDatabase"], "readwrite")
              .objectStore("storeDatabase"),
          );
        },
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
      function (objArgs) {
        if (objArgs === null) {
          funcResponse(null);
        } else if (objArgs !== null) {
          funcResponse(objArgs.objGet);
        }
      },
    );
  },
};