import {
  createResponseCallback,
  parseIncompleteJson,
  BackgroundUtils,
  AsyncSeries
} from "./utils.js";
import { DatabaseUtils } from "./database-utils.js";
import { STORAGE_KEYS, TIMEOUTS, DATABASE } from "./constants.js";

export const Youtube = {
  init: function (objRequest, funcResponse) {
    AsyncSeries.run(
      {
        objMessaging: BackgroundUtils.messaging('youtube', {
          'youtube-synchronize': Youtube.synchronize,
          'youtube-synchronize-liked': Youtube.synchronizeLikedVideos,
          'youtube-lookup': Youtube.lookup,
          'youtube-ensure': Youtube.ensure,
          'youtube-mark': Youtube.mark
        }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  synchronize: function (objRequest, funcResponse, funcProgress) {
    AsyncSeries.run(
      {
        objCookies: BackgroundUtils.cookies(),
        objContauth: BackgroundUtils.contauth(),

        /**
         * @typedef {Object} VideoArgs
         * @property {string|null} [strContinuation] - YouTube Continuation token
         * @property {string|null} [strClicktrack] - YouTube Click tracking string
         * @property {Object|null} [objYtcfg] - YouTube config object
         * @property {Object|null} [objYtctx] - YouTube context object
         */
        /**
         * Extract video information from YouTube history page
         * @param {VideoArgs} objArgs - Arguments for the fetch request
         * @param {Function} funcCallback - Callback to be invoked after processing
         */
        objVideos: async function (objArgs, funcCallback) {
          if (objArgs.strContinuation === undefined) {
            objArgs.strContinuation = null;
            objArgs.strClicktrack = null;
            objArgs.objYtcfg = null;
            objArgs.objYtctx = null;
          }

          try {
            let response;
            
            if (
              objArgs.strContinuation === null ||
              objArgs.strClicktrack === null ||
              objArgs.objYtcfg === null ||
              objArgs.objYtctx === null
            ) {
              // Initial request to get YouTube history page
              response = await fetch("https://www.youtube.com/feed/history");
            } else if (
              objArgs.strContinuation !== null &&
              objArgs.strClicktrack !== null &&
              objArgs.objYtcfg !== null &&
              objArgs.objYtctx !== null
            ) {
              // Subsequent request with continuation token
              objArgs.objYtctx["client"]["screenWidthPoints"] = 1024;
              objArgs.objYtctx["client"]["screenHeightPoints"] = 768;
              objArgs.objYtctx["client"]["screenPixelDensity"] = 1;
              objArgs.objYtctx["client"]["utcOffsetMinutes"] = -420;
              objArgs.objYtctx["client"]["userInterfaceTheme"] =
                "USER_INTERFACE_THEME_LIGHT";

              objArgs.objYtctx["request"]["internalExperimentFlags"] = [];
              objArgs.objYtctx["request"]["consistencyTokenJars"] = [];

              response = await fetch(
                "https://www.youtube.com/youtubei/v1/browse?key=" +
                objArgs.objYtcfg["INNERTUBE_API_KEY"],
                {
                  method: "POST",
                  headers: {
                    "Authorization": objArgs.objContauth.strAuth,
                    "Content-Type": "application/json",
                    "X-Origin": "https://www.youtube.com",
                    "X-Goog-AuthUser": "0",
                    "X-Goog-PageId": objArgs.objYtcfg["DELEGATED_SESSION_ID"],
                    "X-Goog-Visitor-Id": objArgs.objYtctx["client"]["visitorData"],
                  },
                  body: JSON.stringify({
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
                }
              );
            }

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();
            const cleanedText = responseText
              .replaceAll('\\"', '\\u0022')
              .replaceAll("\r", "")
              .replaceAll("\n", "");

            // extract youtube config
            if (objArgs.objYtcfg === null) {
              objArgs.objYtcfg = parseIncompleteJson(
                cleanedText
                  .split("ytcfg.set(")
                  .find(function (strData) {
                    return strData.indexOf("INNERTUBE_API_KEY") !== -1;
                  })
                  .slice(0, -2),
              );
            }

            // extract youtube context
            if (objArgs.objYtctx === null) {
              objArgs.objYtctx = parseIncompleteJson(
                cleanedText.split('"INNERTUBE_CONTEXT":')[1],
              );
            }

            // extract continuation token
            let strRegex = null;
            const objContinuation = new RegExp(
              '"continuationCommand":[^"]*"token":[^"]*"([^"]*)"',
              "g",
            );
            if ((strRegex = objContinuation.exec(cleanedText)) !== null) {
              objArgs.strContinuation = strRegex[1];
            }

            // extract click tracking params
            const objClicktrack = new RegExp(
              '"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"',
              "g",
            );
            if ((strRegex = objClicktrack.exec(cleanedText)) !== null) {
              objArgs.strClicktrack = strRegex[1];
            }

            // Use a completely different approach - extract and parse JSON data structures
            let objVideos = [];
            
            try {
              // Helper function to decode HTML entities
              const decodeHtmlEntities = (text) => {
              const decodeMap = {
                "\\u0022": '"',
                "\\u0026": '&',
                "\\u003C": '<',
                "\\u003D": '=',
                  "\\u003E": '>',
                  "\\u0027": "'",
                  "\\u003A": ':',
                  "\\u002F": '/',
                  "\\u003B": ';',
                  "\\u003F": '?',
                  "\\u0040": '@',
                  "\\u005B": '[',
                  "\\u005D": ']',
                  "\\u007B": '{',
                  "\\u007D": '}',
                  "\\u005C": '\\',
                  "\\u007C": '|',
                  "\\u0060": '`',
                  "\\u007E": '~',
                  "\\u0021": '!',
                  "\\u0023": '#',
                  "\\u0024": '$',
                  "\\u0025": '%',
                  "\\u005E": '^',
                  "\\u002A": '*',
                  "\\u0028": '(',
                  "\\u0029": ')',
                  "\\u002B": '+',
                  "\\u002D": '-',
                  "\\u002E": '.',
                  "\\u002C": ',',
                  "\\u0020": ' '
                };
                
                let decoded = text;
                for (const [encoded, decodedChar] of Object.entries(decodeMap)) {
                  decoded = decoded.replaceAll(encoded, decodedChar);
                }
                return decoded;
              };
              
              // Helper function to safely extract nested property
              const getNestedProperty = (obj, path) => {
                return path.split('.').reduce((current, key) => {
                  return current && current[key] !== undefined ? current[key] : null;
                }, obj);
              };
              
              // Helper function to find video title from various locations
              const extractVideoTitle = (videoRenderer) => {
                // Try multiple possible title locations
                const titlePaths = [
                  'title.runs.0.text',
                  'title.simpleText',
                  'title.text',
                  'headline.runs.0.text',
                  'headline.simpleText',
                  'longBylineText.runs.0.text',
                  'shortBylineText.runs.0.text',
                  'accessibility.accessibilityData.label'
                ];
                
                for (const path of titlePaths) {
                  const title = getNestedProperty(videoRenderer, path);
                  if (title && typeof title === 'string' && title.trim()) {
                    let cleanTitle = title.trim();
                    // Clean up accessibility labels
                    cleanTitle = cleanTitle.replace(/\s+by\s+[^,]*$/i, '').trim();
                    cleanTitle = cleanTitle.replace(/\s*-\s*YouTube\s*$/i, '').trim();
                    return cleanTitle;
                  }
                }
                
                return null;
              };
              
                             // Try to find and parse the main data structure
               const dataRegex = /var\s+ytInitialData\s*=\s*({.+?});/s;
               const dataMatch = responseText.match(dataRegex);
               
                              if (dataMatch) {
                 try {
                   const ytInitialData = JSON.parse(dataMatch[1]);
                   
                   // Navigate through the YouTube data structure
                   const contents = getNestedProperty(ytInitialData, 'contents.twoColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents');
                   
                   if (contents && Array.isArray(contents)) {
                     for (const section of contents) {
                       const items = getNestedProperty(section, 'itemSectionRenderer.contents');
                                                if (items && Array.isArray(items)) {
                           for (const item of items) {
                                                      const videoRenderer = item.videoRenderer;
                           if (videoRenderer && videoRenderer.videoId) {
                             const videoId = videoRenderer.videoId;
                             const title = extractVideoTitle(videoRenderer);
                             
                             if (videoId && videoId.length === 11 && title) {
                               objVideos.push({
                                 strIdent: videoId,
                                 intTimestamp: null,
                                 strTitle: decodeHtmlEntities(title),
                                 intCount: null,
                               });
                             }
                           }
                        }
                      }
                    }
                  }
                                 } catch (jsonError) {
                   console.warn("Failed to parse ytInitialData, falling back to regex:", jsonError);
                 }
               }
               
               // Fallback: Use more comprehensive regex if JSON parsing failed
               if (objVideos.length === 0) {
                
                // Find all videoRenderer objects and extract data
                const videoRendererRegex = /"videoRenderer":\s*({[^}]*"videoId"[^}]*})/g;
                let rendererMatch;
                
                while ((rendererMatch = videoRendererRegex.exec(cleanedText)) !== null) {
                  try {
                    const rendererStr = rendererMatch[1];
                    
                    // Extract video ID
                    const videoIdMatch = rendererStr.match(/"videoId":\s*"([^"]{11})"/);
                    if (!videoIdMatch) continue;
                    
                    const videoId = videoIdMatch[1];
                    
                    // Extract title using multiple patterns
                    const titlePatterns = [
                      /"title":\s*{\s*"runs":\s*\[{\s*"text":\s*"([^"]+)"/,
                      /"title":\s*{\s*"simpleText":\s*"([^"]+)"/,
                      /"text":\s*"([^"]+)"/
                    ];
                    
                    let title = null;
                    for (const pattern of titlePatterns) {
                      const titleMatch = rendererStr.match(pattern);
                      if (titleMatch && titleMatch[1]) {
                        title = titleMatch[1];
                        break;
                      }
                    }
                    
                                         if (title && !objVideos.some(video => video.strIdent === videoId)) {
                       objVideos.push({
                         strIdent: videoId,
                         intTimestamp: null,
                         strTitle: decodeHtmlEntities(title),
                         intCount: null,
                       });
                     }
                  } catch (error) {
                    console.warn("Error parsing video renderer:", error);
                  }
                }
              }
              
                             // Additional fallback: Simple video ID extraction
               if (objVideos.length === 0) {
                 const videoIdRegex = /"videoId":\s*"([a-zA-Z0-9_-]{11})"/g;
                 let videoIdMatch;
                 const foundIds = new Set();
                 
                 while ((videoIdMatch = videoIdRegex.exec(cleanedText)) !== null) {
                   const videoId = videoIdMatch[1];
                   
                   if (!foundIds.has(videoId)) {
                     foundIds.add(videoId);
                     objVideos.push({
                       strIdent: videoId,
                       intTimestamp: null,
                       strTitle: `Video ${videoId}`, // Fallback title
                       intCount: null,
                     });
                   }
                 }
               }
              
            } catch (error) {
              console.error("Error in YouTube history parsing:", error);
            }
            
                         

            if (objArgs.strContinuation !== null) {
              objArgs.strContinuation = null;
            }

            return funcCallback(objVideos);
          } catch (error) {
            console.error("Error fetching YouTube videos:", error);
            return funcCallback([]);
          }
        },
        objDatabase: DatabaseUtils.database("readwrite"),
        objVideo: BackgroundUtils.video(),
        objGet: DatabaseUtils.get(funcProgress),
        objPut: DatabaseUtils.put(),
        "objVideo-Next": BackgroundUtils.videoNext(),
        objCount: DatabaseUtils.count(),

        objContinuation: function (objArgs, funcCallback) {
          if (objArgs.intExisting < objRequest.intThreshold) {
            if (objArgs.strContinuation !== null) {
              return funcCallback({}, "objContauth");
            }
          }

          return funcCallback({});
        },
      },
      createResponseCallback((result) => {
        // Add video count to response
        if (result && result.objVideos) {
          result.videoCount = result.objVideos.length;
        }
        return result;
      }, funcResponse),
    );
  },

  synchronizeLikedVideos: function (objRequest, funcResponse, funcProgress) {
    AsyncSeries.run(
      {
        objCookies: BackgroundUtils.cookies(),
        objContauth: BackgroundUtils.contauth(),

        /**
         * Extract video information from YouTube Liked Videos playlist
         * @param {Object} objArgs - Arguments for the fetch request
         * @param {Function} funcCallback - Callback to be invoked after processing
         */
        objVideos: async function (objArgs, funcCallback) {
          if (objArgs.strContinuation === undefined) {
            objArgs.strContinuation = null;
            objArgs.strClicktrack = null;
            objArgs.objYtcfg = null;
            objArgs.objYtctx = null;
          }

          try {
            let response;
            
            if (
              objArgs.strContinuation === null ||
              objArgs.strClicktrack === null ||
              objArgs.objYtcfg === null ||
              objArgs.objYtctx === null
            ) {
              // Initial request to get YouTube Liked Videos page
              response = await fetch("https://www.youtube.com/playlist?list=LL");
            } else if (
              objArgs.strContinuation !== null &&
              objArgs.strClicktrack !== null &&
              objArgs.objYtcfg !== null &&
              objArgs.objYtctx !== null
            ) {
              // Subsequent request with continuation token
              objArgs.objYtctx["client"]["screenWidthPoints"] = 1024;
              objArgs.objYtctx["client"]["screenHeightPoints"] = 768;
              objArgs.objYtctx["client"]["screenPixelDensity"] = 1;
              objArgs.objYtctx["client"]["utcOffsetMinutes"] = -420;
              objArgs.objYtctx["client"]["userInterfaceTheme"] =
                "USER_INTERFACE_THEME_LIGHT";

              objArgs.objYtctx["request"]["internalExperimentFlags"] = [];
              objArgs.objYtctx["request"]["consistencyTokenJars"] = [];

              response = await fetch(
                "https://www.youtube.com/youtubei/v1/browse?key=" +
                objArgs.objYtcfg["INNERTUBE_API_KEY"],
                {
                  method: "POST",
                  headers: {
                    "Authorization": objArgs.objContauth.strAuth,
                    "Content-Type": "application/json",
                    "X-Origin": "https://www.youtube.com",
                    "X-Goog-AuthUser": "0",
                    "X-Goog-PageId": objArgs.objYtcfg["DELEGATED_SESSION_ID"],
                    "X-Goog-Visitor-Id": objArgs.objYtctx["client"]["visitorData"],
                  },
                  body: JSON.stringify({
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
                }
              );
            }

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();
            const cleanedText = responseText
              .replaceAll('\\"', '\\u0022')
              .replaceAll("\r", "")
              .replaceAll("\n", "");

            // extract youtube config
            if (objArgs.objYtcfg === null) {
              objArgs.objYtcfg = parseIncompleteJson(
                cleanedText
                  .split("ytcfg.set(")
                  .find(function (strData) {
                    return strData.indexOf("INNERTUBE_API_KEY") !== -1;
                  })
                  .slice(0, -2),
              );
            }

            // extract youtube context
            if (objArgs.objYtctx === null) {
              objArgs.objYtctx = parseIncompleteJson(
                cleanedText.split('"INNERTUBE_CONTEXT":')[1],
              );
            }

            // extract continuation token
            let strRegex = null;
            const objContinuation = new RegExp(
              '"continuationCommand":[^"]*"token":[^"]*"([^"]*)"',
              "g",
            );
            if ((strRegex = objContinuation.exec(cleanedText)) !== null) {
              objArgs.strContinuation = strRegex[1];
            }

            // extract click tracking params
            const objClicktrack = new RegExp(
              '"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"',
              "g",
            );
            if ((strRegex = objClicktrack.exec(cleanedText)) !== null) {
              objArgs.strClicktrack = strRegex[1];
            }

            // captures videoIds, titles, and timestamps from playlist
            let objVideos = [];
            
            // Try to find playlist addition date first
            const objVideoWithDate = new RegExp(
              '"playlistVideoRenderer":[^"]*"videoId":[^"]*"([^"]{11})"' + // videoId
              '.*?"title":[^"]*"runs":[^"]*"text":[^"]*"([^"]*)"' + // title
              '.*?"videoSecondaryInfoRenderer".*?"dateText":[^"]*"simpleText":[^"]*"([^"]*)"', // dateAdded
              "g",
            );
            
            // Fallback regex if the first one doesn't match (without date)
            const objVideoFallback = new RegExp(
              '"playlistVideoRenderer":[^"]*"videoId":[^"]*"([^"]{11})"' + // videoId
              '.*?"title":[^"]*"runs":[^"]*"text":[^"]*"([^"]*)"', // title
              "g",
            );
            
            while ((strRegex = objVideoWithDate.exec(cleanedText)) !== null) {
              let strIdent = strRegex[1];
              let strTitle = strRegex[2];
              let strDateAdded = strRegex[3];

              // Decode HTML entities in title
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

              // Try to parse the date added, fallback to current time
              let intTimestamp = Date.now();
              if (strDateAdded) {
                // Try to parse relative time like "2 days ago", "1 week ago", etc.
                const timeMatch = strDateAdded.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
                if (timeMatch) {
                  const amount = parseInt(timeMatch[1]);
                  const unit = timeMatch[2].toLowerCase();
                  const now = new Date();
                  
                  switch (unit) {
                    case 'second':
                      intTimestamp = now.getTime() - (amount * 1000);
                      break;
                    case 'minute':
                      intTimestamp = now.getTime() - (amount * 60 * 1000);
                      break;
                    case 'hour':
                      intTimestamp = now.getTime() - (amount * 60 * 60 * 1000);
                      break;
                    case 'day':
                      intTimestamp = now.getTime() - (amount * 24 * 60 * 60 * 1000);
                      break;
                    case 'week':
                      intTimestamp = now.getTime() - (amount * 7 * 24 * 60 * 60 * 1000);
                      break;
                    case 'month':
                      intTimestamp = now.getTime() - (amount * 30 * 24 * 60 * 60 * 1000);
                      break;
                    case 'year':
                      intTimestamp = now.getTime() - (amount * 365 * 24 * 60 * 60 * 1000);
                      break;
                  }
                } else {
                  // Try to parse absolute date formats like "Dec 15, 2023"
                  const parsedDate = new Date(strDateAdded);
                  if (!isNaN(parsedDate.getTime())) {
                    intTimestamp = parsedDate.getTime();
                  }
                }
              }

              objVideos.push({
                strIdent: strIdent,
                intTimestamp: intTimestamp,
                strTitle: strTitle,
                intCount: 1, // Set count to 1 for liked videos
              });
            }
            
            // If no videos found with the detailed regex, try the fallback
            if (objVideos.length === 0) {
              while ((strRegex = objVideoFallback.exec(cleanedText)) !== null) {
                let strIdent = strRegex[1];
                let strTitle = strRegex[2];

                // Decode HTML entities in title
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

                objVideos.push({
                  strIdent: strIdent,
                  intTimestamp: Date.now(), // Use current timestamp as fallback
                  strTitle: strTitle,
                  intCount: 1, // Set count to 1 for liked videos
                });
              }
            }

            if (objArgs.strContinuation !== null) {
              objArgs.strContinuation = null;
            }

            return funcCallback(objVideos);
          } catch (error) {
            console.error("Error fetching YouTube liked videos:", error);
            return funcCallback([]);
          }
        },
              objDatabase: DatabaseUtils.database("readwrite"),
      objVideo: BackgroundUtils.video(),
      objGet: DatabaseUtils.get(funcProgress),
      objPut: DatabaseUtils.put(),
      "objVideo-Next": DatabaseUtils.videoNext(),
      objCount: DatabaseUtils.count(),

        objContinuation: function (objArgs, funcCallback) {
          if (objArgs.intExisting < objRequest.intThreshold) {
            if (objArgs.strContinuation !== null) {
              return funcCallback({}, "objContauth");
            }
          }

          return funcCallback({});
        },
      },
      createResponseCallback((result) => {
        // Add video count to response
        if (result && result.objVideos) {
          result.videoCount = result.objVideos.length;
        }
        return result;
      }, funcResponse),
    );
  },

  lookup: function (objRequest, funcResponse) {
    AsyncSeries.run(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: DatabaseUtils.database("readonly"),
        objGet: function (objArgs, funcCallback) {
          if (!objArgs.objDatabase) {
            console.error("Database object store not available");
            return funcCallback(null);
          }
          
          let objQuery = objArgs.objDatabase
            .index(DATABASE.INDEXES.IDENT)
            .get(objArgs.objVideo.strIdent);

          objQuery.onerror = function () {
            console.error("Database query error:", objQuery.error);
            return funcCallback(null);
          };

          objQuery.onsuccess = function () {
            if (objQuery.result !== undefined && objQuery.result !== null) {
              return funcCallback({
                strIdent: objQuery.result.strIdent,
                intTimestamp:
                  objQuery.result.intTimestamp || Date.now(),
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
    AsyncSeries.run(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: DatabaseUtils.database("readwrite"),
        objGet: function (objArgs, funcCallback) {
          if (!objArgs.objDatabase) {
            console.error("Database object store not available in Youtube.ensure");
            return funcCallback(null);
          }
          
          try {
            let objQuery = objArgs.objDatabase
              .index(DATABASE.INDEXES.IDENT)
              .get(objArgs.objVideo.strIdent);

            objQuery.onerror = function () {
              console.error("Database query error in Youtube.ensure:", objQuery.error);
              return funcCallback(null);
            };

            objQuery.onsuccess = function () {
              try {
                if (objQuery.result === undefined || objQuery.result === null) {
                  console.debug("Creating new video entry for:", objArgs.objVideo.strIdent);
                  return funcCallback({
                    strIdent: objArgs.objVideo.strIdent,
                    intTimestamp:
                      objArgs.objVideo.intTimestamp || Date.now(),
                    strTitle: objArgs.objVideo.strTitle || "",
                    intCount: objArgs.objVideo.intCount || 1,
                  });
                }

                // Return existing video data instead of null
                console.debug("Returning existing video data for:", objArgs.objVideo.strIdent);
                return funcCallback({
                  strIdent: objQuery.result.strIdent,
                  intTimestamp: objQuery.result.intTimestamp,
                  strTitle: objQuery.result.strTitle || "",
                  intCount: objQuery.result.intCount || 1,
                });
              } catch (error) {
                console.error("Error processing query result in Youtube.ensure:", error);
                return funcCallback(null);
              }
            };
          } catch (error) {
            console.error("Error creating database query in Youtube.ensure:", error);
            return funcCallback(null);
          }
        },
        objPut: DatabaseUtils.put(),
        objCount: DatabaseUtils.count(),
      },
      createResponseCallback(objArgs => objArgs.objGet, funcResponse),
    );
  },

  mark: function (objRequest, funcResponse) {
    AsyncSeries.run(
      {
        objVideo: function (objArgs, funcCallback) {
          return funcCallback(objRequest);
        },
        objDatabase: DatabaseUtils.database("readwrite"),
        objGet: function (objArgs, funcCallback) {
          if (!objArgs.objDatabase) {
            console.error("Database object store not available");
            return funcCallback(null);
          }
          
          let objQuery = objArgs.objDatabase
            .index(DATABASE.INDEXES.IDENT)
            .get(objArgs.objVideo.strIdent);

          objQuery.onerror = function () {
            console.error("Database query error:", objQuery.error);
            return funcCallback(null);
          };

          objQuery.onsuccess = function () {
            const currentTime = Date.now();
            
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback({
                strIdent: objArgs.objVideo.strIdent,
                intTimestamp: objArgs.objVideo.intTimestamp || currentTime,
                strTitle: objArgs.objVideo.strTitle || "",
                intCount: objArgs.objVideo.intCount || 1,
              });
            } else if (
              objQuery.result !== undefined &&
              objQuery.result !== null
            ) {
              const existingTimestamp = objQuery.result.intTimestamp || 0;
              const timeSinceLastView = currentTime - existingTimestamp;
              
              // Only increment count if enough time has passed since last view
              const shouldIncrementCount = timeSinceLastView >= TIMEOUTS.VIEW_COUNT_COOLDOWN;
              
              return funcCallback({
                strIdent: objQuery.result.strIdent,
                intTimestamp: objArgs.objVideo.intTimestamp || currentTime,
                strTitle:
                  objArgs.objVideo.strTitle || objQuery.result.strTitle || "",
                intCount: shouldIncrementCount ? (objQuery.result.intCount + 1 || 1) : (objQuery.result.intCount || 1),
              });
            }
          };
        },
        objPut: DatabaseUtils.put(),
        objCount: DatabaseUtils.count(),
      },
      createResponseCallback(objArgs => objArgs.objGet, funcResponse),
    );
  },
};