import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
} from "./utils.js";

/**
 * Database management class for YouTube watch history
 */
export class DatabaseManager {
  constructor() {
    this.database = null;
    this.DB_NAME = "Database";
    this.DB_VERSION = 401;
    this.STORE_NAME = "storeDatabase";
    this.isInitialized = false;
    this.syncManager = new SyncManager();
  }

  /**
   * Initialize the database
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async init(request, response) {
    console.log("DatabaseManager.init called");
    
    if (this.isInitialized) {
      console.log("Database already initialized");
      response({});
      return;
    }
    
    try {
      await AsyncSeries.run(
        {
          openDatabase: this.openDatabase.bind(this),
          initSync: async (args, callback) => {
            await this.syncManager.init();
            callback({});
          },
          setupMessaging: BackgroundUtils.messaging('database', {
            'database-export': this.export.bind(this),
            'database-import': this.import.bind(this),
            'database-reset': this.reset.bind(this),
            'database-sync-enable': this.enableSync.bind(this),
            'database-sync-disable': this.disableSync.bind(this),
            'database-sync-now': this.syncNow.bind(this),
            'database-sync-status': this.getSyncStatus.bind(this)
          }),
        },
        createResponseCallback(() => {
          this.isInitialized = true;
          console.log("Database initialization completed");
          return {};
        }, response)
      );
    } catch (error) {
      console.error("Failed to initialize database:", error);
      response(null);
    }
  }

  /**
   * Opens the IndexedDB database
   * @param {Object} args - Arguments object
   * @param {Function} callback - Callback function
   */
  openDatabase(args, callback) {
    const openRequest = indexedDB.open(this.DB_NAME, this.DB_VERSION);

    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      let store = null;

      if (db.objectStoreNames.contains(this.STORE_NAME)) {
        store = openRequest.transaction.objectStore(this.STORE_NAME);
      } else {
        store = db.createObjectStore(this.STORE_NAME, {
          keyPath: "strIdent",
        });
      }

      // Create indexes if they don't exist
      if (!store.indexNames.contains("strIdent")) {
        store.createIndex("strIdent", "strIdent", { unique: true });
      }

      if (!store.indexNames.contains("intTimestamp")) {
        store.createIndex("intTimestamp", "intTimestamp", { unique: false });
      }

      // Remove legacy index if it exists
      if (store.indexNames.contains("longTimestamp")) {
        store.deleteIndex("longTimestamp");
      }
    };

    openRequest.onerror = () => {
      console.error("Failed to open database:", openRequest.error);
      this.database = null;
      callback(null);
    };

    openRequest.onsuccess = () => {
      this.database = openRequest.result;
      console.log("Database opened successfully");
      callback({});
    };
  }

  /**
   * Gets the database object store for transactions
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
   * @returns {IDBObjectStore} The database object store
   */
  getObjectStore(mode = "readwrite") {
    if (!this.database) {
      throw new Error("Database not initialized");
    }
    return this.database
      .transaction([this.STORE_NAME], mode)
      .objectStore(this.STORE_NAME);
  }

  /**
   * Exports the database to a downloadable file
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   * @param {Function} progress - Progress callback
   */
  export(request, response, progress) {
    AsyncSeries.run(
      {
        objDatabase: (args, callback) => {
          if (!this.database) {
            throw new Error("Database not initialized");
          }
          callback(this.getObjectStore("readonly"));
        },
        getData: this.getAllData.bind(this),
        downloadFile: this.createDownloadFile.bind(this),
        updateTimestamp: BackgroundUtils.time("extensions.Youwatch.Database.intTimestamp"),
      },
      createResponseCallback(() => ({}), response)
    );
  }

  /**
   * Gets all data from the database
   * @param {Object} args - Arguments object
   * @param {Function} callback - Callback function
   */
  getAllData(args, callback) {
    const query = args.objDatabase.getAll();
    
    query.onsuccess = () => {
      callback({ exportData: query.result });
    };
    
    query.onerror = () => {
      console.error("Failed to get all data:", query.error);
      callback(null);
    };
  }

  /**
   * Creates and downloads the database file
   * @param {Object} args - Arguments object
   * @param {Function} callback - Callback function
   */
  createDownloadFile(args, callback) {
    const dataString = JSON.stringify(args.exportData);
    const blob = new Blob([dataString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `youwatch-database-${timestamp}.database`;

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download failed:", chrome.runtime.lastError);
        callback(null);
      } else {
        console.log("Database exported successfully");
        callback({});
      }
    });
  }

  /**
   * Imports database from uploaded file
   * @param {Object} request - Request object containing video data
   * @param {Function} response - Response callback
   * @param {Function} progress - Progress callback
   */
  import(request, response, progress) {
    AsyncSeries.run(
      {
        objVideos: (args, callback) => callback(request.objVideos),
        objDatabase: (args, callback) => {
          if (!this.database) {
            throw new Error("Database not initialized");
          }
          callback(this.getObjectStore());
        },
        objVideo: BackgroundUtils.video(),
        objGet: BackgroundUtils.get(progress),
        objPut: BackgroundUtils.put(),
        "objVideo-Next": BackgroundUtils.videoNext(),
        objCount: BackgroundUtils.count(),
      },
      createResponseCallback(() => ({}), response)
    );
  }

  /**
   * Resets the database by clearing all data
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  reset(request, response) {
    AsyncSeries.run(
      {
        objDatabase: (args, callback) => {
          if (!this.database) {
            throw new Error("Database not initialized");
          }
          callback(this.getObjectStore());
        },
        clearData: this.clearAllData.bind(this),
        objCount: BackgroundUtils.count(),
      },
      createResponseCallback(() => ({}), response)
    );
  }

  /**
   * Clears all data from the database
   * @param {Object} args - Arguments object
   * @param {Function} callback - Callback function
   */
  clearAllData(args, callback) {
    const query = args.objDatabase.clear();
    
    query.onsuccess = () => {
      console.log("Database cleared successfully");
      callback({});
    };
    
    query.onerror = () => {
      console.error("Failed to clear database:", query.error);
      callback(null);
    };
  }

  /**
   * Enable sync with specified provider
   * @param {Object} request - Request object with provider info
   * @param {Function} response - Response callback
   */
  async enableSync(request, response) {
    try {
      await this.syncManager.enableSync(request.provider);
      console.log(`Sync enabled with provider: ${request.provider}`);
      response({ success: true });
    } catch (error) {
      console.error("Failed to enable sync:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Disable sync
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async disableSync(request, response) {
    try {
      await this.syncManager.disableSync();
      console.log("Sync disabled");
      response({ success: true });
    } catch (error) {
      console.error("Failed to disable sync:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Trigger manual sync
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async syncNow(request, response) {
    try {
      if (!this.syncManager.isEnabled) {
        response({ success: false, error: "Sync is not enabled" });
        return;
      }

      // Get current database data
      const store = this.getObjectStore("readonly");
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = async () => {
        try {
          const localData = getAllRequest.result;
          
          // Sync to remote
          await this.syncManager.syncToRemote(localData);
          
          // Sync from remote and merge
          const remoteData = await this.syncManager.syncFromRemote();
          if (remoteData && remoteData.length > 0) {
            const mergedData = this.syncManager.mergeData(localData, remoteData);
            
            // Update local database with merged data
            await this.updateDatabaseWithMergedData(mergedData);
          }
          
          console.log("Manual sync completed successfully");
          response({ success: true, message: "Sync completed successfully" });
        } catch (error) {
          console.error("Manual sync failed:", error);
          response({ success: false, error: error.message });
        }
      };
      
      getAllRequest.onerror = () => {
        console.error("Failed to get local data for sync:", getAllRequest.error);
        response({ success: false, error: "Failed to access local database" });
      };
    } catch (error) {
      console.error("Sync operation failed:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Update database with merged data
   * @param {Array} mergedData - Merged data to update
   */
  async updateDatabaseWithMergedData(mergedData) {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore("readwrite");
      const transaction = store.transaction;
      
      // Clear existing data
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add merged data
        let completed = 0;
        const total = mergedData.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        mergedData.forEach(item => {
          const putRequest = store.put(item);
          
          putRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          
          putRequest.onerror = () => {
            reject(putRequest.error);
          };
        });
      };
      
      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };
    });
  }

  /**
   * Get sync status
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async getSyncStatus(request, response) {
    try {
      const status = {
        isEnabled: this.syncManager.isEnabled,
        provider: this.syncManager.syncProvider,
        lastSync: this.syncManager.lastSyncTimestamp
      };
      response({ success: true, status });
    } catch (error) {
      console.error("Failed to get sync status:", error);
      response({ success: false, error: error.message });
    }
  }
}

/**
 * Sync manager for remote storage capabilities
 */
export class SyncManager {
  constructor() {
    this.isEnabled = false;
    this.lastSyncTimestamp = 0;
    this.syncProvider = null; // 'chrome', 'googledrive', 'custom'
  }

  /**
   * Initialize sync manager
   */
  async init() {
    // Load sync settings from storage
    const settings = await chrome.storage.local.get([
      'sync_enabled',
      'sync_provider',
      'last_sync_timestamp'
    ]);
    
    this.isEnabled = settings.sync_enabled || false;
    this.syncProvider = settings.sync_provider || null;
    this.lastSyncTimestamp = settings.last_sync_timestamp || 0;
  }

  /**
   * Enable sync with specified provider
   * @param {string} provider - Sync provider ('chrome', 'googledrive', 'custom')
   */
  async enableSync(provider) {
    this.syncProvider = provider;
    this.isEnabled = true;
    
    await chrome.storage.local.set({
      sync_enabled: true,
      sync_provider: provider
    });
  }

  /**
   * Disable sync
   */
  async disableSync() {
    this.isEnabled = false;
    this.syncProvider = null;
    
    await chrome.storage.local.set({
      sync_enabled: false,
      sync_provider: null
    });
  }

  /**
   * Sync data to remote storage
   * @param {Array} data - Database data to sync
   */
  async syncToRemote(data) {
    if (!this.isEnabled || !this.syncProvider) return;

    try {
      switch (this.syncProvider) {
        case 'chrome':
          await this.syncToChrome(data);
          break;
        case 'googledrive':
          await this.syncToGoogleDrive(data);
          break;
        case 'custom':
          await this.syncToCustomBackend(data);
          break;
        default:
          console.warn('Unknown sync provider:', this.syncProvider);
      }
      
      this.lastSyncTimestamp = Date.now();
      await chrome.storage.local.set({
        last_sync_timestamp: this.lastSyncTimestamp
      });
    } catch (error) {
      console.error('Sync to remote failed:', error);
      throw error;
    }
  }

  /**
   * Sync from remote storage
   */
  async syncFromRemote() {
    if (!this.isEnabled || !this.syncProvider) return null;

    try {
      switch (this.syncProvider) {
        case 'chrome':
          return await this.syncFromChrome();
        case 'googledrive':
          return await this.syncFromGoogleDrive();
        case 'custom':
          return await this.syncFromCustomBackend();
        default:
          console.warn('Unknown sync provider:', this.syncProvider);
          return null;
      }
    } catch (error) {
      console.error('Sync from remote failed:', error);
      throw error;
    }
  }

  /**
   * Chrome Storage Sync implementation
   */
  async syncToChrome(data) {
    // Chrome storage has size limits, so we need to chunk the data
    const chunks = this.chunkData(data, 7000); // Stay under 8KB limit per item
    const syncData = {
      'watchHistory_metadata': {
        chunks: chunks.length,
        lastSync: Date.now(),
        version: 1
      }
    };

    // Add chunked data
    chunks.forEach((chunk, index) => {
      syncData[`watchHistory_${index}`] = chunk;
    });

    await chrome.storage.sync.set(syncData);
  }

  async syncFromChrome() {
    const metadata = await chrome.storage.sync.get('watchHistory_metadata');
    if (!metadata.watchHistory_metadata) return null;

    const { chunks } = metadata.watchHistory_metadata;
    const chunkKeys = Array.from({ length: chunks }, (_, i) => `watchHistory_${i}`);
    const chunkData = await chrome.storage.sync.get(chunkKeys);

    // Reconstruct data from chunks
    const reconstructedData = [];
    for (let i = 0; i < chunks; i++) {
      const chunk = chunkData[`watchHistory_${i}`];
      if (chunk) {
        reconstructedData.push(...chunk);
      }
    }

    return reconstructedData;
  }

  /**
   * Google Drive sync implementation (placeholder)
   */
  async syncToGoogleDrive(data) {
    // TODO: Implement Google Drive API integration
    console.log('Google Drive sync not yet implemented');
    throw new Error('Google Drive sync not yet implemented');
  }

  async syncFromGoogleDrive() {
    // TODO: Implement Google Drive API integration
    console.log('Google Drive sync not yet implemented');
    throw new Error('Google Drive sync not yet implemented');
  }

  /**
   * Custom backend sync implementation (placeholder)
   */
  async syncToCustomBackend(data) {
    // TODO: Implement custom backend API
    console.log('Custom backend sync not yet implemented');
    throw new Error('Custom backend sync not yet implemented');
  }

  async syncFromCustomBackend() {
    // TODO: Implement custom backend API
    console.log('Custom backend sync not yet implemented');
    throw new Error('Custom backend sync not yet implemented');
  }

  /**
   * Chunk data into smaller pieces for storage limits
   * @param {Array} data - Data to chunk
   * @param {number} maxSize - Maximum size per chunk (in items)
   */
  chunkData(data, maxSize) {
    const chunks = [];
    for (let i = 0; i < data.length; i += maxSize) {
      chunks.push(data.slice(i, i + maxSize));
    }
    return chunks;
  }

  /**
   * Merge remote and local data intelligently
   * @param {Array} localData - Local database data
   * @param {Array} remoteData - Remote database data
   */
  mergeData(localData, remoteData) {
    const merged = new Map();
    
    // Add local data
    localData.forEach(item => {
      merged.set(item.strIdent, item);
    });

    // Merge remote data, keeping most recent timestamps and highest counts
    remoteData.forEach(remoteItem => {
      const localItem = merged.get(remoteItem.strIdent);
      if (!localItem) {
        merged.set(remoteItem.strIdent, remoteItem);
      } else {
        // Merge with preference for most recent data
        merged.set(remoteItem.strIdent, {
          strIdent: remoteItem.strIdent,
          intTimestamp: Math.max(localItem.intTimestamp, remoteItem.intTimestamp),
          strTitle: remoteItem.strTitle || localItem.strTitle,
          intCount: Math.max(localItem.intCount, remoteItem.intCount)
        });
      }
    });

    return Array.from(merged.values());
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Export the database manager instance
export const Database = databaseManager;

// Make Database available globally
globalThis.Database = Database;