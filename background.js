"use strict";

import {
  funcBrowser,
  funcSendmessage,
  setDefaultInLocalStorageIfNull,
  Node,
} from "./utils.js";

import { Database } from "./bg-database.js";
import { History } from "./bg-history.js";
import { Youtube } from "./bg-youtube.js";
import { Search } from "./bg-search.js";

let strTitlecache = {};

// ##########################################################

function initializeModule(moduleInit) {
  return function (objArgs, funcCallback) {
    moduleInit({}, function (objResponse) {
      if (objResponse === null) {
        funcCallback(null);
      } else if (objResponse !== null) {
        funcCallback({});
      }
    });
  };
}

Node.series(
  {
    objSettings: function (objArgs, funcCallback) {
      const categoriesInt = [
        "Database.intSize",
        "History.intTimestamp",
        "Youtube.intTimestamp",
      ];

      categoriesInt.forEach((catKey) => {
        setDefaultInLocalStorageIfNull(
          `extensions.Youwatch.${catKey}`,
          String(0),
        );
      });

      const categoriesBool = [
        "Condition.boolBrownav",
        "Condition.boolBrowhist",
        "Condition.boolYouprog",
        "Condition.boolYoubadge",
        "Condition.boolYouhist",
        "Visualization.boolFadeout",
        "Visualization.boolGrayout",
        "Visualization.boolShowbadge",
        "Visualization.boolShowdate",
        "Visualization.boolHideprogress",
      ];

      categoriesBool.forEach((catKey) => {
        setDefaultInLocalStorageIfNull(
          `extensions.Youwatch.${catKey}`,
          String(true),
        );
      });

      const defaultStylesheets = [
        {
          key: "extensions.Youwatch.Stylesheet.strFadeout",
          defaultValue:
            ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { opacity:0.3; }",
        },
        {
          key: "extensions.Youwatch.Stylesheet.strGrayout",
          defaultValue:
            ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { filter:grayscale(1.0); }",
        },
        {
          key: "extensions.Youwatch.Stylesheet.strShowbadge",
          defaultValue:
            '.youwatch-mark::after { background-color:#000000; border-radius:2px; color:#FFFFFF; content:"WATCHED"; font-size:11px; left:4px; opacity:0.8; padding:3px 4px 3px 4px; position:absolute; top:4px; }',
        },
        {
          key: "extensions.Youwatch.Stylesheet.strShowdate",
          defaultValue:
            '.youwatch-mark::after { content:"WATCHED" attr(watchdate); white-space:nowrap; }',
        },
        {
          key: "extensions.Youwatch.Stylesheet.strHideprogress",
          defaultValue:
            "ytd-thumbnail-overlay-resume-playback-renderer, ytm-thumbnail-overlay-resume-playback-renderer { display:none !important; }",
        },
      ];

      defaultStylesheets.forEach(({ key, defaultValue }) => {
        if (
          window.localStorage.getItem(key) === null ||
          window.localStorage.getItem(key).indexOf("do not modify") === -1
        ) {
          window.localStorage.setItem(key, defaultValue);
        }
      });

      return funcCallback({});
    },
    objDatabase: initializeModule(Database.init),
    objHistory: initializeModule(History.init),
    objYoutube: initializeModule(Youtube.init),
    objSearch: initializeModule(Search.init),
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
            file: 'content/progress-hook.js',
            runAt: "document_start",
          });
        }

        // Inject CSS based on visualization settings
        const visualizationFeatures = ['Fadeout', 'Grayout', 'Showbadge', 'Showdate', 'Hideprogress'];
        visualizationFeatures.forEach(feature => {
          const boolKey = `extensions.Youwatch.Visualization.bool${feature}`;
          const styleKey = `extensions.Youwatch.Stylesheet.str${feature}`;

          // Check if the feature is enabled in localStorage
          if (window.localStorage.getItem(boolKey) === String(true)) {
            const cssCode = window.localStorage.getItem(styleKey);
            // Ensure CSS code exists before trying to inject it
            if (cssCode) {
              chrome.tabs.insertCSS(objTab.id, { code: cssCode }, () => {
                // Optional: Handle potential injection errors
                if (chrome.runtime.lastError) {
                  console.error(`Error injecting CSS for ${feature}:`, chrome.runtime.lastError.message);
                }
              });
            } else {
              console.warn(`CSS code for feature '${feature}' not found in localStorage (key: ${styleKey})`);
            }
          }
        });
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
