import {
  createResponseCallback,
  BackgroundUtils,
  AsyncSeries,
  decodeHtmlEntitiesAndFixEncoding,
  isValidVideoTitle
} from "./utils.js";
import { TIMEOUTS } from "./constants.js";

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

  synchronize: async function (objRequest, funcResponse, funcProgress) {
    try {
      // Get the database provider factory
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse(null);
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse(null);
        return;
      }

      console.log("Starting YouTube history sync (single page only)...");

      // Fetch YouTube history page (no pagination)
      const response = await fetch("https://www.youtube.com/feed/history");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const cleanedText = responseText
        .replaceAll('\\"', '\\u0022')
        .replaceAll("\r", "")
        .replaceAll("\n", "");

      let objVideos = [];
      
      try {
        // Helper function to decode HTML entities (replaced with enhanced version from utils.js)
        const decodeHtmlEntities = decodeHtmlEntitiesAndFixEncoding;
        
        // Helper function to safely extract nested property
        const getNestedProperty = (obj, path) => {
          return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
          }, obj);
        };
        
        // Helper function to find video title from various locations
        const extractVideoTitle = (videoRenderer) => {
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
                          intTimestamp: Date.now(), // Use current timestamp since YouTube history doesn't provide exact timestamps
                          strTitle: decodeHtmlEntities(title),
                          intCount: 1,
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
        
        // Fallback: Use regex if JSON parsing failed
        if (objVideos.length === 0) {
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
                  intTimestamp: Date.now(),
                  strTitle: decodeHtmlEntities(title),
                  intCount: 1,
                });
              }
            } catch (error) {
              console.warn("Error parsing video renderer:", error);
            }
          }
        }
        
        // Final fallback: Simple video ID extraction
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
                intTimestamp: Date.now(),
                strTitle: `Video ${videoId}`, // Fallback title
                intCount: 1,
              });
            }
          }
        }
        
      } catch (error) {
        console.error("Error in YouTube history parsing:", error);
      }

      // Store videos in the current provider
      let processedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (const video of objVideos) {
        try {
          // Check if video already exists
          const existingVideo = await currentProvider.getVideo(video.strIdent);
          
          let videoToStore;
          if (existingVideo) {
            skippedCount++;
            continue;
          }
          // Create new video record
          videoToStore = video;
          
          await currentProvider.putVideo(videoToStore);
          processedCount++;
          
          // Report progress every 10 videos
          if (processedCount % 10 === 0 && funcProgress) {
            funcProgress({
              strProgress: `processed ${processedCount} YouTube videos`,
            });
          }
        } catch (error) {
          console.error(`Error storing video ${video.strIdent}:`, error);
        }
      }

      // Return results
      const result = {
        objVideos: objVideos,
        videoCount: processedCount,
        updatedCount: 0,
        newCount: processedCount,
        skippedCount: skippedCount
      };

      console.log(`YouTube sync completed: ${processedCount} videos processed (${processedCount} new, ${skippedCount} skipped)`);
      funcResponse(result);

    } catch (error) {
      console.error("YouTube synchronization error:", error);
      funcResponse(null);
    }
  },

  synchronizeLikedVideos: async function (objRequest, funcResponse, funcProgress) {
    try {
      // Get the database provider factory
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse(null);
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse(null);
        return;
      }

      console.log("Starting YouTube liked videos sync (single page only)...");

      // Fetch YouTube liked videos page (no pagination)
      const response = await fetch("https://www.youtube.com/playlist?list=LL");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      const cleanedText = responseText
        .replaceAll('\\"', '\\u0022')
        .replaceAll("\r", "")
        .replaceAll("\n", "");

      let objVideos = [];
      
      try {
        // Helper function to decode HTML entities (replaced with enhanced version from utils.js)
        const decodeHtmlEntities = decodeHtmlEntitiesAndFixEncoding;

        // Extract liked videos with detailed regex (with date)
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
        
        let strRegex;
        
        // Try to extract videos with date information
        while ((strRegex = objVideoWithDate.exec(cleanedText)) !== null) {
          let strIdent = strRegex[1];
          let strTitle = strRegex[2];
          let strDateAdded = strRegex[3];

          // Decode HTML entities in title
          strTitle = decodeHtmlEntities(strTitle);

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
            strTitle = decodeHtmlEntities(strTitle);

            objVideos.push({
              strIdent: strIdent,
              intTimestamp: Date.now(), // Use current timestamp as fallback
              strTitle: strTitle,
              intCount: 1, // Set count to 1 for liked videos
            });
          }
        }
        
      } catch (error) {
        console.error("Error in YouTube liked videos parsing:", error);
      }

      // Store videos in the current provider
      let processedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (const video of objVideos) {
        try {
          // Check if video already exists
          const existingVideo = await currentProvider.getVideo(video.strIdent);
          
          let videoToStore;
          if (existingVideo) {
            skippedCount++;
            continue;
          }
          // Create new video record
          videoToStore = video;
          
          await currentProvider.putVideo(videoToStore);
          processedCount++;
          
          // Report progress every 10 videos
          if (processedCount % 10 === 0 && funcProgress) {
            funcProgress({
              strProgress: `processed ${processedCount} liked videos`,
            });
          }
        } catch (error) {
          console.error(`Error storing liked video ${video.strIdent}:`, error);
        }
      }

      // Return results
      const result = {
        objVideos: objVideos,
        videoCount: processedCount,
        updatedCount: 0,
        newCount: processedCount,
        skippedCount: skippedCount
      };

      console.log(`YouTube liked videos sync completed: ${processedCount} videos processed (${processedCount} new, ${skippedCount} skipped)`);
      funcResponse(result);

    } catch (error) {
      console.error("YouTube liked videos synchronization error:", error);
      funcResponse(null);
    }
  },

  lookup: async function (objRequest, funcResponse) {
    try {
      // Use the database provider factory instead of direct IndexedDB access
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse(null);
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse(null);
        return;
      }

      // Get the specific video from the current provider
      const video = await currentProvider.getVideo(objRequest.strIdent);
      
      if (video) {
        funcResponse({
          strIdent: video.strIdent,
          intTimestamp: video.intTimestamp || Date.now(),
          strTitle: video.strTitle || "",
          intCount: video.intCount || 1,
        });
      } else {
        funcResponse(null);
      }
      
    } catch (error) {
      console.error("YouTube lookup error:", error);
      funcResponse(null);
    }
  },

  ensure: async function (objRequest, funcResponse) {
    try {
      // Use the database provider factory instead of direct IndexedDB access
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse(null);
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse(null);
        return;
      }

      // Check if video already exists in the database
      const existingVideo = await currentProvider.getVideo(objRequest.strIdent);
      
      let videoToReturn;
      if (existingVideo) {
        // Prefer valid titles when updating existing videos
        let titleToUse = existingVideo.strTitle || "";
        if (objRequest.strTitle && isValidVideoTitle(objRequest.strTitle)) {
          titleToUse = objRequest.strTitle;
        } else if (!isValidVideoTitle(titleToUse) && objRequest.strTitle) {
          // If existing title is invalid but new title exists, use new title
          titleToUse = objRequest.strTitle;
        }
        
        // Return existing video data with potentially updated title
        console.debug("Returning existing video data for:", objRequest.strIdent);
        videoToReturn = {
          strIdent: existingVideo.strIdent,
          intTimestamp: existingVideo.intTimestamp,
          strTitle: titleToUse,
          intCount: existingVideo.intCount || 1,
        };
        
        // Update the database if title changed
        if (titleToUse !== existingVideo.strTitle) {
          await currentProvider.putVideo(videoToReturn);
        }
      } else {
        // Create new video entry only with valid titles
        const titleToUse = objRequest.strTitle && isValidVideoTitle(objRequest.strTitle) ? objRequest.strTitle : "";
        
        console.debug("Creating new video entry for:", objRequest.strIdent);
        const newVideo = {
          strIdent: objRequest.strIdent,
          intTimestamp: objRequest.intTimestamp || Date.now(),
          strTitle: titleToUse,
          intCount: objRequest.intCount || 1,
        };
        
        // Store the new video in the current provider
        await currentProvider.putVideo(newVideo);
        videoToReturn = newVideo;
      }

      funcResponse(videoToReturn);
      
    } catch (error) {
      console.error("YouTube ensure error:", error);
      funcResponse(null);
    }
  },

  mark: async function (objRequest, funcResponse) {
    try {
      // Use the database provider factory instead of direct IndexedDB access
      const extensionManager = globalThis.extensionManager;
      if (!extensionManager || !extensionManager.providerFactory) {
        console.error("Database provider factory not available");
        funcResponse(null);
        return;
      }

      const currentProvider = extensionManager.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        console.error("No current database provider available");
        funcResponse(null);
        return;
      }

      // Check if video already exists in the database
      const existingVideo = await currentProvider.getVideo(objRequest.strIdent);
      const currentTime = Date.now();
      
      let videoToStore;
      if (existingVideo) {
        // Update existing video
        const existingTimestamp = existingVideo.intTimestamp || 0;
        const timeSinceLastView = currentTime - existingTimestamp;
        
        // Only increment count if enough time has passed since last view
        const shouldIncrementCount = timeSinceLastView >= TIMEOUTS.VIEW_COUNT_COOLDOWN;
        
        // Prefer valid titles over invalid ones
        let titleToUse = existingVideo.strTitle || "";
        if (objRequest.strTitle && isValidVideoTitle(objRequest.strTitle)) {
          titleToUse = objRequest.strTitle;
        } else if (!isValidVideoTitle(titleToUse) && objRequest.strTitle) {
          // If existing title is invalid but new title exists, use new title even if not ideal
          titleToUse = objRequest.strTitle;
        }
        
        videoToStore = {
          strIdent: existingVideo.strIdent,
          intTimestamp: objRequest.intTimestamp || currentTime,
          strTitle: titleToUse,
          intCount: shouldIncrementCount ? (existingVideo.intCount + 1 || 1) : (existingVideo.intCount || 1),
        };
      } else {
        // Create new video entry only if title is valid or no title is provided
        const titleToUse = objRequest.strTitle && isValidVideoTitle(objRequest.strTitle) ? objRequest.strTitle : "";
        
        videoToStore = {
          strIdent: objRequest.strIdent,
          intTimestamp: objRequest.intTimestamp || currentTime,
          strTitle: titleToUse,
          intCount: objRequest.intCount || 1,
        };
      }

      // Store the video in the current provider
      await currentProvider.putVideo(videoToStore);
      
      funcResponse(videoToStore);
      
    } catch (error) {
      console.error("YouTube mark error:", error);
      funcResponse(null);
    }
  },
};