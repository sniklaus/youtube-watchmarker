"use strict";

import {
  sendMessageToTab,
  createResponseCallback,
  getStorageAsync,
  setStorageAsync,
  setDefaultInStorageIfNull,
  AsyncSeries,
} from "./utils.js";

import { Database } from "./bg-database.js";
import { History } from "./bg-history.js";
import { Youtube } from "./bg-youtube.js";
import { Search } from "./bg-search.js";

/**
 * Extension background script manager
 */
class ExtensionManager {
  constructor() {
    this.titleCache = new Map();
    this.isInitialized = false;
    
    this.init();
  }

  /**
   * Initialize the extension
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      await AsyncSeries.run(
        {
          settings: this.initializeSettings.bind(this),
          database: this.moduleInitializer(Database.init.bind(Database)),
          history: this.moduleInitializer(History.init.bind(History)),
          youtube: this.moduleInitializer(Youtube.init.bind(Youtube)),
          search: this.moduleInitializer(Search.init.bind(Search)),
          action: this.setupActionHandler.bind(this),
          message: this.setupMessageHandler.bind(this),
          tabHook: this.setupTabHook.bind(this),
          requestHook: this.setupRequestHook.bind(this),
          synchronize: this.setupSynchronization.bind(this),
        },
        (result) => {
          if (result === null) {
            console.error("Error initializing extension");
          } else {
            console.log("Extension initialized successfully");
            this.isInitialized = true;
          }
        }
      );
    } catch (error) {
      console.error("Failed to initialize extension:", error);
    }
  }

  /**
   * Creates a module initializer function
   * @param {Function} moduleInit - Module initialization function
   * @returns {Function} Initializer function
   */
  moduleInitializer(moduleInit) {
    return (args, callback) => {
      moduleInit({}, createResponseCallback(() => ({}), callback));
    };
  }

  /**
   * Initialize extension settings
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  async initializeSettings(args, callback) {
    try {
      // Initialize integer settings
      const integerSettings = [
        "Database.intSize",
        "History.intTimestamp",
        "Youtube.intTimestamp",
      ];

      for (const setting of integerSettings) {
        await setDefaultInStorageIfNull(
          `extensions.Youwatch.${setting}`,
          "0"
        );
      }

      // Initialize boolean settings
      const booleanSettings = [
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

      for (const setting of booleanSettings) {
        await setDefaultInStorageIfNull(
          `extensions.Youwatch.${setting}`,
          "true"
        );
      }

      // Initialize stylesheet settings
      const stylesheetSettings = [
        {
          key: "extensions.Youwatch.Stylesheet.strFadeout",
          defaultValue: ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { opacity:0.3; }",
        },
        {
          key: "extensions.Youwatch.Stylesheet.strGrayout",
          defaultValue: ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { filter:grayscale(1.0); }",
        },
        {
          key: "extensions.Youwatch.Stylesheet.strShowbadge",
          defaultValue: '.youwatch-mark::after { background-color:#000000; border-radius:2px; color:#FFFFFF; content:"WATCHED"; font-size:11px; left:4px; opacity:0.8; padding:3px 4px 3px 4px; position:absolute; top:4px; }',
        },
        {
          key: "extensions.Youwatch.Stylesheet.strShowdate",
          defaultValue: '.youwatch-mark::after { content:"WATCHED" attr(watchdate); white-space:nowrap; }',
        },
        {
          key: "extensions.Youwatch.Stylesheet.strHideprogress",
          defaultValue: "ytd-thumbnail-overlay-resume-playback-renderer, ytm-thumbnail-overlay-resume-playback-renderer { display:none !important; }",
        },
      ];

      for (const { key, defaultValue } of stylesheetSettings) {
        const value = await getStorageAsync(key);
        if (value === null) {
          await setStorageAsync(key, defaultValue);
        }
      }

      callback({});
    } catch (error) {
      console.error("Failed to initialize settings:", error);
      callback(null);
    }
  }

  /**
   * Setup action handler for extension icon clicks
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  setupActionHandler(args, callback) {
    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({
        url: "content/index.html",
      });
    });

    callback({});
  }

  /**
   * Setup message handler for content script communication
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  setupMessageHandler(args, callback) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        const { action, videoId, title, query, data } = request;
        
        const responseHandler = (response) => {
          console.debug(action, request, response);
          sendResponse(response);
        };

        const actionHandlers = {
          // YouTube actions
          "youtube-lookup": (req, res) => {
            const messageRequest = { strIdent: req.videoId, strTitle: req.title };
            if (req.title) {
              this.titleCache.set(req.videoId, req.title);
            }
            Youtube.lookup(messageRequest, res);
          },
          "youtube-ensure": (req, res) => {
            const messageRequest = { strIdent: req.videoId, strTitle: req.title };
            if (req.title) {
              this.titleCache.set(req.videoId, req.title);
            }
            Youtube.ensure(messageRequest, res);
          },
          
          // Database actions
          "database-export": (req, res) => {
            this.exportDatabaseData(res);
          },
          "database-import": (req, res) => {
            Database.import({ objVideos: JSON.parse(req.data) }, (response) => {
              if (response) {
                res({ success: true });
              } else {
                res({ success: false, error: "Import failed" });
              }
            });
          },
          "database-reset": (req, res) => {
            Database.reset({}, (response) => {
              if (response) {
                res({ success: true });
              } else {
                res({ success: false, error: "Reset failed" });
              }
            });
          },
          "database-size": (req, res) => {
            this.getDatabaseSize(res);
          },
          
          // Search actions
          "search-videos": (req, res) => {
            const searchRequest = { 
              strQuery: req.query, 
              intSkip: 0, 
              intLength: 50 
            };
            Search.lookup(searchRequest, (response) => {
              if (response && response.objVideos) {
                const results = response.objVideos.map(video => ({
                  id: video.strIdent,
                  title: video.strTitle,
                  timestamp: video.intTimestamp,
                  count: video.intCount
                }));
                res({ success: true, results });
              } else {
                res({ success: false, results: [] });
              }
            });
          },
          "search-delete": (req, res) => {
            const deleteRequest = { strIdent: req.videoId };
            Search.delete(deleteRequest, (response) => {
              if (response) {
                res({ success: true });
              } else {
                res({ success: false, error: "Delete failed" });
              }
            }, (progress) => {
              // Progress callback - could be used for loading updates
              console.log("Delete progress:", progress);
            });
          },
          
          // Timestamp actions
          "history-timestamp": (req, res) => {
            this.getHistoryTimestamp(res);
          },
          "youtube-timestamp": (req, res) => {
            this.getYoutubeTimestamp(res);
          },
          
          // Synchronization actions
          "history-synchronize": (req, res) => {
            this.synchronizeHistoryAction(res);
          },
          "youtube-synchronize": (req, res) => {
            this.synchronizeYoutubeAction(res);
          }
        };

        const handler = actionHandlers[action];
        if (handler) {
          handler(request, responseHandler);
          return true; // Indicate asynchronous response
        } else {
          console.warn("Unknown action:", action);
          sendResponse({ success: false, error: "Unknown action" });
        }
      } catch (error) {
        console.error("Error handling message:", error);
        sendResponse({ success: false, error: error.message });
      }
    });

    callback({});
  }

  /**
   * Setup tab update hook for tracking navigation
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  setupTabHook(args, callback) {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      try {
        if (tabId < 0 || !this.isYouTubeUrl(tab.url)) {
          return;
        }

        const shouldTrackNavigation = await getStorageAsync(
          "extensions.Youwatch.Condition.boolBrownav"
        );
        
        if (shouldTrackNavigation === "true") {
          await this.handleTabNavigation(tabId, changeInfo, tab);
        }
      } catch (error) {
        console.error("Error in tab hook:", error);
      }
    });

    callback({});
  }

  /**
   * Checks if URL is a YouTube URL
   * @param {string} url - URL to check
   * @returns {boolean} True if YouTube URL
   */
  isYouTubeUrl(url) {
    return url && (
      url.startsWith("https://www.youtube.com") ||
      url.startsWith("https://m.youtube.com")
    );
  }

  /**
   * Checks if URL is a YouTube video URL
   * @param {string} url - URL to check
   * @returns {boolean} True if YouTube video URL
   */
  isYouTubeVideoUrl(url) {
    return url && (
      url.startsWith("https://www.youtube.com/watch?v=") ||
      url.startsWith("https://www.youtube.com/shorts/") ||
      url.startsWith("https://m.youtube.com/watch?v=")
    );
  }

  /**
   * Handle tab navigation to YouTube videos
   * @param {number} tabId - Tab ID
   * @param {Object} changeInfo - Change information
   * @param {Object} tab - Tab object
   */
  async handleTabNavigation(tabId, changeInfo, tab) {
    if (!this.isYouTubeVideoUrl(tab.url) || !changeInfo.title) {
      return;
    }

    let title = changeInfo.title;
    if (title.endsWith(" - YouTube")) {
      title = title.slice(0, -10);
    }

    const videoId = tab.url.split("&")[0].slice(-11);

    try {
      // Mark video as watched
      await this.markVideoAsWatched(videoId, title);
      
      // Notify all YouTube tabs
      await this.notifyYouTubeTabs(videoId, title);
    } catch (error) {
      console.error("Error handling tab navigation:", error);
    }
  }

  /**
   * Mark a video as watched
   * @param {string} videoId - Video ID
   * @param {string} title - Video title
   */
  async markVideoAsWatched(videoId, title) {
    return new Promise((resolve, reject) => {
      Youtube.mark(
        { strIdent: videoId, strTitle: title },
        (response) => {
          if (response) {
            console.debug("Video marked as watched:", videoId);
            resolve(response);
          } else {
            reject(new Error("Failed to mark video as watched"));
          }
        }
      );
    });
  }

  /**
   * Notify all YouTube tabs about a marked video
   * @param {string} videoId - Video ID
   * @param {string} title - Video title
   */
  async notifyYouTubeTabs(videoId, title) {
    return new Promise((resolve) => {
      chrome.tabs.query(
        { url: "*://*.youtube.com/*" },
        (tabs) => {
          tabs.forEach(tab => {
            sendMessageToTab(tab.id, {
              action: "youtube-mark",
              videoId: videoId,
              timestamp: 0,
              title: title,
              count: 0,
            });
          });
          resolve();
        }
      );
    });
  }

  /**
   * Setup request hook for tracking video progress
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  async setupRequestHook(args, callback) {
    const shouldTrackProgress = await getStorageAsync(
      "extensions.Youwatch.Condition.boolYouprog"
    );
    
    if (shouldTrackProgress === "true") {
      chrome.webRequest.onSendHeaders.addListener(
        (details) => this.handleProgressRequest(details),
        { urls: ["https://www.youtube.com/api/stats/watchtime*"] }
      );
    }

    callback({});
  }

  /**
   * Handle progress tracking requests
   * @param {Object} details - Request details
   */
  async handleProgressRequest(details) {
    try {
      if (details.url.includes("muted=1")) {
        return;
      }

      const urlParams = new URLSearchParams(details.url.split('?')[1]);
      const elapsedTimes = urlParams.get('et')?.split(',') || [];
      const videoId = urlParams.get('docid');

      if (!videoId || videoId.length !== 11) {
        return;
      }

      const title = this.titleCache.get(videoId) || "";
      if (!title) {
        return;
      }

      // Check if any elapsed time is significant (> 3 seconds)
      const hasSignificantProgress = elapsedTimes.some(time => 
        parseFloat(time) >= 3.0
      );

      if (hasSignificantProgress) {
        await this.ensureVideoTracked(videoId, title);
        await this.notifyYouTubeTabs(videoId, title);
      }
    } catch (error) {
      console.error("Error handling progress request:", error);
    }
  }

  /**
   * Ensure a video is tracked in the database
   * @param {string} videoId - Video ID
   * @param {string} title - Video title
   */
  async ensureVideoTracked(videoId, title) {
    return new Promise((resolve, reject) => {
      Youtube.ensure(
        { strIdent: videoId, strTitle: title },
        (response) => {
          if (response) {
            console.debug("Video ensured:", videoId);
            resolve(response);
          } else {
            reject(new Error("Failed to ensure video"));
          }
        }
      );
    });
  }

  /**
   * Setup periodic synchronization
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  setupSynchronization(args, callback) {
    chrome.alarms.create("synchronize", {
      periodInMinutes: 60,
    });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === "synchronize") {
        await this.performSynchronization();
      }
    });

    callback({});
  }

  /**
   * Perform periodic synchronization
   */
  async performSynchronization() {
    try {
      const shouldSyncHistory = await getStorageAsync(
        "extensions.Youwatch.Condition.boolBrowhist"
      );
      
      if (shouldSyncHistory === "true") {
        await this.syncHistory();
      }

      const shouldSyncYoutube = await getStorageAsync(
        "extensions.Youwatch.Condition.boolYouhist"
      );
      
      if (shouldSyncYoutube === "true") {
        await this.syncYoutube();
      }
    } catch (error) {
      console.error("Error during synchronization:", error);
    }
  }

  /**
   * Synchronize browser history
   */
  async syncHistory() {
    return new Promise((resolve) => {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      History.synchronize(
        { intTimestamp: sevenDaysAgo },
        (response) => {
          console.debug("History synchronized:", response);
          resolve(response);
        },
        (progress) => {
          console.debug("History sync progress:", progress);
        }
      );
    });
  }

  /**
   * Synchronize YouTube history
   */
  async syncYoutube() {
    return new Promise((resolve) => {
      Youtube.synchronize(
        { intThreshold: 512 },
        (response) => {
          console.debug("YouTube synchronized:", response);
          resolve(response);
        },
        (progress) => {
          console.debug("YouTube sync progress:", progress);
        }
      );
    });
  }

  /**
   * Get database size
   * @param {Function} callback - Response callback
   */
  async getDatabaseSize(callback) {
    try {
      const size = await getStorageAsync("extensions.Youwatch.Database.intSize");
      callback({ success: true, size: size || "0" });
    } catch (error) {
      console.error("Error getting database size:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Get history timestamp
   * @param {Function} callback - Response callback
   */
  async getHistoryTimestamp(callback) {
    try {
      const timestamp = await getStorageAsync("extensions.Youwatch.History.intTimestamp");
      const parsedTimestamp = timestamp ? parseInt(timestamp) : null;
      // Return null if timestamp is 0 (never synchronized) or null
      callback({ success: true, timestamp: parsedTimestamp && parsedTimestamp !== 0 ? parsedTimestamp : null });
    } catch (error) {
      console.error("Error getting history timestamp:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Get YouTube timestamp
   * @param {Function} callback - Response callback
   */
  async getYoutubeTimestamp(callback) {
    try {
      const timestamp = await getStorageAsync("extensions.Youwatch.Youtube.intTimestamp");
      const parsedTimestamp = timestamp ? parseInt(timestamp) : null;
      // Return null if timestamp is 0 (never synchronized) or null
      callback({ success: true, timestamp: parsedTimestamp && parsedTimestamp !== 0 ? parsedTimestamp : null });
    } catch (error) {
      console.error("Error getting YouTube timestamp:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Export database data for options page
   * @param {Function} callback - Response callback
   */
  async exportDatabaseData(callback) {
    try {
      // Get database connection
      const Database = globalThis.Database;
      if (!Database || !Database.database) {
        callback({ success: false, error: "Database not initialized" });
        return;
      }

      const store = Database.getObjectStore("readonly");
      const request = store.getAll();

      request.onsuccess = () => {
        const data = JSON.stringify(request.result);
        callback({ success: true, data: data });
      };

      request.onerror = () => {
        console.error("Failed to export database:", request.error);
        callback({ success: false, error: "Failed to export database" });
      };
    } catch (error) {
      console.error("Error exporting database:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Synchronize history action for options page
   * @param {Function} callback - Response callback
   */
  async synchronizeHistoryAction(callback) {
    try {
      const response = await this.syncHistory();
      callback({ success: true, response: response });
    } catch (error) {
      console.error("Error synchronizing history:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Synchronize YouTube action for options page
   * @param {Function} callback - Response callback
   */
  async synchronizeYoutubeAction(callback) {
    try {
      const response = await this.syncYoutube();
      callback({ success: true, response: response });
    } catch (error) {
      console.error("Error synchronizing YouTube:", error);
      callback({ success: false, error: error.message });
    }
  }
}

// Initialize the extension manager
const extensionManager = new ExtensionManager();
