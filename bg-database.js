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
          setupMessaging: BackgroundUtils.messaging('database', {
            'database-export': this.export.bind(this),
            'database-import': this.import.bind(this),
            'database-reset': this.reset.bind(this)
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
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Export the database manager instance
export const Database = databaseManager;

// Make Database available globally
globalThis.Database = Database;