import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
  // Legacy compatibility
  Node,
  bgObject
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
  }

  /**
   * Initialize the database
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async init(request, response) {
    console.log("DatabaseManager.init called");
    
    try {
      await AsyncSeries.run(
        {
          openDatabase: this.openDatabase.bind(this),
          setupMessaging: BackgroundUtils.messaging('database', {
            'databaseExport': this.export.bind(this),
            'databaseImport': this.import.bind(this),
            'databaseReset': this.reset.bind(this)
          }),
        },
        createResponseCallback(() => ({}), response)
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
   * Exports the database to a downloadable file
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   * @param {Function} progress - Progress callback
   */
  export(request, response, progress) {
    AsyncSeries.run(
      {
        database: BackgroundUtils.database(),
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
        videos: (args, callback) => callback(request.objVideos),
        database: BackgroundUtils.database(),
        video: BackgroundUtils.video(),
        get: BackgroundUtils.get(progress),
        put: BackgroundUtils.put(),
        "video-Next": BackgroundUtils.videoNext(),
        count: BackgroundUtils.count(),
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
        database: BackgroundUtils.database(),
        clearData: this.clearAllData.bind(this),
        count: BackgroundUtils.count(),
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
   * Gets the database object store for transactions
   * @returns {IDBObjectStore|null} The database object store
   */
  getObjectStore() {
    if (!this.database) {
      throw new Error("Database not initialized");
    }
    return this.database
      .transaction([this.STORE_NAME], "readwrite")
      .objectStore(this.STORE_NAME);
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Legacy compatibility - export as Database object
export const Database = {
  objDatabase: null,
  
  init: (request, response) => {
    databaseManager.init(request, response).then(() => {
      // Set the legacy objDatabase property for backward compatibility
      Database.objDatabase = databaseManager.database;
    });
  },
  
  export: databaseManager.export.bind(databaseManager),
  import: databaseManager.import.bind(databaseManager),
  reset: databaseManager.reset.bind(databaseManager),
};

// Make Database available globally to avoid circular dependency issues
globalThis.Database = Database;

// Update the global reference when database is initialized
const originalInit = Database.init;
Database.init = (request, response) => {
  originalInit(request, response);
  // Update global reference
  globalThis.Database = Database;
};