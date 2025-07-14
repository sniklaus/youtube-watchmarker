import { DATABASE, ERRORS } from "./constants.js";

/**
 * Database utilities for YouTube watch history operations
 * Extracted from BackgroundUtils to improve separation of concerns
 * 
 * @class DatabaseUtils
 * @description Provides static methods for database operations with IndexedDB
 * @version 1.0.0
 * 
 * @example
 * // Get database connection
 * const dbConnection = DatabaseUtils.database('readonly');
 * 
 * @example  
 * // Search videos
 * const results = await DatabaseUtils.searchVideos('test query', 10, 0);
 */
export class DatabaseUtils {
  constructor() {
    this.database = null;
  }

  /**
   * Get database connection with transaction mode
   * @static
   * @param {('readonly'|'readwrite')} [mode='readwrite'] - Transaction mode
   * @returns {Function} Function for AsyncSeries that provides IDBObjectStore
   * @throws {Error} When database cannot be opened or transaction fails
   * 
   * @example
   * const dbFunc = DatabaseUtils.database('readonly');
   * dbFunc({}, (objectStore) => {
   *   if (objectStore) {
   *     // Use objectStore for database operations
   *   }
   * });
   */
  static database(mode = 'readwrite') {
    return (args, callback) => {
      try {
        const openRequest = indexedDB.open(DATABASE.NAME, DATABASE.VERSION);

        openRequest.onerror = () => {
          console.error("Database connection error:", openRequest.error);
          callback(null);
        };

        openRequest.onsuccess = () => {
          try {
            const db = openRequest.result;
            const transaction = db.transaction([DATABASE.STORE_NAME], mode);
            const objectStore = transaction.objectStore(DATABASE.STORE_NAME);
            
            transaction.onerror = () => {
              console.error("Transaction error:", transaction.error);
              callback(null);
            };

            callback(objectStore);
          } catch (error) {
            console.error("Error creating transaction:", error);
            callback(null);
          }
        };
      } catch (error) {
        console.error("Error opening database:", error);
        callback(null);
      }
    };
  }

  /**
   * Get video data from database with progress reporting
   * @param {Function} progressCallback - Progress reporting function
   * @returns {Function} Function for AsyncSeries
   */
  static get(progressCallback) {
    return (args, callback) => {
      if (!args.objDatabase) {
        console.error("Database object store not available");
        return callback(null);
      }

      const query = args.objDatabase
        .index(DATABASE.INDEXES.IDENT)
        .get(args.objVideo.strIdent);

      query.onerror = () => {
        console.error("Database get error:", query.error);
        callback(null);
      };

      query.onsuccess = () => {
        if (args.intNew === undefined) {
          args.intNew = 0;
          args.intExisting = 0;
        }

        // Only call progress callback if it's provided and is a function
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback({
            strProgress: `imported ${args.intNew + args.intExisting} videos - ${args.intNew} were new`,
          });
        }

        // Handle timestamp field compatibility
        if (args.objVideo.intTimestamp === undefined) {
          args.objVideo.intTimestamp = args.objVideo.longTimestamp;
        }

        if (!query.result) {
          args.intNew++;
          return callback({
            strIdent: args.objVideo.strIdent,
            intTimestamp: args.objVideo.intTimestamp || Date.now(),
            strTitle: args.objVideo.strTitle || "",
            intCount: args.objVideo.intCount || 1,
          });
        } else {
          args.intExisting++;
          return callback({
            strIdent: query.result.strIdent,
            intTimestamp: Math.max(
              query.result.intTimestamp,
              args.objVideo.intTimestamp
            ) || Date.now(),
            strTitle: query.result.strTitle || args.objVideo.strTitle || "",
            intCount: Math.max(
              query.result.intCount,
              args.objVideo.intCount
            ) || 1,
          });
        }
      };
    };
  }

  /**
   * Put video data into database
   * @returns {Function} Function for AsyncSeries
   */
  static put() {
    return (args, callback) => {
      if (!args.objDatabase) {
        console.error("Database object store not available");
        return callback({});
      }

      if (!args.objGet) {
        console.error("No video data to put");
        return callback({});
      }

      const query = args.objDatabase.put(args.objGet);

      query.onerror = () => {
        console.error("Database put error:", query.error);
        callback({});
      };

      query.onsuccess = () => {
        callback({});
      };
    };
  }

  /**
   * Get next video for processing
   * @returns {Function} Function for AsyncSeries
   */
  static videoNext() {
    return (args, callback) => {
      if (!args.objVideos || args.objVideos.length === 0) {
        return callback(null);
      }

      // Get the next video from the array
      const nextVideo = args.objVideos.shift();
      
      if (nextVideo) {
        callback(nextVideo);
      } else {
        callback(null);
      }
    };
  }

  /**
   * Count total videos in database
   * @returns {Function} Function for AsyncSeries
   */
  static count() {
    return (args, callback) => {
      if (!args.objDatabase) {
        console.error("Database object store not available");
        return callback({ intCount: 0 });
      }

      const query = args.objDatabase.count();

      query.onerror = () => {
        console.error("Database count error:", query.error);
        callback({ intCount: 0 });
      };

      query.onsuccess = () => {
        callback({ intCount: query.result });
      };
    };
  }

  /**
   * Get or set timestamp in storage
   * @param {string} key - Storage key for timestamp
   * @returns {Function} Function for AsyncSeries
   */
  static time(key) {
    return (args, callback) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Storage get error:", chrome.runtime.lastError);
          return callback({ intTimestamp: 0 });
        }

        const timestamp = result[key] || 0;
        
        // If we have videos processed, update the timestamp
        if (args.objVideos && args.objVideos.length > 0) {
          const maxTimestamp = Math.max(...args.objVideos.map(v => v.intTimestamp || 0));
          if (maxTimestamp > timestamp) {
            chrome.storage.local.set({ [key]: maxTimestamp }, () => {
              if (chrome.runtime.lastError) {
                console.error("Storage set error:", chrome.runtime.lastError);
              }
            });
            return callback({ intTimestamp: maxTimestamp });
          }
        }

        callback({ intTimestamp: timestamp });
      });
    };
  }

  /**
   * Search videos in database
   * @static
   * @async
   * @param {string} query - Search query (searches in video ID and title)
   * @param {number} [limit=50] - Maximum number of results to return
   * @param {number} [offset=0] - Number of results to skip (for pagination)
   * @returns {Promise<VideoRecord[]>} Promise resolving to array of video records
   * @throws {Error} When database is not available or search fails
   * 
   * @example
   * // Search for videos containing "tutorial"
   * const results = await DatabaseUtils.searchVideos('tutorial', 10, 0);
   * console.log(`Found ${results.length} videos`);
   */
  static async searchVideos(query, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(DATABASE.NAME, DATABASE.VERSION);

      openRequest.onerror = () => {
        reject(new Error(ERRORS.DATABASE_NOT_AVAILABLE));
      };

      openRequest.onsuccess = () => {
        try {
          const db = openRequest.result;
          const transaction = db.transaction([DATABASE.STORE_NAME], 'readonly');
          const objectStore = transaction.objectStore(DATABASE.STORE_NAME);
          const index = objectStore.index(DATABASE.INDEXES.TIMESTAMP);
          
          const results = [];
          let skipped = 0;
          let found = 0;
          
          const cursor = index.openCursor(null, 'prev'); // Latest first
          
          cursor.onsuccess = (event) => {
            const cursor = event.target.result;
            
            if (!cursor || found >= limit) {
              resolve(results);
              return;
            }

            const video = cursor.value;
            const matchesQuery = !query || 
              video.strIdent.toLowerCase().includes(query.toLowerCase()) ||
              (video.strTitle && video.strTitle.toLowerCase().includes(query.toLowerCase()));

            if (matchesQuery) {
              if (skipped < offset) {
                skipped++;
              } else {
                results.push(video);
                found++;
              }
            }

            cursor.continue();
          };

          cursor.onerror = () => {
            reject(new Error("Database search failed"));
          };
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * Delete video from database
   * @param {string} videoId - Video ID to delete
   * @returns {Promise<boolean>} Success status
   */
  static async deleteVideo(videoId) {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(DATABASE.NAME, DATABASE.VERSION);

      openRequest.onerror = () => {
        reject(new Error(ERRORS.DATABASE_NOT_AVAILABLE));
      };

      openRequest.onsuccess = () => {
        try {
          const db = openRequest.result;
          const transaction = db.transaction([DATABASE.STORE_NAME], 'readwrite');
          const objectStore = transaction.objectStore(DATABASE.STORE_NAME);
          
          const deleteRequest = objectStore.delete(videoId);
          
          deleteRequest.onsuccess = () => {
            resolve(true);
          };

          deleteRequest.onerror = () => {
            reject(new Error("Failed to delete video"));
          };
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * Get video by ID
   * @param {string} videoId - Video ID
   * @returns {Promise<Object|null>} Video object or null
   */
  static async getVideo(videoId) {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(DATABASE.NAME, DATABASE.VERSION);

      openRequest.onerror = () => {
        reject(new Error(ERRORS.DATABASE_NOT_AVAILABLE));
      };

      openRequest.onsuccess = () => {
        try {
          const db = openRequest.result;
          const transaction = db.transaction([DATABASE.STORE_NAME], 'readonly');
          const objectStore = transaction.objectStore(DATABASE.STORE_NAME);
          
          const getRequest = objectStore.get(videoId);
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };

          getRequest.onerror = () => {
            reject(new Error("Failed to get video"));
          };
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * Update video data
   * @param {Object} video - Video object to update
   * @returns {Promise<boolean>} Success status
   */
  static async updateVideo(video) {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(DATABASE.NAME, DATABASE.VERSION);

      openRequest.onerror = () => {
        reject(new Error(ERRORS.DATABASE_NOT_AVAILABLE));
      };

      openRequest.onsuccess = () => {
        try {
          const db = openRequest.result;
          const transaction = db.transaction([DATABASE.STORE_NAME], 'readwrite');
          const objectStore = transaction.objectStore(DATABASE.STORE_NAME);
          
          const putRequest = objectStore.put(video);
          
          putRequest.onsuccess = () => {
            resolve(true);
          };

          putRequest.onerror = () => {
            reject(new Error("Failed to update video"));
          };
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  static async getStatistics() {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(DATABASE.NAME, DATABASE.VERSION);

      openRequest.onerror = () => {
        reject(new Error(ERRORS.DATABASE_NOT_AVAILABLE));
      };

      openRequest.onsuccess = () => {
        try {
          const db = openRequest.result;
          const transaction = db.transaction([DATABASE.STORE_NAME], 'readonly');
          const objectStore = transaction.objectStore(DATABASE.STORE_NAME);
          
          const countRequest = objectStore.count();
          
          countRequest.onsuccess = () => {
            const stats = {
              totalVideos: countRequest.result,
              databaseVersion: DATABASE.VERSION,
              storeName: DATABASE.STORE_NAME
            };
            resolve(stats);
          };

          countRequest.onerror = () => {
            reject(new Error("Failed to get statistics"));
          };
        } catch (error) {
          reject(error);
        }
      };
    });
  }
} 