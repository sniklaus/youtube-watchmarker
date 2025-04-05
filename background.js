"use strict";

import {
  funcBrowser,
  funcSendmessage,
  Node,
} from "./utils.js";

import { Database } from "./bg-database.js";
import { History } from "./bg-history.js";
import { Youtube } from "./bg-youtube.js";
import { Search } from "./bg-search.js";

let strTitlecache = {};

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
