"use strict";

import {
  funcBrowser,
  funcSendmessage,
  createResponseCallback,
  getStorageSync,
  setStorageSync,
  setDefaultInLocalStorageIfNull,
  Node,
} from "./utils.js";

import { Database } from "./bg-database.js";
import { History } from "./bg-history.js";
import { Youtube } from "./bg-youtube.js";
import { Search } from "./bg-search.js";

let strTitlecache = {};

// ##########################################################

function moduleInitializer(moduleInit) {
  return function (objArgs, funcCallback) {
    moduleInit({}, createResponseCallback(() => { }, funcCallback));
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
          getStorageSync(key) === null ||
          getStorageSync(key).indexOf("do not modify") === -1  // TODO: this condition seems unnecessary as "do not modify" is not found anywhere else in the repo.
        ) {
          setStorageSync(key, defaultValue);
        }
      });

      return funcCallback({});
    },
    objDatabase: moduleInitializer(Database.init),
    objHistory: moduleInitializer(History.init),
    objYoutube: moduleInitializer(Youtube.init),
    objSearch: moduleInitializer(Search.init),
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
          const strMessage = objRequest.strMessage;
          const strIdent = objRequest.strIdent;
          const strTitle = objRequest.strTitle;
          const newObjRequest = {
            strIdent: strIdent,
            strTitle: strTitle,
          };
          const newFuncResponse = function (objResponse) {
            console.debug(strMessage, objRequest, objResponse);

            funcResponse(objResponse);
          }

          const youtubeActions = {
            "youtubeLookup": Youtube.lookup,
            "youtubeEnsure": Youtube.ensure,
          };

          const youtubeAction = youtubeActions[strMessage];

          if (youtubeAction) {
            if (strTitle !== "") {
              strTitlecache[strIdent] = strTitle;
            }
            youtubeAction(newObjRequest, newFuncResponse);
            return true; // indicate asynchronous response
          } else {
            console.error("Unknown message type:", strMessage);
            // return false; // the old code before refactoring didn't return anything here. I'm not sure if this is necessary.
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
          getStorageSync(
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
          getStorageSync(
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
          if (getStorageSync(boolKey) === String(true)) {
            const cssCode = getStorageSync(styleKey);
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
        getStorageSync(
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
                strTitlecache.hasOwn(strIdent) === true
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
            getStorageSync(
              "extensions.Youwatch.Condition.boolBrowhist",
            ) === String(true)
          ) {
            History.synchronize(
              {
                intTimestamp: new Date().getTime() - 7 * 24 * 60 * 60 * 1000,  // TODO: refactor this using const date = new Date(); date.setDate(date.getDate() - 7);
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
            getStorageSync(
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
