"use strict";

import {
  getBrowserType,
  sendMessageToTab,
  createResponseCallback,
  getStorageAsync,
  setStorageAsync,
  setDefaultInStorageIfNull,
  AsyncSeries,
  // Legacy compatibility
  Node,
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
          database: this.moduleInitializer(Database.init),
          history: this.moduleInitializer(History.init),
          youtube: this.moduleInitializer(Youtube.init),
          search: this.moduleInitializer(Search.init),
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
        const { strMessage: messageType, strIdent: videoId, strTitle: title } = request;
        
        const messageRequest = { strIdent: videoId, strTitle: title };
        
        const responseHandler = (response) => {
          console.debug(messageType, request, response);
          sendResponse(response);
        };

        const youtubeActions = {
          "youtubeLookup": Youtube.lookup,
          "youtubeEnsure": Youtube.ensure,
        };

        const action = youtubeActions[messageType];
        if (action) {
          if (title) {
            this.titleCache.set(videoId, title);
          }
          action(messageRequest, responseHandler);
          return true; // Indicate asynchronous response
        } else {
          console.warn("Unknown message type:", messageType);
          sendResponse(null);
        }
      } catch (error) {
        console.error("Error handling message:", error);
        sendResponse(null);
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
              strMessage: "youtubeMark",
              strIdent: videoId,
              intTimestamp: 0,
              strTitle: title,
              intCount: 0,
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
}

// Initialize the extension manager
const extensionManager = new ExtensionManager();
