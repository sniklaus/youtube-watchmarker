"use strict";

import {
  sendMessageToTab,
  createResponseCallback,
  getStorageAsync,
  setStorageAsync,
  setDefaultInStorageIfNull,
} from "./utils.js";

import { Database } from "./bg-database.js";
import { SyncManagerInstance } from "./bg-sync-manager.js";
import { History } from "./bg-history.js";
import { Youtube } from "./bg-youtube.js";
import { Search } from "./bg-search.js";
import { databaseProviderFactory } from "./database-provider-factory.js";
import { credentialStorage } from "./credential-storage.js";
import { messageHandler } from "./message-handler.js";
import { ACTIONS } from "./constants.js";

/**
 * Extension background script manager
 */
class ExtensionManager {
  constructor() {
    this.titleCache = new Map();
    this.isInitialized = false;
    this.providerFactory = databaseProviderFactory;
    
    this.init();
  }

  /**
   * Initialize the extension
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Initialize settings first
      await this.initializeSettings();

      // Initialize database first so it's available for provider factory
      await this.initializeDatabase();
      
      // Then initialize provider factory after database is ready
      await this.initializeProviderFactory();
      
      // Initialize other modules that depend on database
      await Promise.all([
        this.initializeHistory(),
        this.initializeYoutube(),
        this.initializeSearch()
      ]);

      // Setup handlers
      this.setupActionHandler();
      this.setupMessageHandler();
      this.setupTabHook();
      this.setupRequestHook();
      this.setupSynchronization();

      this.isInitialized = true;
      console.log("Extension initialized successfully");
    } catch (error) {
      console.error("Failed to initialize extension:", error);
      throw error;
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
   * Initialize database
   */
  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      Database.init({}, (result) => {
        if (result === null) {
          reject(new Error("Database initialization failed"));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Initialize history module
   */
  async initializeHistory() {
    return new Promise((resolve, reject) => {
      History.init({}, (result) => {
        if (result === null) {
          reject(new Error("History module initialization failed"));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Initialize YouTube module
   */
  async initializeYoutube() {
    return new Promise((resolve, reject) => {
      Youtube.init({}, (result) => {
        if (result === null) {
          reject(new Error("YouTube module initialization failed"));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Initialize search module
   */
  async initializeSearch() {
    return new Promise((resolve, reject) => {
      Search.init({}, (result) => {
        if (result === null) {
          reject(new Error("Search module initialization failed"));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Initialize extension settings
   */
  async initializeSettings() {
    try {
      // Initialize integer settings using sync storage
      const integerSettings = [
        { key: "databaseSize", defaultValue: 0 },
        { key: "historyTimestamp", defaultValue: 0 },
        { key: "youtubeWatchHistoryTimestamp", defaultValue: 0 },
      ];

      for (const { key, defaultValue } of integerSettings) {
        await this.setDefaultInSyncStorageIfNull(key, defaultValue);
      }

      // Initialize boolean settings using sync storage with consistent naming
      const booleanSettings = [
        { key: "idCondition_Brownav", defaultValue: true },
        { key: "idCondition_Browhist", defaultValue: true },
        { key: "idCondition_Youprog", defaultValue: true },
        { key: "idCondition_Youbadge", defaultValue: true },
        { key: "idCondition_Youhist", defaultValue: true },
        { key: "idCondition_Yourating", defaultValue: true },
        { key: "idVisualization_Fadeout", defaultValue: true },
        { key: "idVisualization_Grayout", defaultValue: true },
        { key: "idVisualization_Showbadge", defaultValue: true },
        { key: "idVisualization_Showdate", defaultValue: true },
        { key: "idVisualization_Hideprogress", defaultValue: true },
        { key: "idVisualization_Showpublishdate", defaultValue: false },
      ];

      for (const { key, defaultValue } of booleanSettings) {
        await this.setDefaultInSyncStorageIfNull(key, defaultValue);
      }

      // Initialize stylesheet settings using sync storage
      const stylesheetSettings = [
        {
          key: "stylesheet_Fadeout",
          defaultValue: ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { opacity:0.3; }",
        },
        {
          key: "stylesheet_Grayout",
          defaultValue: ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image { filter:grayscale(1.0); }",
        },
        {
          key: "stylesheet_Showbadge",
          defaultValue: '.youwatch-mark::after { background-color:#000000; border-radius:2px; color:#FFFFFF; content:"WATCHED"; font-size:11px; left:4px; opacity:0.8; padding:3px 4px 3px 4px; position:absolute; top:4px; }',
        },
        {
          key: "stylesheet_Showdate",
          defaultValue: '.youwatch-mark::after { content:"WATCHED" attr(watchdate); white-space:nowrap; }',
        },
        {
          key: "stylesheet_Hideprogress",
          defaultValue: "ytd-thumbnail-overlay-resume-playback-renderer, ytm-thumbnail-overlay-resume-playback-renderer { display:none !important; }",
        },
      ];

      for (const { key, defaultValue } of stylesheetSettings) {
        await this.setDefaultInSyncStorageIfNull(key, defaultValue);
      }

      console.log("Settings initialized successfully");
    } catch (error) {
      console.error("Failed to initialize settings:", error);
      throw error;
    }
  }

  /**
   * Setup action handler for extension icon clicks
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  setupActionHandler() {
    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({
        url: "content/index.html",
      });
    });
  }

  /**
   * Setup message handler for content script communication
   */
  setupMessageHandler() {
    // Initialize the unified message handler
    messageHandler.init();

    // Register all action handlers
    this.registerMessageHandlers();
  }

  /**
   * Register all message handlers with the unified MessageHandler
   */
  registerMessageHandlers() {
    // YouTube actions
    messageHandler.register(ACTIONS.YOUTUBE_LOOKUP, async (data) => {
      const messageRequest = { strIdent: data.videoId, strTitle: data.title };
      if (data.title) {
        this.titleCache.set(data.videoId, data.title);
      }
      return new Promise((resolve) => {
        Youtube.lookup(messageRequest, resolve);
      });
    });

    messageHandler.register(ACTIONS.YOUTUBE_ENSURE, async (data) => {
      const messageRequest = { strIdent: data.videoId, strTitle: data.title };
      if (data.title) {
        this.titleCache.set(data.videoId, data.title);
      }
      return new Promise((resolve) => {
        Youtube.ensure(messageRequest, resolve);
      });
    });

    // Database actions
    messageHandler.register(ACTIONS.DATABASE_EXPORT, async () => {
      return new Promise((resolve) => {
        this.exportDatabaseData(resolve);
      });
    });

    messageHandler.register(ACTIONS.DATABASE_IMPORT, async (data) => {
      try {
        let parsedData;
        
        // Parse as JSON
        try {
          parsedData = JSON.parse(data.data);
        } catch (jsonError) {
          console.error("Failed to parse database as JSON:", jsonError);
          throw new Error("Invalid database format - must be valid JSON");
        }
        
        return new Promise((resolve, reject) => {
          Database.import({ data: { data: parsedData } }, (response) => {
            if (response && response.success) {
              resolve({ success: true, message: response.message });
            } else {
              reject(new Error(response?.error || "Import failed"));
            }
          });
        });
      } catch (error) {
        console.error("Database import error:", error);
        throw error;
      }
    });

    // Add more handlers...
    this.registerAdditionalHandlers();
  }

  /**
   * Register additional message handlers
   */
  registerAdditionalHandlers() {
    // Search actions
    messageHandler.register(ACTIONS.SEARCH_DELETE, async (data) => {
      const deleteRequest = { strIdent: data.videoId };
      return new Promise((resolve, reject) => {
        Search.delete(deleteRequest, (response) => {
          if (response) {
            resolve({ success: true });
          } else {
            reject(new Error("Delete failed"));
          }
        }, (progress) => {
          console.log("Delete progress:", progress);
        });
      });
    });

    // Settings actions
    messageHandler.register(ACTIONS.GET_SETTING, async (data) => {
      return new Promise((resolve) => {
        this.getSetting(data.key, resolve);
      });
    });

    messageHandler.register(ACTIONS.SET_SETTING, async (data) => {
      return new Promise((resolve) => {
        this.setSetting(data.key, data.value, resolve);
      });
    });

    // Setup modern message handler
    this.setupMessageHandler();
  }

  /**
   * Setup message handler
   */
  setupMessageHandler() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        const { action, videoId, title, query, data } = request;
        
        const responseHandler = (response) => {
          console.debug(action, request, response);
          sendResponse(response);
        };

        // Debug: Check if Database is available
        if (!Database) {
          console.error("Database object is not available!");
          sendResponse({ success: false, error: "Database not available" });
          return;
        }

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
            try {
              let parsedData;
              
              // Parse as JSON
              try {
                parsedData = JSON.parse(req.data);
              } catch (jsonError) {
                console.error("Failed to parse database as JSON:", jsonError);
                res({ success: false, error: "Invalid database format - must be valid JSON" });
                return;
              }
              
              Database.import({ data: { data: parsedData } }, (response) => {
                if (response && response.success) {
                  res({ success: true, message: response.message });
                } else {
                  res({ success: false, error: response?.error || "Import failed" });
                }
              });
            } catch (error) {
              console.error("Database import error:", error);
              res({ success: false, error: "Import failed: " + error.message });
            }
          },
          "database-reset": (req, res) => {
            Database.reset({}, (response) => {
              if (response && response.success) {
                res({ success: true, message: response.message });
              } else {
                res({ success: false, error: response?.error || "Reset failed" });
              }
            });
          },
          "database-size": (req, res) => {
            this.getDatabaseSize(res);
          },
          
          // Sync actions
          "database-sync-enable": (req, res) => {
            try {
              Database.enableSync({ provider: req.provider }, res);
            } catch (error) {
              console.error("Error enabling sync:", error);
              res({ success: false, error: error.message });
            }
          },
          "database-sync-disable": (req, res) => {
            try {
              Database.disableSync({}, res);
            } catch (error) {
              console.error("Error disabling sync:", error);
              res({ success: false, error: error.message });
            }
          },
          "database-sync-now": (req, res) => {
            try {
              Database.syncNow({}, res);
            } catch (error) {
              console.error("Error syncing now:", error);
              res({ success: false, error: error.message });
            }
          },
          "database-sync-status": (req, res) => {
            try {
              Database.getSyncStatus({}, res);
            } catch (error) {
              console.error("Error getting sync status:", error);
              res({ success: false, error: error.message });
            }
          },
          
          // Database provider actions
          "database-provider-status": (req, res) => {
            try {
              this.getDatabaseProviderStatus(res);
            } catch (error) {
              console.error("Error getting provider status:", error);
              res({ success: false, error: error.message });
            }
          },
          "database-provider-switch": (req, res) => {
            try {
              this.switchDatabaseProvider(req, res);
            } catch (error) {
              console.error("Error switching provider:", error);
              res({ success: false, error: error.message });
            }
          },
          "database-provider-list": (req, res) => {
            try {
              this.getAvailableProviders(res);
            } catch (error) {
              console.error("Error getting provider list:", error);
              res({ success: false, error: error.message });
            }
          },
          "database-provider-migrate": (req, res) => {
            try {
              this.migrateDatabaseProviders(req, res);
            } catch (error) {
              console.error("Error migrating providers:", error);
              res({ success: false, error: error.message });
            }
          },
          "database-provider-sync": (req, res) => {
            try {
              this.syncDatabaseProviders(req, res);
            } catch (error) {
              console.error("Error syncing providers:", error);
              res({ success: false, error: error.message });
            }
          },
          
          // Supabase configuration actions
          "supabase-configure": (req, res) => {
            try {
              this.configureSupabase(req, res);
            } catch (error) {
              console.error("Error configuring Supabase:", error);
              res({ success: false, error: error.message });
            }
          },
          "supabase-test": (req, res) => {
            try {
              this.testSupabaseConnection(req, res);
            } catch (error) {
              console.error("Error testing Supabase:", error);
              res({ success: false, error: error.message });
            }
          },
          "supabase-clear": (req, res) => {
            try {
              this.clearSupabaseConfiguration(req, res);
            } catch (error) {
              console.error("Error clearing Supabase:", error);
              res({ success: false, error: error.message });
            }
          },
          "supabase-get-credentials": async (req, res) => {
            try {
              const credentials = await credentialStorage.getMaskedCredentials();
              res({ success: true, credentials });
            } catch (error) {
              console.error("Error getting Supabase credentials:", error);
              res({ success: false, error: error.message });
            }
          },
          "supabase-get-status": async (req, res) => {
            try {
              const status = await credentialStorage.getCredentialStatus();
              res({ success: true, status });
            } catch (error) {
              console.error("Error getting Supabase status:", error);
              res({ success: false, error: error.message });
            }
          },
          
          // Search actions
          "search-videos": (req, res) => {
            const page = req.page || 1;
            const pageSize = req.pageSize || 50;
            const query = req.query || '';
            
            // Check if database is ready
            if (!Database || !Database.isInitialized) {
              console.warn('Database not ready for search request');
              res({ 
                success: false, 
                error: 'Database not initialized yet. Please try again in a moment.',
                results: [], 
                totalResults: 0 
              });
              return;
            }
            
            // First, get all matching results for counting
            const countRequest = { 
              strQuery: query, 
              intSkip: 0, 
              intLength: 999999 // Large number to get all matching results
            };
            
            Search.lookup(countRequest, (countResponse) => {
              try {
                if (countResponse && countResponse.objVideos) {
                  const allResults = countResponse.objVideos;
                  const totalResults = allResults.length;
                  
                  // Calculate pagination
                  const skip = (page - 1) * pageSize;
                  const paginatedResults = allResults.slice(skip, skip + pageSize);
                  
                  const results = paginatedResults.map(video => ({
                    id: video.strIdent,
                    title: video.strTitle,
                    timestamp: video.intTimestamp,
                    count: video.intCount
                  }));
                  
                  res({ 
                    success: true, 
                    results, 
                    totalResults,
                    currentPage: page,
                    pageSize: pageSize
                  });
                } else {
                  // Check if this might be a database issue
                  const errorMessage = countResponse === null ? 
                    'Database connection error. Please try again.' : 
                    'No videos found in your watch history.';
                    
                  res({ 
                    success: false, 
                    error: errorMessage,
                    results: [], 
                    totalResults: 0 
                  });
                }
              } catch (searchError) {
                console.error('Search processing error:', searchError);
                res({ 
                  success: false, 
                  error: 'Search failed due to an internal error.',
                  results: [], 
                  totalResults: 0 
                });
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
            this.getYoutubeWatchHistoryTimestamp(res);
          },
          "youtube-liked-timestamp": (req, res) => {
            this.getYoutubeLikedTimestamp(res);
          },
          
          // Synchronization actions
          "history-synchronize": (req, res) => {
            this.synchronizeHistoryAction(res);
          },
          "youtube-synchronize": (req, res) => {
            this.synchronizeYoutubeAction(res);
          },
          "youtube-liked-videos": (req, res) => {
            this.synchronizeLikedVideosAction(res);
          },
          
          // Settings actions
          "get-setting": (req, res) => {
            this.getSetting(req.key, res);
          },
          "set-setting": (req, res) => {
            this.setSetting(req.key, req.value, res);
          },
          
          // Database provider actions
          "database-provider-status": (req, res) => {
            this.getDatabaseProviderStatus(res);
          },
          "database-provider-switch": (req, res) => {
            this.switchDatabaseProvider(req, res);
          },
          "database-provider-sync": (req, res) => {
            this.syncDatabaseProviders(req, res);
          },
          
          // Firestore configuration actions
          "firestore-config-save": (req, res) => {
            this.saveFirestoreConfig(req, res);
          },
          "firestore-config-load": (req, res) => {
            this.loadFirestoreConfig(res);
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
  }

  /**
   * Setup tab update hook for tracking navigation
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  setupTabHook() {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      try {
        if (tabId < 0 || !this.isYouTubeUrl(tab.url)) {
          return;
        }

        const shouldTrackNavigation = await new Promise((resolve) => {
          chrome.storage.sync.get(['idCondition_Brownav'], (result) => {
            resolve(result.idCondition_Brownav === true);
          });
        });
        
        if (shouldTrackNavigation) {
          await this.handleTabNavigation(tabId, changeInfo, tab);
        }
      } catch (error) {
        console.error("Error in tab hook:", error);
      }
    });
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
  async setupRequestHook() {
    const shouldTrackProgress = await new Promise((resolve) => {
      chrome.storage.sync.get(['idCondition_Youprog'], (result) => {
        resolve(result.idCondition_Youprog === true);
      });
    });
    
    if (shouldTrackProgress) {
      chrome.webRequest.onSendHeaders.addListener(
        (details) => this.handleProgressRequest(details),
        { urls: ["https://www.youtube.com/api/stats/watchtime*"] }
      );
    }
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
  setupSynchronization() {
    chrome.alarms.create("synchronize", {
      periodInMinutes: 60,
    });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === "synchronize") {
        await this.performSynchronization();
      }
    });
  }

  /**
   * Perform periodic synchronization
   */
  async performSynchronization() {
    try {
      const shouldSyncHistory = await new Promise((resolve) => {
        chrome.storage.sync.get(['idCondition_Browhist'], (result) => {
          resolve(result.idCondition_Browhist === true);
        });
      });
      
      if (shouldSyncHistory) {
        console.log("Performing automatic history synchronization");
        await this.syncHistory();
      }

      const shouldSyncYoutube = await new Promise((resolve) => {
        chrome.storage.sync.get(['idCondition_Youhist'], (result) => {
          resolve(result.idCondition_Youhist === true);
        });
      });
      
      if (shouldSyncYoutube) {
        console.log("Performing automatic YouTube synchronization");
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
    return new Promise(async (resolve, reject) => {
      try {
        // Get the last sync timestamp, or use 0 for full history if never synced
        const lastSyncTimestamp = await new Promise((resolve) => {
          chrome.storage.sync.get(['historyTimestamp'], (result) => {
            resolve(result.historyTimestamp || 0);
          });
        });
        
        console.log("Starting history synchronization from timestamp:", lastSyncTimestamp, 
                   lastSyncTimestamp === 0 ? "(full history)" : `(${new Date(lastSyncTimestamp).toLocaleString()})`);
        
        History.synchronize(
          { intTimestamp: lastSyncTimestamp },
          (response) => {
            if (response === null) {
              console.error("History synchronization failed - null response");
              reject(new Error("History synchronization failed"));
            } else {
              console.log("History synchronized successfully:", response);
              resolve(response);
            }
          },
          (progress) => {
            console.log("History sync progress:", progress);
          }
        );
      } catch (error) {
        console.error("Error getting sync timestamp:", error);
        reject(error);
      }
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
   * Synchronize YouTube Liked Videos
   */
  async syncLikedVideos() {
    return new Promise((resolve) => {
      Youtube.synchronizeLikedVideos(
        { intThreshold: 512 },
        (response) => {
          console.debug("YouTube liked videos synchronized:", response);
          resolve(response);
        },
        (progress) => {
          console.debug("YouTube liked videos sync progress:", progress);
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
      const currentProvider = this.providerFactory.getCurrentProvider();
      if (!currentProvider) {
        callback({ success: false, error: "No database provider available" });
        return;
      }

      const count = await currentProvider.getVideoCount();
      callback({ success: true, size: count.toString() });
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
      const timestamp = await new Promise((resolve) => {
        chrome.storage.sync.get(['historyTimestamp'], (result) => {
          resolve(result.historyTimestamp || 0);
        });
      });
      // Return null if timestamp is 0 (never synchronized) or null
      callback({ success: true, timestamp: timestamp && timestamp !== 0 ? timestamp : null });
    } catch (error) {
      console.error("Error getting history timestamp:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Get YouTube Watch History timestamp
   * @param {Function} callback - Response callback
   */
  async getYoutubeWatchHistoryTimestamp(callback) {
    try {
      const timestamp = await new Promise((resolve) => {
        chrome.storage.sync.get(['youtubeWatchHistoryTimestamp'], (result) => {
          resolve(result.youtubeWatchHistoryTimestamp || 0);
        });
      });
      // Return null if timestamp is 0 (never synchronized) or null
      callback({ success: true, timestamp: timestamp && timestamp !== 0 ? timestamp : null });
    } catch (error) {
      console.error("Error getting YouTube watch history timestamp:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Get YouTube Liked Videos timestamp
   * @param {Function} callback - Response callback
   */
  async getYoutubeLikedTimestamp(callback) {
    try {
      const timestamp = await new Promise((resolve) => {
        chrome.storage.sync.get(['youtubeLikedTimestamp'], (result) => {
          resolve(result.youtubeLikedTimestamp || 0);
        });
      });
      // Return null if timestamp is 0 (never synchronized) or null
      callback({ success: true, timestamp: timestamp && timestamp !== 0 ? timestamp : null });
    } catch (error) {
      console.error("Error getting YouTube liked videos timestamp:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Sets a default value in sync storage if the key doesn't exist
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value to set
   * @returns {Promise<void>}
   */
  async setDefaultInSyncStorageIfNull(key, defaultValue) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to get ${key} from chrome.storage.sync: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (result[key] === undefined) {
          chrome.storage.sync.set({ [key]: defaultValue }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Failed to set ${key} in chrome.storage.sync: ${chrome.runtime.lastError.message}`));
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get a setting value from sync storage
   * @param {string} key - Setting key
   * @param {Function} callback - Response callback
   */
  async getSetting(key, callback) {
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.storage.sync.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to get ${key} from chrome.storage.sync: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(result[key]);
          }
        });
      });
      callback({ success: true, value: result });
    } catch (error) {
      console.error("Error getting setting:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Set a setting value in sync storage
   * @param {string} key - Setting key
   * @param {any} value - Value to set
   * @param {Function} callback - Response callback
   */
  async setSetting(key, value, callback) {
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to set ${key} in chrome.storage.sync: ${chrome.runtime.lastError.message}`));
          } else {
            resolve();
          }
        });
      });
      callback({ success: true });
    } catch (error) {
      console.error("Error setting setting:", error);
      callback({ success: false, error: error.message });
    }
  }









  /**
   * Save Firestore configuration
   * @param {Object} request - Firestore configuration
   * @param {Function} callback - Response callback
   */
  async saveFirestoreConfig(request, callback) {
    try {
      // Save Firestore configuration to Chrome sync storage
      await chrome.storage.sync.set({
        firestore_enabled: request.enabled,
        firestore_project_id: request.projectId,
        firestore_api_key: request.apiKey,
        firestore_auth_domain: request.authDomain,
        firestore_collection_name: request.collectionName || 'watchmarker_videos',
        firestore_use_emulator: request.useEmulator || false
      });
      
      console.log("Firestore configuration saved");
      callback({ success: true });
    } catch (error) {
      console.error("Error saving Firestore config:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Load Firestore configuration
   * @param {Function} callback - Response callback
   */
  async loadFirestoreConfig(callback) {
    try {
      const result = await chrome.storage.sync.get([
        'firestore_enabled',
        'firestore_project_id',
        'firestore_api_key',
        'firestore_auth_domain',
        'firestore_collection_name',
        'firestore_use_emulator'
      ]);
      
      callback({ 
        success: true, 
        config: {
          enabled: result.firestore_enabled || false,
          projectId: result.firestore_project_id || '',
          apiKey: result.firestore_api_key || '',
          authDomain: result.firestore_auth_domain || '',
          collectionName: result.firestore_collection_name || 'watchmarker_videos',
          useEmulator: result.firestore_use_emulator || false
        }
      });
    } catch (error) {
      console.error("Error loading Firestore config:", error);
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
      console.log("Manual history synchronization requested");
      
      // Debug: Check extension initialization status
      console.log("Extension initialization status:", {
        isInitialized: this.isInitialized,
        databaseAvailable: !!globalThis.Database,
        databaseInitialized: globalThis.Database?.isInitialized
      });
      
      // Check if extension is fully initialized
      if (!this.isInitialized) {
        throw new Error("Extension not fully initialized");
      }
      
      // Check if database is available
      if (!globalThis.Database || !globalThis.Database.isInitialized) {
        throw new Error("Database not initialized");
      }
      
      const response = await this.syncHistory();
      console.log("Manual history synchronization completed successfully");
      
      // Update timestamp in sync storage
      await new Promise((resolve) => {
        chrome.storage.sync.set({ historyTimestamp: Date.now() }, resolve);
      });
      
      // Extract video count from response if available
      let videoCount = 0;
      if (response && response.videoCount !== undefined) {
        videoCount = response.videoCount;
      } else if (response && response.objVideos && response.objVideos.length) {
        videoCount = response.objVideos.length;
      }
      
      callback({ success: true, response: response, videoCount: videoCount });
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
      
      // Update timestamp in sync storage
      await new Promise((resolve) => {
        chrome.storage.sync.set({ youtubeWatchHistoryTimestamp: Date.now() }, resolve);
      });
      
      callback({ success: true, response: response });
    } catch (error) {
      console.error("Error synchronizing YouTube:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Synchronize YouTube Liked Videos action for options page
   * @param {Function} callback - Response callback
   */
  async synchronizeLikedVideosAction(callback) {
    try {
      const response = await this.syncLikedVideos();
      
      // Update timestamp in sync storage (separate from regular YouTube sync)
      await new Promise((resolve) => {
        chrome.storage.sync.set({ youtubeLikedTimestamp: Date.now() }, resolve);
      });
      
      callback({ success: true, response: response, videoCount: response?.videoCount || 0 });
    } catch (error) {
      console.error("Error synchronizing liked videos:", error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Initialize provider factory
   */
  async initializeProviderFactory() {
    try {
      // Set the database manager reference
      this.providerFactory.setDatabaseManager(Database);
      
      // Set the provider factory reference in database manager for notifications
      Database.providerFactory = this.providerFactory;
      
      // Initialize the factory
      const success = await this.providerFactory.init();
      if (success) {
        console.log('Database provider factory initialized successfully');
      } else {
        throw new Error('Failed to initialize database provider factory');
      }
    } catch (error) {
      console.error('Failed to initialize provider factory:', error);
      throw error;
    }
  }

  /**
   * Get database provider status
   * @param {Function} callback - Response callback
   */
  async getDatabaseProviderStatus(callback) {
    try {
      const status = this.providerFactory.getProviderStatus();
      callback({ success: true, status });
    } catch (error) {
      console.error('Failed to get provider status:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Switch database provider
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async switchDatabaseProvider(request, callback) {
    try {
      const { provider } = request;
      
      if (!provider || !['indexeddb', 'supabase'].includes(provider)) {
        callback({ success: false, error: 'Invalid provider type' });
        return;
      }

      if (provider === 'indexeddb') {
        const success = await this.providerFactory.switchToIndexedDB();
        if (success) {
          callback({ success: true, message: `Successfully switched to ${provider}` });
        } else {
          callback({ success: false, error: `Failed to switch to ${provider}` });
        }
      } else if (provider === 'supabase') {
        // Supabase switching can throw detailed error messages
        await this.providerFactory.switchToSupabase();
        callback({ success: true, message: `Successfully switched to ${provider}` });
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Get available providers
   * @param {Function} callback - Response callback
   */
  async getAvailableProviders(callback) {
    try {
      const providers = await this.providerFactory.getAvailableProviders();
      callback({ success: true, providers });
    } catch (error) {
      console.error('Failed to get available providers:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Migrate data between providers
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async migrateDatabaseProviders(request, callback) {
    try {
      const { fromProvider, toProvider } = request;
      
      if (!fromProvider || !toProvider) {
        callback({ success: false, error: 'Missing source or target provider' });
        return;
      }

      const success = await this.providerFactory.migrateData(fromProvider, toProvider);
      if (success) {
        callback({ success: true, message: `Successfully migrated data from ${fromProvider} to ${toProvider}` });
      } else {
        callback({ success: false, error: 'Migration failed' });
      }
    } catch (error) {
      console.error('Failed to migrate data:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Sync data between providers (bidirectional)
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async syncDatabaseProviders(request, callback) {
    try {
      const { providers } = request;
      
      if (!providers || !Array.isArray(providers) || providers.length !== 2) {
        callback({ success: false, error: 'Invalid providers array' });
        return;
      }

      const success = await this.providerFactory.syncProviders(providers[0], providers[1]);
      if (success) {
        callback({ success: true, message: `Successfully synced data between ${providers[0]} and ${providers[1]}` });
      } else {
        callback({ success: false, error: 'Sync failed' });
      }
    } catch (error) {
      console.error('Failed to sync providers:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Configure Supabase
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async configureSupabase(request, callback) {
    try {
      const { credentials } = request;
      
      if (!credentials) {
        callback({ success: false, error: 'No credentials provided' });
        return;
      }

      await credentialStorage.storeCredentials(credentials);
      callback({ success: true, message: 'Supabase configuration saved successfully' });
    } catch (error) {
      console.error('Failed to configure Supabase:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Test Supabase connection
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async testSupabaseConnection(request, callback) {
    try {
      const success = await credentialStorage.testConnection();
      if (success) {
        callback({ success: true, message: 'Supabase connection test successful' });
      } else {
        callback({ success: false, error: 'Supabase connection test failed' });
      }
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Clear Supabase configuration
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async clearSupabaseConfiguration(request, callback) {
    try {
      await credentialStorage.clearCredentials();
      callback({ success: true, message: 'Supabase configuration cleared successfully' });
    } catch (error) {
      console.error('Failed to clear Supabase configuration:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Get masked Supabase credentials
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async getSupabaseCredentials(request, callback) {
    try {
      const credentials = await credentialStorage.getMaskedCredentials();
      callback({ success: true, credentials });
    } catch (error) {
      console.error('Failed to get Supabase credentials:', error);
      callback({ success: false, error: error.message });
    }
  }

  /**
   * Get Supabase credential status
   * @param {Object} request - Request object
   * @param {Function} callback - Response callback
   */
  async getSupabaseStatus(request, callback) {
    try {
      const status = await credentialStorage.getCredentialStatus();
      callback({ success: true, status });
    } catch (error) {
      console.error('Failed to get Supabase status:', error);
      callback({ success: false, error: error.message });
    }
  }
}

// Debug: Check if Database is available at startup
console.log("Database object at startup:", Database);
console.log("Database methods:", Database ? Object.getOwnPropertyNames(Database) : "Database not available");

// Initialize the extension manager
const extensionManager = new ExtensionManager();
