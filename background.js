"use strict";

// Ensure Firefox compatibility before any imports use chrome.* promises
import "./polyfill.js";

import {
  sendMessageToTab,
  createResponseCallback,
  getStorageAsync,
  setStorageAsync,
  getSyncStorageAsync,
  setSyncStorageAsync,
  setDefaultInSyncStorageIfNull,
  isValidVideoTitle,
  decodeHtmlEntitiesAndFixEncoding
} from "./utils.js";

import { Database } from "./bg-database.js";
import { SyncManagerInstance } from "./bg-sync-manager.js";
import { History } from "./bg-history.js";
import { Youtube } from "./bg-youtube.js";
import { Search } from "./bg-search.js";
import { databaseProviderFactory } from "./database-provider-factory.js";
import { credentialStorage } from "./credential-storage.js";

/**
 * Extension background script manager
 */
class ExtensionManager {
  constructor() {
    this.titleCache = new Map();
    this.isInitialized = false;
    this.providerFactory = databaseProviderFactory;

    // Setup cleanup on service worker shutdown
    self.addEventListener('beforeunload', () => this.cleanup());

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

      // Migrate YouTube auto sync setting to YouTube History condition
      await this.migrateYouTubeAutoSyncSetting();

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

      // Setup enhanced alarm system
      this.initializeAlarmListener();
      await this.setupSynchronization();
      // Setup keep-alive alarm
      await this.setupKeepAliveAlarm();

      this.isInitialized = true;

      // Perform startup sync after initialization
      await this.performStartupSync();
    } catch (error) {
      console.error("Failed to initialize extension:", error);
      throw error;
    }
  }

  /**
   * Cleanup resources when extension shuts down
   */
  cleanup() {
    try {
      // Cleanup active Supabase connections
      const currentProvider = this.providerFactory.getCurrentProvider();
      if (currentProvider && typeof currentProvider.cleanup === 'function') {
        currentProvider.cleanup();
      }

      console.log("Extension cleanup completed");
    } catch (error) {
      console.error("Error during cleanup:", error);
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
          // Set Database in globalThis so it's available to utils and other modules
          globalThis.Database = Database;
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
      const stylesheetSettings = [{
        key: "stylesheet_Fadeout",
        defaultValue: ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image, .youwatch-mark img.ytCoreImageHost { opacity:0.3; }",
      },
      {
        key: "stylesheet_Grayout",
        defaultValue: ".youwatch-mark yt-img-shadow img, .youwatch-mark yt-image img, .youwatch-mark .ytp-videowall-still-image, .youwatch-mark img.yt-core-image, .youwatch-mark img.ytCoreImageHost { filter:grayscale(1.0); }",
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

    } catch (error) {
      console.error("Failed to initialize settings:", error);
      throw error;
    }
  }

  /**
   * Migrate YouTube auto sync setting to YouTube History condition
   */
  async migrateYouTubeAutoSyncSetting() {
    try {
      const youtubeAutoSyncEnabled = await getSyncStorageAsync('youtube_auto_sync_enabled');
      if (youtubeAutoSyncEnabled === true) {
        // Enable YouTube History condition if it's not already set
        const currentYouHistCondition = await getSyncStorageAsync('idCondition_Youhist');
        if (currentYouHistCondition === undefined || currentYouHistCondition === null) {
          await chrome.storage.sync.set({ 'idCondition_Youhist': true });
          console.log("Migrated youtube_auto_sync_enabled to idCondition_Youhist");
        }

        // Remove the old setting
        await chrome.storage.sync.remove('youtube_auto_sync_enabled');
        console.log("Removed old youtube_auto_sync_enabled setting");
      }
    } catch (error) {
      console.error("Error migrating YouTube auto sync setting:", error);
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
   * Process video chunks sequentially to avoid memory issues
   * @param {Array} videoData - Array of video objects to import
   * @param {number} chunkSize - Size of each chunk
   * @param {number} currentIndex - Current processing index
   * @param {number} totalProcessed - Total videos processed so far
   * @param {number} totalVideos - Total number of videos
   * @returns {Promise<number>} Promise that resolves with total processed count
   */
  processChunksSequentially(videoData, chunkSize, currentIndex, totalProcessed, totalVideos) {
    return new Promise((resolve, reject) => {
      if (currentIndex >= totalVideos) {
        resolve(totalProcessed);
        return;
      }

      const chunk = videoData.slice(currentIndex, currentIndex + chunkSize);
      const chunkData = { data: chunk };
      const chunkNumber = Math.floor(currentIndex / chunkSize) + 1;
      const totalChunks = Math.ceil(totalVideos / chunkSize);

      console.log(`Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} videos)`);

      Database.import({ data: chunkData }, (response) => {
        if (response && response.success) {
          const newProcessed = totalProcessed + chunk.length;
          const progressPercent = Math.round((newProcessed / totalVideos) * 100);
          console.log(`Chunk processed successfully. Total: ${newProcessed}/${totalVideos} (${progressPercent}%)`);

          // Small delay before processing next chunk
          setTimeout(() => {
            // Hint for garbage collection after every 5 chunks
            if (chunkNumber % 5 === 0 && globalThis.gc) {
              try {
                globalThis.gc();
              } catch (e) {
                // GC not available, continue
              }
            }

            // Process next chunk
            this.processChunksSequentially(videoData, chunkSize, currentIndex + chunkSize, newProcessed, totalVideos)
              .then(resolve)
              .catch(reject);
          }, 150);
        } else {
          reject(new Error(response?.error || `Failed to import chunk ${chunkNumber}`));
        }
      });
    });
  }

  /**
   * Setup message handler
   */
  setupMessageHandler() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        const { action, videoId, title, query, data } = request;

        const responseHandler = (response) => {
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
            console.log("Database import started via standard Chrome API");
            try {
              let parsedData;
              let rawData = req.data;

              // Try to handle base64 encoded old database format first
              if (ExtensionManager.isValidBase64(rawData)) {
                try {
                  const decodedData = atob(rawData);
                  rawData = decodedData;
                  console.log("Successfully decoded base64 database format");
                } catch (base64Error) {
                  console.warn("Base64 decoding failed:", base64Error);
                  // Continue with original data
                }
              }

              // Parse as JSON
              try {
                parsedData = JSON.parse(rawData);
              } catch (jsonError) {
                console.error("Failed to parse database as JSON:", jsonError);
                res({ success: false, error: "Invalid database format. Please ensure the file contains valid JSON data or is a base64-encoded database export from an older version." });
                return;
              }

              // Handle legacy DB format - if parsedData is an array, wrap it in the new format
              if (Array.isArray(parsedData)) {
                // Also handle field mapping for legacy formats
                const mappedData = parsedData.map(video => {
                  const mappedVideo = { ...video };

                  // Handle legacy timestamp field names
                  if (mappedVideo.longTimestamp && !mappedVideo.intTimestamp) {
                    mappedVideo.intTimestamp = mappedVideo.longTimestamp;
                    delete mappedVideo.longTimestamp;
                  }

                  // Ensure required fields exist with defaults
                  mappedVideo.intTimestamp = mappedVideo.intTimestamp || Date.now();
                  mappedVideo.intCount = mappedVideo.intCount || 1;
                  mappedVideo.strTitle = mappedVideo.strTitle || "";

                  return mappedVideo;
                });

                parsedData = { data: mappedData };
              }

              // Check if we have a large dataset that needs chunked processing
              const videoData = parsedData.data || [];
              let chunkSize = 1000; // Default chunk size

              // Adjust chunk size based on dataset size for better performance
              if (videoData.length > 50000) {
                chunkSize = 500; // Smaller chunks for very large datasets
              } else if (videoData.length > 10000) {
                chunkSize = 750; // Medium chunks for large datasets
              } else if (videoData.length > 5000) {
                chunkSize = 1000; // Standard chunks for moderate datasets
              }

              console.log(`Dataset size: ${videoData.length} videos, using chunk size: ${chunkSize}`);

              if (videoData.length > chunkSize) {
                console.log(`Large dataset detected (${videoData.length} videos), processing in chunks of ${chunkSize}`);

                // Process chunks using Promise chain instead of async/await
                this.processChunksSequentially(videoData, chunkSize, 0, 0, videoData.length)
                  .then(totalProcessed => {
                    const successMessage = `Successfully imported ${totalProcessed} videos in ${Math.ceil(videoData.length / chunkSize)} chunks`;
                    console.log("Chunked import completed:", successMessage);
                    res({
                      success: true,
                      message: successMessage
                    });
                  })
                  .catch(error => {
                    console.error("Chunked import failed:", error);
                    res({ success: false, error: `Chunked import failed: ${error.message}` });
                  });
              } else {
                // For smaller datasets, use the original single-pass import
                Database.import({ data: parsedData }, (response) => {
                  if (response && response.success) {
                    console.log("Single-pass import completed:", response.message);
                    res({ success: true, message: response.message });
                  } else {
                    res({ success: false, error: response?.error || "Import failed" });
                  }
                });
              }
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
          "supabase-check-table": async (req, res) => {
            try {
              const currentProvider = this.providerFactory.getCurrentProvider();
              if (!currentProvider || !currentProvider.checkTableExists) {
                res({ success: false, error: 'Supabase provider not available' });
                return;
              }

              const exists = await currentProvider.checkTableExists();
              res({ success: true, tableExists: exists });
            } catch (error) {
              console.error("Error checking Supabase table:", error);
              res({ success: false, error: error.message });
            }
          },

          // Search actions
          "search-videos": (req, res) => {
            const page = req.page || 1;
            const pageSize = req.pageSize || 50;
            const query = req.query || '';

            // Check if database is ready
            if (!globalThis.Database || !globalThis.Database.isInitialized) {
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

          // YouTube auto sync actions - REMOVED: This is now handled by Watch Detection Conditions - YouTube History
          // "youtube-auto-sync-toggle": (req, res) => {
          //   this.toggleYouTubeAutoSync(req.enabled, res);
          // },

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


          // Sync Manager actions
          "sync-manager-start": async (req, res) => {
            try {
              await new Promise((resolve, reject) => {
                SyncManagerInstance.startAutoSync(req, (response) => {
                  if (response && response.success) {
                    resolve(response);
                  } else {
                    reject(new Error(response?.error || 'Failed to start sync manager'));
                  }
                });
              });
              res({ success: true });
            } catch (error) {
              console.error("Error starting sync manager:", error);
              res({ success: false, error: error.message });
            }
          },
          "sync-manager-stop": async (req, res) => {
            try {
              await new Promise((resolve, reject) => {
                SyncManagerInstance.stopAutoSync(req, (response) => {
                  if (response && response.success) {
                    resolve(response);
                  } else {
                    reject(new Error(response?.error || 'Failed to stop sync manager'));
                  }
                });
              });
              res({ success: true });
            } catch (error) {
              console.error("Error stopping sync manager:", error);
              res({ success: false, error: error.message });
            }
          },
          "sync-manager-sync-now": async (req, res) => {
            try {
              const result = await new Promise((resolve, reject) => {
                SyncManagerInstance.syncNow(req, (response) => {
                  if (response && response.success) {
                    resolve(response);
                  } else {
                    reject(new Error(response?.error || 'Sync failed'));
                  }
                });
              });
              res({ success: true, result: result.result });
            } catch (error) {
              console.error("Error performing sync now:", error);
              res({ success: false, error: error.message });
            }
          },
          "sync-manager-status": async (req, res) => {
            try {
              const status = await new Promise((resolve, reject) => {
                SyncManagerInstance.getStatus(req, (response) => {
                  if (response && response.success) {
                    resolve(response);
                  } else {
                    reject(new Error(response?.error || 'Failed to get sync status'));
                  }
                });
              });
              res({ success: true, status: status.status });
            } catch (error) {
              console.error("Error getting sync status:", error);
              res({ success: false, error: error.message });
            }
          }
        };

        const handler = actionHandlers[action];
        if (handler) {
          // Handle async functions properly
          const result = handler(request, responseHandler);
          if (result instanceof Promise) {
            // For async handlers, properly handle both success and error cases
            result
              .then(asyncResult => {
                // If the async function returns a result, send it
                if (asyncResult !== undefined) {
                  responseHandler(asyncResult);
                }
                // Note: if asyncResult is undefined, the handler should have called responseHandler directly
              })
              .catch(error => {
                console.error("Async handler error:", error);
                responseHandler({ success: false, error: error.message });
              });
          }
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

    // Setup port handler for long-lived connections
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "youtube-watchmarker") {

        // Add disconnect handler to properly clean up
        port.onDisconnect.addListener(() => {
          // Clear the runtime.lastError to prevent console warnings
          if (chrome.runtime.lastError) {
            console.log("Port disconnected due to back/forward cache or page navigation:", chrome.runtime.lastError.message);
          }
        });

        port.onMessage.addListener((message) => {
          try {
            const { action, videoId, title } = message;

            // Handle the same actions as regular messages
            if (action === "youtube-lookup") {
              const messageRequest = { strIdent: videoId, strTitle: title };
              if (title) {
                this.titleCache.set(videoId, title);
              }

              Youtube.lookup(messageRequest, (response) => {
                try {
                  if (port && !port.disconnected) {
                    port.postMessage(response);
                  }
                } catch (error) {
                  // Ignore port communication errors (page might be in back/forward cache)
                  if (error.message && !error.message.includes("Receiving end does not exist")) {
                    console.warn("Error sending port message:", error);
                  }
                }
              });
            } else if (action === "youtube-ensure") {
              const messageRequest = { strIdent: videoId, strTitle: title };
              if (title) {
                this.titleCache.set(videoId, title);
              }

              Youtube.ensure(messageRequest, (response) => {
                try {
                  if (port && !port.disconnected) {
                    port.postMessage(response);
                  }
                } catch (error) {
                  // Ignore port communication errors (page might be in back/forward cache)
                  if (error.message && !error.message.includes("Receiving end does not exist")) {
                    console.warn("Error sending port message:", error);
                  }
                }
              });
            }
          } catch (error) {
            console.error("Error handling port message:", error);
          }
        });

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

        const shouldTrackNavigation = await getSyncStorageAsync('idCondition_Brownav') === true;

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

    // Normalize encoding to avoid mojibake before validation and saving
    title = decodeHtmlEntitiesAndFixEncoding(title);

    // Don't save videos with generic or invalid titles
    if (!isValidVideoTitle(title)) {
      console.debug("Skipping video with invalid/generic title:", title);

      // Schedule a retry to get a better title after the page loads
      setTimeout(async () => {
        try {
          const updatedTab = await chrome.tabs.get(tabId);
          if (updatedTab && this.isYouTubeVideoUrl(updatedTab.url) && updatedTab.title) {
            let retryTitle = updatedTab.title;
            if (retryTitle.endsWith(" - YouTube")) {
              retryTitle = retryTitle.slice(0, -10);
            }
            // Normalize encoding on retry as well
            retryTitle = decodeHtmlEntitiesAndFixEncoding(retryTitle);

            // Only proceed if we now have a valid title
            if (isValidVideoTitle(retryTitle)) {
              console.debug("Retry successful, got valid title:", retryTitle);
              const videoId = updatedTab.url.split("&")[0].slice(-11);
              await this.markVideoAsWatched(videoId, retryTitle);
              await this.notifyYouTubeTabs(videoId, retryTitle);
            } else {
              console.debug("Retry still has invalid title:", retryTitle);
            }
          }
        } catch (error) {
          console.debug("Tab retry failed (tab may have been closed):", error.message);
        }
      }, 2000); // Wait 2 seconds for the page to load properly

      return;
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
      Youtube.mark({ strIdent: videoId, strTitle: title },
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
      chrome.tabs.query({ url: "*://*.youtube.com/*" },
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
        (details) => this.handleProgressRequest(details), { urls: ["https://www.youtube.com/api/stats/watchtime*"] }
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
      try {
        Youtube.ensure({ strIdent: videoId, strTitle: title },
          (response) => {
            if (response) {
              console.debug("Video ensured:", videoId);
              resolve(response);
            } else {
              console.error("Youtube.ensure returned null response for:", videoId, title);
              reject(new Error("Failed to ensure video"));
            }
          }
        );
      } catch (error) {
        console.error("Error in Youtube.ensure call:", error);
        reject(error);
      }
    });
  }

  /**
   * Setup periodic synchronization with enhanced reliability (Chrome 123+)
   * @param {Object} args - Arguments
   * @param {Function} callback - Callback function
   */
  async setupSynchronization() {
    try {
      // Clear any existing alarms to prevent duplicates
      await chrome.alarms.clear("synchronize");

      // Get sync interval from settings - default to 60 minutes (1 hour)
      const syncInterval = await getSyncStorageAsync('sync_interval_minutes') || 60;

      // Create alarm with minimum 30 seconds (Chrome 120+)
      const periodInMinutes = Math.max(syncInterval, 0.5);

      console.log(`Setting up synchronization alarm with ${periodInMinutes} minute interval`);

      await chrome.alarms.create("synchronize", {
        periodInMinutes: periodInMinutes,
        // Chrome 123+: Alarms now run when device is asleep
        // No additional configuration needed - this is automatic
      });

      // Verify alarm was created
      const alarm = await chrome.alarms.get("synchronize");
      if (!alarm) {
        throw new Error('Failed to create synchronization alarm');
      }

      console.log('Synchronization alarm created successfully:', alarm);

    } catch (error) {
      console.error('Error setting up synchronization alarm:', error);
      // Fallback: try again in 5 minutes
      setTimeout(() => this.setupSynchronization(), 5 * 60 * 1000);
    }
  }

  /**
   * Setup keep-alive alarm to prevent service worker termination
   */
  async setupKeepAliveAlarm() {
    try {
      // Clear any existing keep-alive alarm
      await chrome.alarms.clear("keep-alive");

      // Create alarm that runs every 4 minutes (under 5-min idle limit)
      await chrome.alarms.create("keep-alive", {
        periodInMinutes: 4
      });

      console.log("Keep-alive alarm set up successfully");
    } catch (error) {
      console.error("Failed to set up keep-alive alarm:", error);
    }
  }

  /**
   * Initialize alarm listener with enhanced error handling
   */
  initializeAlarmListener() {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      try {
        if (alarm.name === "synchronize") {
          await this.performSynchronization();
        } else if (alarm.name === "keep-alive") {
          // Minimal operation to keep worker alive - e.g., log or check storage
          console.log("Keep-alive ping:", new Date().toISOString());
          // Optional: Perform a small storage read to ensure activity
          await chrome.storage.local.get("lastKeepAlive");
          await chrome.storage.local.set({ lastKeepAlive: Date.now() });
        }
      } catch (error) {
        console.error(`Error handling alarm ${alarm.name}:`, error);

        // Log alarm failure for debugging
        this.logAlarmFailure(alarm.name, error);
      }
    });
  }

  /**
   * Log alarm failure for debugging purposes
   * @param {string} alarmName - Name of the failed alarm
   * @param {Error} error - Error that occurred
   */
  async logAlarmFailure(alarmName, error) {
    try {
      const failureLog = {
        alarmName,
        error: error.message,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      };

      // Store in local storage for debugging
      const existingLogs = await getStorageAsync('alarm_failure_logs') || '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(failureLog);

      // Keep only last 10 failure logs
      if (logs.length > 10) {
        logs.splice(0, logs.length - 10);
      }

      await setStorageAsync('alarm_failure_logs', JSON.stringify(logs));
    } catch (logError) {
      console.error('Error logging alarm failure:', logError);
    }
  }

  /**
   * Get alarm failure logs for debugging
   * @returns {Promise<Array>} Array of alarm failure logs
   */
  async getAlarmFailureLogs() {
    try {
      const logs = await getStorageAsync('alarm_failure_logs') || '[]';
      return JSON.parse(logs);
    } catch (error) {
      console.error('Error getting alarm failure logs:', error);
      return [];
    }
  }

  /**
   * Clear alarm failure logs
   */
  async clearAlarmFailureLogs() {
    try {
      await setStorageAsync('alarm_failure_logs', '[]');
    } catch (error) {
      console.error('Error clearing alarm failure logs:', error);
    }
  }

  /**
   * Perform startup synchronization
   */
  async performStartupSync() {
    console.log("Starting startup synchronization...");

    try {
      // Check for YouTube history condition - sync on startup if enabled
      const shouldSyncYoutube = await new Promise((resolve) => {
        chrome.storage.sync.get(['idCondition_Youhist'], (result) => {
          resolve(result.idCondition_Youhist === true);
        });
      });

      // Sync YouTube if condition is enabled
      if (shouldSyncYoutube) {
        console.log("Syncing YouTube history on startup (YouTube History condition enabled)...");
        await this.syncYoutube();
      } else {
        console.log("YouTube history sync disabled - skipping startup sync");
      }

      console.log("Startup synchronization completed successfully");
    } catch (error) {
      console.error("Error during startup synchronization:", error);
    }
  }

  /**
   * Perform periodic synchronization with enhanced reliability
   */
  async performSynchronization() {
    console.log("Starting periodic synchronization...");

    try {
      const shouldSyncHistory = await new Promise((resolve) => {
        chrome.storage.sync.get(['idCondition_Browhist'], (result) => {
          resolve(result.idCondition_Browhist === true);
        });
      });

      if (shouldSyncHistory) {
        console.log("Syncing browser history...");
        await this.syncHistory();
      } else {
        console.log("Browser history sync disabled");
      }

      // Check for YouTube history condition - this now handles automatic YouTube sync
      const shouldSyncYoutube = await new Promise((resolve) => {
        chrome.storage.sync.get(['idCondition_Youhist'], (result) => {
          resolve(result.idCondition_Youhist === true);
        });
      });

      // Sync YouTube if condition is enabled
      if (shouldSyncYoutube) {
        console.log("Syncing YouTube history (YouTube History condition enabled)...");
        await this.syncYoutube();
      } else {
        console.log("YouTube history sync disabled");
      }

      console.log("Periodic synchronization completed successfully");
    } catch (error) {
      console.error("Error during synchronization:", error);
    }
  }

  /**
   * Synchronize browser history
   */
  async syncHistory(options) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Starting history sync (processing all history)");

        History.synchronize({ intTimestamp: 0, skipExisting: options?.skipExisting === true },
          (response) => {
            if (response === null) {
              console.error("History synchronization failed - null response");
              reject(new Error("History synchronization failed"));
            } else {
              console.log("History sync completed successfully:", response);
              resolve(response);
            }
          },
          (progress) => {
            console.log("History sync progress:", progress);
          }
        );
      } catch (error) {
        console.error("Error during history sync:", error);
        reject(error);
      }
    });
  }

  /**
   * Synchronize YouTube history
   */
  async syncYoutube() {
    return new Promise((resolve) => {
      console.log("Starting YouTube history sync...");

      Youtube.synchronize({ intThreshold: 512 },
        (response) => {
          console.log("YouTube sync completed:", response);
          resolve(response);
        },
        (progress) => {
          console.log("YouTube sync progress:", progress);
        }
      );
    });
  }

  /**
   * Synchronize YouTube Liked Videos
   */
  async syncLikedVideos() {
    return new Promise((resolve) => {
      Youtube.synchronizeLikedVideos({ intThreshold: 512 },
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
   * Sets a default value in sync storage if the key doesn't exist
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value to set
   * @returns {Promise<void>}
   */
  async setDefaultInSyncStorageIfNull(key, defaultValue) {
    return await setDefaultInSyncStorageIfNull(key, defaultValue);
  }

  /**
   * Get a setting value from sync storage
   * @param {string} key - Setting key
   * @param {Function} callback - Response callback
   */
  async getSetting(key, callback) {
    try {
      const result = await getSyncStorageAsync(key);
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
      await setSyncStorageAsync(key, value);
      callback({ success: true });
    } catch (error) {
      console.error("Error setting setting:", error);
      callback({ success: false, error: error.message });
    }
  }









  /**

  /**
   * Export database data for options page
   * @param {Function} callback - Response callback
   */
  async exportDatabaseData(callback) {
    try {
      // Check if extension is fully initialized
      if (!this.isInitialized) {
        callback({ success: false, error: "Extension not fully initialized. Please wait a moment and try again." });
        return;
      }

      // Wait for database initialization
      await this.waitForDatabaseInitialization(5000);

      // Get database connection
      const Database = globalThis.Database;

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
   * Wait for database initialization with timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<void>} Resolves when database is ready or rejects on timeout
   */
  async waitForDatabaseInitialization(timeoutMs = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (globalThis.Database && globalThis.Database.isInitialized) {
        return;
      }

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error("Database initialization timeout. Please refresh the page and try again.");
  }



  /**
   * Synchronize history action for options page
   * @param {Function} callback - Response callback
   */
  async synchronizeHistoryAction(callback) {
    try {
      // Check if extension is fully initialized
      if (!this.isInitialized) {
        throw new Error("Extension not fully initialized. Please wait a moment and try again.");
      }

      // Check if database is available - wait up to 5 seconds for initialization
      await this.waitForDatabaseInitialization(5000);

      const response = await this.syncHistory({ skipExisting: true });



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
      // Check if extension is fully initialized
      if (!this.isInitialized) {
        throw new Error("Extension not fully initialized. Please wait a moment and try again.");
      }

      // Check if database is available - wait up to 5 seconds for initialization
      await this.waitForDatabaseInitialization(5000);

      const response = await this.syncYoutube();



      // Extract video count from response if available
      let videoCount = 0;
      if (response && response.videoCount !== undefined) {
        videoCount = response.videoCount;
      } else if (response && response.objVideos && response.objVideos.length) {
        videoCount = response.objVideos.length;
      }

      callback({ success: true, response: response, videoCount: videoCount });
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
      // Check if extension is fully initialized
      if (!this.isInitialized) {
        throw new Error("Extension not fully initialized. Please wait a moment and try again.");
      }

      // Check if database is available - wait up to 5 seconds for initialization
      await this.waitForDatabaseInitialization(5000);

      const response = await this.syncLikedVideos();



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
      if (!success) {
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

  /**
   * Check if a string is valid base64
   * @param {string} str - String to check
   * @returns {boolean} True if valid base64
   */
  isValidBase64(str) {
    if (typeof str !== 'string' || str.length === 0) {
      return false;
    }

    // Base64 strings should only contain valid characters and proper padding
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

    // Check basic format
    if (!base64Regex.test(str)) {
      return false;
    }

    // Base64 strings should be divisible by 4 (with padding)
    if (str.length % 4 !== 0) {
      return false;
    }

    // Try to decode to verify it's actually valid base64
    try {
      const decoded = atob(str);
      // Additional check: decoded content should look like JSON (start with [ or {)
      const trimmed = decoded.trim();
      return trimmed.startsWith('[') || trimmed.startsWith('{');
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper function to check if string is valid base64 (static version)
   * @param {string} str - String to check  
   * @returns {boolean} True if valid base64
   */
  static isValidBase64(str) {
    if (typeof str !== 'string' || str.length === 0) {
      return false;
    }

    // Base64 strings should only contain valid characters and proper padding
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

    // Check basic format
    if (!base64Regex.test(str)) {
      return false;
    }

    // Base64 strings should be divisible by 4 (with padding)  
    if (str.length % 4 !== 0) {
      return false;
    }

    // Try to decode to verify it's actually valid base64
    try {
      const decoded = atob(str);
      // Additional check: decoded content should look like JSON (start with [ or {)
      const trimmed = decoded.trim();
      return trimmed.startsWith('[') || trimmed.startsWith('{');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if extension has file URL access permission (Chrome 118+)
   * @returns {Promise<boolean>} True if file URL access is allowed
   */
  async checkFileUrlAccess() {
    try {
      return await chrome.extension.isAllowedFileSchemeAccess();
    } catch (error) {
      console.error('Error checking file URL access:', error);
      return false;
    }
  }

  /**
   * Safely open file URL with permission check
   * @param {string} fileUrl - File URL to open
   * @param {Object} options - Options for opening the URL
   * @returns {Promise<boolean>} True if successfully opened
   */
  async safeOpenFileUrl(fileUrl, options = {}) {
    try {
      if (!fileUrl.startsWith('file://')) {
        // Not a file URL, proceed normally
        if (options.newTab) {
          await chrome.tabs.create({ url: fileUrl });
        } else {
          await chrome.tabs.update({ url: fileUrl });
        }
        return true;
      }

      // Check file URL access permission
      const hasFileAccess = await this.checkFileUrlAccess();

      if (!hasFileAccess) {
        console.warn('File URL access not permitted. Enable "Allow access to file URLs" in chrome://extensions');
        // Optionally show a notification to the user
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'content/icon.png',
            title: 'File Access Required',
            message: 'Please enable "Allow access to file URLs" in chrome://extensions to access local files.'
          });
        }
        return false;
      }

      // Permission granted, open the file URL
      if (options.newTab) {
        await chrome.tabs.create({ url: fileUrl });
      } else {
        await chrome.tabs.update({ url: fileUrl });
      }
      return true;
    } catch (error) {
      console.error('Error opening file URL:', error);
      return false;
    }
  }
}

// Initialize the extension manager
const extensionManager = new ExtensionManager();

// Make extensionManager globally available for other modules
globalThis.extensionManager = extensionManager;

// Listen for service worker startup to reinitialize
chrome.runtime.onStartup.addListener(() => {
  console.log("Service worker restarted - reinitializing...");
  extensionManager.init().then(() => {
    // Perform startup sync after initialization
    return extensionManager.performStartupSync();
  }).catch(error => {
    console.error("Reinitialization failed:", error);
  });
});
