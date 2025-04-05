"use strict";

import {
  funcBrowser,
  funcHackyparse,
  funcSendmessage,
} from "./utils.js";

let Node = {
  series: function (objFunctions, funcCallback) {
    let strFunctions = Object.keys(objFunctions);

    let objWorkspace = {};

    let funcNext = function (objArgs, objOverwrite) {
      if (objArgs === null) {
        return funcCallback(null);
      }

      objWorkspace[strFunctions[0]] = objArgs;

      strFunctions.shift();

      if (objOverwrite !== undefined) {
        if (typeof objOverwrite === "string") {
          strFunctions = Object.keys(objFunctions);

          while (true) {
            if (strFunctions.length === 0) {
              break;
            } else if (strFunctions[0] === objOverwrite) {
              break;
            }

            strFunctions.shift();
          }
        } else if (typeof objOverwrite === "object") {
          strFunctions = objOverwrite;
        }
      }

      if (strFunctions.length === 0) {
        return funcCallback(objWorkspace);
      }

      objFunctions[strFunctions[0]](objWorkspace, funcNext);
    };

    objFunctions[strFunctions[0]](objWorkspace, funcNext);
  },
};

// ##########################################################

let strTitlecache = {};

// ##########################################################

let Database = {
  objDatabase: null,

  init: function (objRequest, funcResponse) {
    Node.series(
      {
        objOpen: function (objArgs, funcCallback) {
          let objOpen = window.indexedDB.open("Database", 401);

          objOpen.onupgradeneeded = function () {
            let objStore = null;

            if (
              objOpen.result.objectStoreNames.contains("storeDatabase") === true
            ) {
              objStore = objOpen.transaction.objectStore("storeDatabase");
            } else if (
              objOpen.result.objectStoreNames.contains("storeDatabase") ===
              false
            ) {
              objStore = objOpen.result.createObjectStore("storeDatabase", {
                keyPath: "strIdent",
              });
            }

            if (objStore.indexNames.contains("strIdent") === false) {
              objStore.createIndex("strIdent", "strIdent", {
                unique: true,
              });
            }

            if (objStore.indexNames.contains("intTimestamp") === false) {
              objStore.createIndex("intTimestamp", "intTimestamp", {
                unique: false,
              });
            }

            if (objStore.indexNames.contains("longTimestamp") === true) {
              objStore.deleteIndex("longTimestamp"); // legacy
            }
          };

          objOpen.onerror = function () {
            Database.objDatabase = null;

            return funcCallback(null);
          };

          objOpen.onsuccess = function () {
            Database.objDatabase = objOpen.result;

            return funcCallback({});
          };
        },
        objLegacy: function (objArgs, funcCallback) {
          let objStore = Database.objDatabase
            .transaction(["storeDatabase"], "readwrite")
            .objectStore("storeDatabase");

          let objQuery = objStore.openCursor();

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback({});
            }

            if (objQuery.result.value.intTimestamp === undefined) {
              objStore.put({
                strIdent: objQuery.result.value.strIdent,
                intTimestamp: objQuery.result.value.longTimestamp,
                strTitle: objQuery.result.value.strTitle,
                intCount: objQuery.result.value.intCount,
              });
            }

            objQuery.result.continue();
          };
        },
        objMessaging: function (objArgs, funcCallback) {
          chrome.runtime.onConnect.addListener(function (objPort) {
            if (objPort.name === "database") {
              objPort.onMessage.addListener(function (objData) {
                if (objData.strMessage === "databaseExport") {
                  Database.export(
                    objData.objRequest,
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "databaseExport",
                        objResponse: objResponse,
                      });
                    },
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "databaseExport-progress",
                        objResponse: objResponse,
                      });
                    },
                  );
                } else if (objData.strMessage === "databaseImport") {
                  Database.import(
                    objData.objRequest,
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "databaseImport",
                        objResponse: objResponse,
                      });
                    },
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "databaseImport-progress",
                        objResponse: objResponse,
                      });
                    },
                  );
                } else if (objData.strMessage === "databaseReset") {
                  Database.reset(objData.objRequest, function (objResponse) {
                    objPort.postMessage({
                      strMessage: "databaseReset",
                      objResponse: objResponse,
                    });
                  });
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

  export: function (objRequest, funcResponse, funcProgress) {
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
          let objQuery = objArgs.objDatabase.openCursor();

          objQuery.results = [];

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback(objQuery.results);
            }

            funcProgress({
              strProgress: "collected " + objQuery.results.length + " videos",
            });

            objQuery.results.push({
              strIdent: objQuery.result.value.strIdent,
              intTimestamp: objQuery.result.value.intTimestamp,
              strTitle: objQuery.result.value.strTitle,
              intCount: objQuery.result.value.intCount,
            });

            objQuery.result.continue();
          };
        },
        objDownload: function (objArgs, funcCallback) {
          chrome.downloads.download({
            url: URL.createObjectURL(
              new Blob(
                [
                  btoa(
                    unescape(
                      encodeURIComponent(JSON.stringify(objArgs.objGet)),
                    ),
                  ),
                ],
                {
                  type: "application/octet-stream",
                },
              ),
            ),
            filename:
              new Date().getFullYear() +
              "." +
              ("0" + (new Date().getMonth() + 1)).slice(-2) +
              "." +
              ("0" + new Date().getDate()).slice(-2) +
              ".database",
            saveAs: true,
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

  import: function (objRequest, funcResponse, funcProgress) {
    Node.series(
      {
        objVideos: function (objArgs, funcCallback) {
          return funcCallback(objRequest.objVideos);
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

            if (objArgs.objVideo.intTimestamp === undefined) {
              objArgs.objVideo.intTimestamp = objArgs.objVideo.longTimestamp; // legacy
            }

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
            window.localStorage.setItem(
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
          funcResponse({});
        }
      },
    );
  },

  reset: function (objRequest, funcResponse) {
    Node.series(
      {
        objDatabase: function (objArgs, funcCallback) {
          return funcCallback(
            Database.objDatabase
              .transaction(["storeDatabase"], "readwrite")
              .objectStore("storeDatabase"),
          );
        },
        objClear: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase.clear();

          objQuery.onsuccess = function () {
            return funcCallback({});
          };
        },
        objCount: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase.count();

          objQuery.onsuccess = function () {
            window.localStorage.setItem(
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
          funcResponse({});
        }
      },
    );
  },
};

let History = {
  init: function (objRequest, funcResponse) {
    Node.series(
      {
        objMessaging: function (objArgs, funcCallback) {
          chrome.runtime.onConnect.addListener(function (objPort) {
            if (objPort.name === "history") {
              objPort.onMessage.addListener(function (objData) {
                if (objData.strMessage === "historySynchronize") {
                  History.synchronize(
                    objData.objRequest,
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "historySynchronize",
                        objResponse: objResponse,
                      });
                    },
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "historySynchronize-progress",
                        objResponse: objResponse,
                      });
                    },
                  );
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
            window.localStorage.setItem(
              "extensions.Youwatch.Database.intSize",
              String(objQuery.result),
            );

            return funcCallback({});
          };
        },
        objTime: function (objArgs, funcCallback) {
          window.localStorage.setItem(
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

let Youtube = {
  init: function (objRequest, funcResponse) {
    Node.series(
      {
        objMessaging: function (objArgs, funcCallback) {
          chrome.runtime.onConnect.addListener(function (objPort) {
            if (objPort.name === "youtube") {
              objPort.onMessage.addListener(function (objData) {
                if (objData.strMessage === "youtubeSynchronize") {
                  Youtube.synchronize(
                    objData.objRequest,
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "youtubeSynchronize",
                        objResponse: objResponse,
                      });
                    },
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "youtubeSynchronize-progress",
                        objResponse: objResponse,
                      });
                    },
                  );
                } else if (objData.strMessage === "youtubeLookup") {
                  Youtube.lookup(objData.objRequest, function (objResponse) {
                    objPort.postMessage({
                      strMessage: "youtubeLookup",
                      objResponse: objResponse,
                    });
                  });
                } else if (objData.strMessage === "youtubeEnsure") {
                  Youtube.ensure(objData.objRequest, function (objResponse) {
                    objPort.postMessage({
                      strMessage: "youtubeEnsure",
                      objResponse: objResponse,
                    });
                  });
                } else if (objData.strMessage === "youtubeMark") {
                  Youtube.mark(objData.objRequest, function (objResponse) {
                    objPort.postMessage({
                      strMessage: "youtubeMark",
                      objResponse: objResponse,
                    });
                  });
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
            window.localStorage.setItem(
              "extensions.Youwatch.Database.intSize",
              String(objQuery.result),
            );

            return funcCallback({});
          };
        },
        objTime: function (objArgs, funcCallback) {
          window.localStorage.setItem(
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
            window.localStorage.setItem(
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
            window.localStorage.setItem(
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

let Search = {
  init: function (objRequest, funcResponse) {
    Node.series(
      {
        objMessaging: function (objArgs, funcCallback) {
          chrome.runtime.onConnect.addListener(function (objPort) {
            if (objPort.name === "search") {
              objPort.onMessage.addListener(function (objData) {
                if (objData.strMessage === "searchLookup") {
                  Search.lookup(objData.objRequest, function (objResponse) {
                    objPort.postMessage({
                      strMessage: "searchLookup",
                      objResponse: objResponse,
                    });
                  });
                } else if (objData.strMessage === "searchDelete") {
                  Search.delete(
                    objData.objRequest,
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "searchDelete",
                        objResponse: objResponse,
                      });
                    },
                    function (objResponse) {
                      objPort.postMessage({
                        strMessage: "searchDelete-progress",
                        objResponse: objResponse,
                      });
                    },
                  );
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
      function (objArgs) {
        if (objArgs === null) {
          funcResponse(null);
        } else if (objArgs !== null) {
          funcResponse({
            objVideos: objArgs.objGet,
          });
        }
      },
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
            window.localStorage.setItem(
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

// ##########################################################

Node.series(
  {
    objSettings: function (objArgs, funcCallback) {
      if (
        window.localStorage.getItem("extensions.Youwatch.Database.intSize") ===
        null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Database.intSize",
          String(0),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.History.intTimestamp",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.History.intTimestamp",
          String(0),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Youtube.intTimestamp",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Youtube.intTimestamp",
          String(0),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Condition.boolBrownav",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Condition.boolBrownav",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Condition.boolBrowhist",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Condition.boolBrowhist",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Condition.boolYouprog",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Condition.boolYouprog",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Condition.boolYoubadge",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Condition.boolYoubadge",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Condition.boolYouhist",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Condition.boolYouhist",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Visualization.boolFadeout",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Visualization.boolFadeout",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Visualization.boolGrayout",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Visualization.boolGrayout",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Visualization.boolShowbadge",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Visualization.boolShowbadge",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Visualization.boolShowdate",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Visualization.boolShowdate",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Visualization.boolHideprogress",
        ) === null
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Visualization.boolHideprogress",
          String(true),
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Stylesheet.strFadeout",
        ) === null ||
        window.localStorage
          .getItem("extensions.Youwatch.Stylesheet.strFadeout")
          .indexOf("do not modify") === -1
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Stylesheet.strFadeout",
          ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { opacity:0.3; }",
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Stylesheet.strGrayout",
        ) === null ||
        window.localStorage
          .getItem("extensions.Youwatch.Stylesheet.strGrayout")
          .indexOf("do not modify") === -1
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Stylesheet.strGrayout",
          ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { filter:grayscale(1.0); }",
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Stylesheet.strShowbadge",
        ) === null ||
        window.localStorage
          .getItem("extensions.Youwatch.Stylesheet.strShowbadge")
          .indexOf("do not modify") === -1
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Stylesheet.strShowbadge",
          '.youwatch-mark::after { background-color:#000000; border-radius:2px; color:#FFFFFF; content:"WATCHED"; font-size:11px; left:4px; opacity:0.8; padding:3px 4px 3px 4px; position:absolute; top:4px; }',
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Stylesheet.strShowdate",
        ) === null ||
        window.localStorage
          .getItem("extensions.Youwatch.Stylesheet.strShowdate")
          .indexOf("do not modify") === -1
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Stylesheet.strShowdate",
          '.youwatch-mark::after { content:"WATCHED" attr(watchdate); white-space:nowrap; }',
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Stylesheet.strHideprogress",
        ) === null ||
        window.localStorage
          .getItem("extensions.Youwatch.Stylesheet.strHideprogress")
          .indexOf("do not modify") === -1
      ) {
        window.localStorage.setItem(
          "extensions.Youwatch.Stylesheet.strHideprogress",
          "ytd-thumbnail-overlay-resume-playback-renderer, ytm-thumbnail-overlay-resume-playback-renderer { display:none !important; }",
        );
      }

      return funcCallback({});
    },
    objDatabase: function (objArgs, funcCallback) {
      Database.init({}, function (objResponse) {
        if (objResponse === null) {
          funcCallback(null);
        } else if (objResponse !== null) {
          funcCallback({});
        }
      });
    },
    objHistory: function (objArgs, funcCallback) {
      History.init({}, function (objResponse) {
        if (objResponse === null) {
          funcCallback(null);
        } else if (objResponse !== null) {
          funcCallback({});
        }
      });
    },
    objYoutube: function (objArgs, funcCallback) {
      Youtube.init({}, function (objResponse) {
        if (objResponse === null) {
          funcCallback(null);
        } else if (objResponse !== null) {
          funcCallback({});
        }
      });
    },
    objSearch: function (objArgs, funcCallback) {
      Search.init({}, function (objResponse) {
        if (objResponse === null) {
          funcCallback(null);
        } else if (objResponse !== null) {
          funcCallback({});
        }
      });
    },
    objAction: function (objArgs, funcCallback) {
      chrome.browserAction.onClicked.addListener(function () {
        chrome.tabs.create({
          url: "content/index.html",
        });
      });

      return funcCallback({});
    },
    objMessage: function (objArgs, funcCallback) {
      chrome.runtime.onMessage.addListener(
        function (objRequest, objSender, funcResponse) {
          if (objRequest.strMessage === "youtubeLookup") {
            if (objRequest.strTitle !== "") {
              strTitlecache[objRequest.strIdent] = objRequest.strTitle;
            }

            Youtube.lookup(
              {
                strIdent: objRequest.strIdent,
                strTitle: objRequest.strTitle,
              },
              function (objResponse) {
                console.debug("lookup video", objRequest, objResponse);

                funcResponse(objResponse);
              },
            );

            return true; // indicate asynchronous response
          } else if (objRequest.strMessage === "youtubeEnsure") {
            if (objRequest.strTitle !== "") {
              strTitlecache[objRequest.strIdent] = objRequest.strTitle;
            }

            Youtube.ensure(
              {
                strIdent: objRequest.strIdent,
                strTitle: objRequest.strTitle,
              },
              function (objResponse) {
                console.debug("ensure video", objRequest, objResponse);

                funcResponse(objResponse);
              },
            );

            return true; // indicate asynchronous response
          }

          funcResponse(null);
        },
      );

      return funcCallback({});
    },
    objTabhook: function (objArgs, funcCallback) {
      chrome.tabs.onUpdated.addListener(function (intTab, objChange, objTab) {
        if (objTab.id < 0) {
          return;
        } else if (
          objTab.url.indexOf("https://www.youtube.com") !== 0 &&
          objTab.url.indexOf("https://m.youtube.com") !== 0
        ) {
          return;
        }

        if (
          window.localStorage.getItem(
            "extensions.Youwatch.Condition.boolBrownav",
          ) === String(true)
        ) {
          if (
            objTab.url.indexOf("https://www.youtube.com/watch?v=") === 0 ||
            objTab.url.indexOf("https://www.youtube.com/shorts/") === 0 ||
            objTab.url.indexOf("https://m.youtube.com/watch?v=") === 0
          ) {
            if (objChange.title !== undefined && objChange.title !== null) {
              if (objChange.title.slice(-10) === " - YouTube") {
                objChange.title = objChange.title.slice(0, -10);
              }

              let strIdent = objTab.url.split("&")[0].slice(-11);
              let strTitle = objChange.title;

              Youtube.mark(
                {
                  strIdent: strIdent,
                  strTitle: strTitle,
                },
                function (objResponse) {
                  console.debug("mark video");
                },
              );

              chrome.tabs.query(
                {
                  url: "*://*.youtube.com/*",
                },
                function (objTabs) {
                  for (let objTab of objTabs) {
                    funcSendmessage(objTab.id, {
                      strMessage: "youtubeMark",
                      strIdent: strIdent,
                      intTimestamp: 0,
                      strTitle: strTitle,
                      intCount: 0,
                    });
                  }
                },
              );
            }
          }
        }

        if (
          window.localStorage.getItem(
            "extensions.Youwatch.Condition.boolYoubadge",
          ) === String(true)
        ) {
          chrome.tabs.executeScript(objTab.id, {
            code: `
                        if ((document.head !== null) && (document.getElementById('youwatch-progresshook') === null)) {
                            let objScript = document.createElement('script');

                            objScript.id = 'youwatch-progresshook';

                            objScript.text = \`
                                let funcParsejson = function(strJson) {
                                    let intLength = 1;

                                    for (let intCount = 0; intLength < strJson.length; intLength += 1) {
                                        if (strJson[intLength - 1] === '{') {
                                            intCount += 1;

                                        } else if (strJson[intLength - 1] === '}') {
                                            intCount -= 1;

                                        }

                                        if (intCount === 0) {
                                            break;
                                        }
                                    }

                                    try {
                                        return JSON.parse(strJson.substr(0, intLength));
                                    } catch (objError) {
                                        // ...
                                    }

                                    return null;
                                };

                                let funcHackyparse = function(strResponse) {
                                    for (let strVideo of strResponse.split('{"videoRenderer":{"videoId":"').slice(1)) { // desktop
                                        let objVideo = funcParsejson('{"videoRenderer":{"videoId":"' + strVideo);

                                        if (objVideo === null) {
                                            continue;

                                        } else if (JSON.stringify(objVideo).indexOf('"percentDurationWatched"') === -1) {
                                            continue;

                                        }

                                        let strIdent = objVideo['videoRenderer']['videoId'];
                                        let strTitle = null;

                                        if (strTitle === null) {
                                            try {
                                                strTitle = objVideo['videoRenderer']['title']['runs'][0]['text'];
                                            } catch (objError) {
                                                // ...
                                            }
                                        }

                                        if (strTitle === null) {
                                            try {
                                                strTitle = objVideo['videoRenderer']['title']['simpleText'];
                                            } catch (objError) {
                                                // ...
                                            }
                                        }

                                        if (strIdent.length !== 11) {
                                            continue;

                                        } else if (strTitle === null) {
                                            continue;

                                        }

                                        document.dispatchEvent(new CustomEvent('youwatch-progresshook', {
                                            'detail': {
                                                'strIdent': strIdent,
                                                'strTitle': strTitle
                                            }
                                        }));
                                    }

                                    for (let strVideo of strResponse.split('{"videoWithContextRenderer":{"headline":{"runs":[{"text":"').slice(1)) { // mobile
                                        let objVideo = funcParsejson('{"videoWithContextRenderer":{"headline":{"runs":[{"text":"' + strVideo);

                                        if (objVideo === null) {
                                            continue;

                                        } else if (JSON.stringify(objVideo).indexOf('"percentDurationWatched"') === -1) {
                                            continue;

                                        }

                                        let strIdent = objVideo['videoWithContextRenderer']['videoId'];
                                        let strTitle = null;

                                        if (strTitle === null) {
                                            try {
                                                strTitle = objVideo['videoWithContextRenderer']['headline']['runs'][0]['text'];
                                            } catch (objError) {
                                                // ...
                                            }
                                        }

                                        if (strTitle === null) {
                                            try {
                                                strTitle = objVideo['videoWithContextRenderer']['headline']['simpleText'];
                                            } catch (objError) {
                                                // ...
                                            }
                                        }

                                        if (strIdent.length !== 11) {
                                            continue;

                                        } else if (strTitle === null) {
                                            continue;

                                        }

                                        document.dispatchEvent(new CustomEvent('youwatch-progresshook', {
                                            'detail': {
                                                'strIdent': strIdent,
                                                'strTitle': strTitle
                                            }
                                        }));
                                    }
                                };

                                let objOrigxmlreq = window.XMLHttpRequest.prototype.open;
                                let objOrigfetchreq = window.fetch;

                                window.addEventListener('DOMContentLoaded', function() {
                                    funcHackyparse(document.body.innerHTML.split('var ytInitialData = ').slice(-1)[0].split(';</script>')[0].replace(new RegExp(String.fromCharCode(92) + String.fromCharCode(92) + 'x([0-9a-f][0-9a-f])', 'g'), function(objMatch) {
                                        return String.fromCharCode(parseInt(objMatch.substr(2), 16))
                                    }));
                                });

                                window.XMLHttpRequest.prototype.open = function() {
                                    this.addEventListener('load', function() {
                                        let strLink = this.responseURL;

                                        if ((strLink.indexOf('https://www.youtube.com/youtubei/v1/') === -1) && (strLink.indexOf('https://m.youtube.com/youtubei/v1/') === -1)) {
                                            return;
                                        }

                                        funcHackyparse(this.responseText);
                                    });

                                    return objOrigxmlreq.apply(this, arguments);
                                };

                                window.fetch = async function(objRequest, objOptions) {
                                    let objResponse = await objOrigfetchreq(objRequest, objOptions);

                                    let strLink = typeof(objRequest) === 'string' ? objRequest : objRequest.url;

                                    if ((strLink.indexOf('https://www.youtube.com/youtubei/v1/') === -1) && (strLink.indexOf('https://m.youtube.com/youtubei/v1/') === -1)) {
                                        return objResponse;
                                    }

                                    let strResponse = await objResponse.text();

                                    funcHackyparse(strResponse);

                                    return new Response(strResponse, {
                                        'status': objResponse.status,
                                        'statusText': objResponse.statusText,
                                        'headers': objResponse.headers
                                    });
                                };
                            \`;

                            document.addEventListener('youwatch-progresshook', function(objEvent) {
                                chrome.runtime.sendMessage({
                                    'strMessage': 'youtubeEnsure',
                                    'strIdent': objEvent.detail['strIdent'],
                                    'strTitle': objEvent.detail['strTitle']
                                }, function(objResponse) {
                                    // ...
                                });
                            });

                            document.head.prepend(objScript);
                        }
                    `,
            runAt: "document_start",
          });
        }

        if (
          window.localStorage.getItem(
            "extensions.Youwatch.Visualization.boolFadeout",
          ) === String(true)
        ) {
          chrome.tabs.insertCSS(objTab.id, {
            code: window.localStorage.getItem(
              "extensions.Youwatch.Stylesheet.strFadeout",
            ),
          });
        }

        if (
          window.localStorage.getItem(
            "extensions.Youwatch.Visualization.boolGrayout",
          ) === String(true)
        ) {
          chrome.tabs.insertCSS(objTab.id, {
            code: window.localStorage.getItem(
              "extensions.Youwatch.Stylesheet.strGrayout",
            ),
          });
        }

        if (
          window.localStorage.getItem(
            "extensions.Youwatch.Visualization.boolShowbadge",
          ) === String(true)
        ) {
          chrome.tabs.insertCSS(objTab.id, {
            code: window.localStorage.getItem(
              "extensions.Youwatch.Stylesheet.strShowbadge",
            ),
          });
        }

        if (
          window.localStorage.getItem(
            "extensions.Youwatch.Visualization.boolShowdate",
          ) === String(true)
        ) {
          chrome.tabs.insertCSS(objTab.id, {
            code: window.localStorage.getItem(
              "extensions.Youwatch.Stylesheet.strShowdate",
            ),
          });
        }

        if (
          window.localStorage.getItem(
            "extensions.Youwatch.Visualization.boolHideprogress",
          ) === String(true)
        ) {
          chrome.tabs.insertCSS(objTab.id, {
            code: window.localStorage.getItem(
              "extensions.Youwatch.Stylesheet.strHideprogress",
            ),
          });
        }
      });

      return funcCallback({});
    },
    objReqhook: function (objArgs, funcCallback) {
      {
        let strInfospec = ["requestHeaders", "blocking"];

        if (funcBrowser() === "chrome") {
          strInfospec.push("extraHeaders");
        }

        chrome.webRequest.onBeforeSendHeaders.addListener(
          function (objData) {
            let objHeaders = [];

            for (let objHeader of objData.requestHeaders) {
              if (objHeader.name === "Referer") {
                continue;
              } else if (objHeader.name === "Origin") {
                continue;
              }

              objHeaders.push(objHeader);
            }

            objHeaders.push({
              name: "Referer",
              value: "https://www.youtube.com/feed/history",
            });

            objHeaders.push({
              name: "Origin",
              value: "https://www.youtube.com",
            });

            objData.requestHeaders.splice(0);
            objData.requestHeaders.push(...objHeaders);

            return {
              requestHeaders: objData.requestHeaders,
            };
          },
          {
            urls: ["https://www.youtube.com/youtubei/v1/*"],
          },
          strInfospec,
        );
      }

      if (
        window.localStorage.getItem(
          "extensions.Youwatch.Condition.boolYouprog",
        ) === String(true)
      ) {
        chrome.webRequest.onSendHeaders.addListener(
          function (objData) {
            if (objData.url.indexOf("muted=1") !== -1) {
              return;
            }

            for (let strElapsed of objData.url
              .split("&et=")[1]
              .split("&")[0]
              .split(",")) {
              if (parseFloat(strElapsed) < 3.0) {
                continue;
              }

              let strIdent = objData.url.split("&docid=")[1].split("&")[0];
              let strTitle =
                strTitlecache.hasOwnProperty(strIdent) === true
                  ? strTitlecache[strIdent]
                  : "";

              if (strIdent.length !== 11) {
                continue;
              } else if (strTitle === "") {
                continue;
              }

              Youtube.ensure(
                {
                  strIdent: strIdent,
                  strTitle: strTitle,
                },
                function (objResponse) {
                  console.debug("ensure video");
                },
              );

              chrome.tabs.query(
                {
                  url: "*://*.youtube.com/*",
                },
                function (objTabs) {
                  for (let objTab of objTabs) {
                    funcSendmessage(objTab.id, {
                      strMessage: "youtubeMark",
                      strIdent: strIdent,
                      intTimestamp: 0,
                      strTitle: strTitle,
                      intCount: 0,
                    });
                  }
                },
              );
            }
          },
          {
            urls: ["https://www.youtube.com/api/stats/watchtime*"],
          },
        );
      }

      return funcCallback({});
    },
    objSynchronize: function (objArgs, funcCallback) {
      chrome.alarms.create("synchronize", {
        periodInMinutes: 60,
      });

      chrome.alarms.onAlarm.addListener(function (objAlarm) {
        if (objAlarm.name === "synchronize") {
          if (
            window.localStorage.getItem(
              "extensions.Youwatch.Condition.boolBrowhist",
            ) === String(true)
          ) {
            History.synchronize(
              {
                intTimestamp: new Date().getTime() - 7 * 24 * 60 * 60 * 1000,
              },
              function (objResponse) {
                console.debug("synchronized history");
              },
              function (objResponse) {
                // ...
              },
            );
          }

          if (
            window.localStorage.getItem(
              "extensions.Youwatch.Condition.boolYouhist",
            ) === String(true)
          ) {
            Youtube.synchronize(
              {
                intThreshold: 512,
              },
              function (objResponse) {
                console.debug("synchronized youtube");
              },
              function (objResponse) {
                // ...
              },
            );
          }
        }
      });

      return funcCallback({});
    },
  },
  function (objArgs) {
    if (objArgs === null) {
      console.debug("error initializing commons");
    } else if (objArgs !== null) {
      console.debug("initialized commons succesfully");
    }
  },
);
