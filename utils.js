console.log("utils.js: file loaded");

import { DATABASE } from "./constants.js";

/**
 * Detects the browser type
 * @returns {string|null} Browser type ('firefox', 'chrome', or null)
 */
export const getBrowserType = () => {
  if (typeof browser !== "undefined") {
    return "firefox";
  }
  if (typeof chrome !== "undefined") {
    return "chrome";
  }
  return null;
};

/**
 * Parses JSON with hacky bracket counting for incomplete JSON strings
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object|null} Parsed JSON object or null if parsing fails
 */
export const parseIncompleteJson = (jsonString) => {
  let length = 1;
  let count = 0;

  for (let i = 0; length < jsonString.length; length++) {
    if (jsonString[length - 1] === "{") {
      count++;
    } else if (jsonString[length - 1] === "}") {
      count--;
    }

    if (count === 0) {
      break;
    }
  }

  try {
    return JSON.parse(jsonString.substr(0, length));
  } catch (error) {
    console.warn("Failed to parse incomplete JSON:", error);
    return null;
  }
};

/**
 * Sends a message to a tab with retry logic
 * @param {number} tabId - The tab ID to send the message to
 * @param {Object} message - The message to send
 * @param {number} [retryCount=100] - Number of retry attempts
 */
export const sendMessageToTab = (tabId, message, retryCount = 100) => {
  if (retryCount === 0) {
    console.warn(`Failed to send message to tab ${tabId} after all retries`);
    return;
  }

  chrome.tabs.sendMessage(tabId, message, {}, (response) => {
    if (chrome.runtime.lastError) {
      setTimeout(() => sendMessageToTab(tabId, message, retryCount - 1), 100);
    }
  });
};

/**
 * Creates a response callback function that handles null propagation
 * @param {Function} transformArgs - Function to transform non-null arguments
 * @param {Function} responseCallback - The callback function to be called
 * @returns {Function} A callback function
 */
export const createResponseCallback = (transformArgs, responseCallback) => {
  return (args) => {
    if (typeof responseCallback !== 'function') {
      console.warn('createResponseCallback: responseCallback is not a function', responseCallback);
      return;
    }
    
    if (args === null) {
      responseCallback(null);
    } else {
      responseCallback(transformArgs(args));
    }
  };
};

/**
 * Sets a default value in local storage if the key doesn't exist
 * @param {string} key - Storage key
 * @param {string} defaultValue - Default value to set
 * @returns {Promise<void>}
 */
export const setDefaultInStorageIfNull = async (key, defaultValue) => {
  const value = await getStorageAsync(key);
  if (value === null) {
    await setStorageAsync(key, String(defaultValue));
  }
};

/**
 * Gets a value from Chrome storage asynchronously
 * @param {string} key - Storage key
 * @returns {Promise<string|null>} The stored value or null if not found
 */
export const getStorageAsync = (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Failed to get ${key} from chrome.storage.local: ${chrome.runtime.lastError.message}`));
      } else {
        resolve(result[key] || null);
      }
    });
  });
};

/**
 * Sets a value in Chrome storage asynchronously
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @param {string} [errorMessage] - Custom error message
 * @returns {Promise<void>}
 */
export const setStorageAsync = (key, value, errorMessage) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        const errorMsg = errorMessage || `Failed to set ${key} in chrome.storage.local: ${chrome.runtime.lastError.message}`;
        reject(new Error(errorMsg));
      } else {
        resolve();
      }
    });
  });
};

/**
 * Utility class for handling asynchronous series operations
 */
export class AsyncSeries {
  /**
   * Executes functions in series, passing results between them
   * @param {Object} functions - Object containing functions to execute
   * @param {Function} callback - Final callback function
   */
  static async run(functions, callback) {
    if (typeof callback !== 'function') {
      console.error('AsyncSeries.run: callback is not a function', callback);
      return;
    }
    
    const functionNames = Object.keys(functions);
    const workspace = {};

    const executeNext = async (args, overwrite) => {
      if (args === null) {
        return callback(null);
      }

      workspace[functionNames[0]] = args;
      functionNames.shift();

      if (overwrite !== undefined) {
        if (typeof overwrite === "string") {
          const allNames = Object.keys(functions);
          const index = allNames.indexOf(overwrite);
          if (index !== -1) {
            functionNames.splice(0, functionNames.length, ...allNames.slice(index));
          }
        } else if (Array.isArray(overwrite)) {
          functionNames.splice(0, functionNames.length, ...overwrite);
        }
      }

      if (functionNames.length === 0) {
        return callback(workspace);
      }

      try {
        await functions[functionNames[0]](workspace, executeNext);
      } catch (error) {
        console.error("Error in series step:", functionNames[0], error);
        callback(null);
      }
    };

    try {
      await functions[functionNames[0]](workspace, executeNext);
    } catch (error) {
      console.error("Error in initial series step:", functionNames[0], error);
      callback(null);
    }
  }
}



/**
 * Background script utilities for Chrome extension
 */
export class BackgroundUtils {
  /**
   * Creates a messaging handler for background scripts
   * @param {string} portName - Name of the port to listen on
   * @param {Object} messageHandlers - Object mapping message types to handlers
   * @returns {Function} Function that can be used in AsyncSeries
   */
  static messaging(portName, messageHandlers) {
    return (args, callback) => {
      chrome.runtime.onConnect.addListener((port) => {
        if (port.name === portName) {
          port.onMessage.addListener((data) => {
            const { action, ...request } = data;

            const sendResponse = (response) => {
              port.postMessage({
                action: action,
                response: response,
              });
            };

            const sendProgress = (response) => {
              port.postMessage({
                action: `${action}-progress`,
                response: response,
              });
            };

            const handler = messageHandlers[action];
            if (handler) {
              handler(request, sendResponse, sendProgress);
            } else {
              console.error(`[${portName}] Received unexpected action:`, action);
            }
          });
        }
      });
      
      if (typeof callback === 'function') {
        return callback({});
      } else {
        console.warn('BackgroundUtils.messaging: callback is not a function', callback);
      }
    };
  }

  /**
   * Gets database connection with modern async/await support
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
   * @returns {Function} Function that returns database object store
   */
  static database(mode = 'readwrite') {
    return (args, callback) => {
      const Database = globalThis.Database;
      if (!Database) {
        console.error("Database object not available in globalThis");
        return callback(null);
      }
      if (!Database.database) {
        console.error("Database not initialized - database property is null");
        return callback(null);
      }
      if (!Database.isInitialized) {
        console.error("Database not fully initialized - isInitialized flag is false");
        return callback(null);
      }
      try {
        const objectStore = Database.getObjectStore(mode);
        if (!objectStore) {
          console.error("Failed to get object store from database");
          return callback(null);
        }
        return callback(objectStore);
      } catch (error) {
        console.error("Error getting database object store:", error);
        return callback(null);
      }
    };
  }

  /**
   * Gets video data from database with progress reporting
   * @param {Function} progressCallback - Progress reporting function
   * @returns {Function} Function for AsyncSeries
   */
  static get(progressCallback) {
    return (args, callback) => {
      const query = args.objDatabase
        .index(DATABASE.INDEXES.IDENT)
        .get(args.objVideo.strIdent);

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
   * Puts video data into database
   * @returns {Function} Function for AsyncSeries
   */
  static put() {
    return (args, callback) => {
      if (!args.objDatabase) {
        console.error("Database object store not available");
        return callback({});
      }
      
      if (!args.objGet || !args.objGet.strIdent || !args.objGet.strIdent.trim()) {
        return callback({});
      }

      const query = args.objDatabase.put(args.objGet);
      
      query.onerror = () => {
        console.error("Database put error:", query.error);
        return callback({});
      };
      
      query.onsuccess = () => callback({});
    };
  }

  /**
   * Moves to next video in processing queue
   * @returns {Function} Function for AsyncSeries
   */
  static videoNext() {
    return (args, callback) => {
      args.intVideo++;

      if (args.intVideo < args.objVideos.length) {
        return callback({}, "objVideo");
      }

      args.intVideo = 0;
      return callback({});
    };
  }

  /**
   * Counts items in database and updates storage
   * @returns {Function} Function for AsyncSeries
   */
  static count() {
    return (args, callback) => {
      if (!args.objDatabase) {
        console.error("Database object store not available");
        return callback({});
      }
      
      const query = args.objDatabase.count();

      query.onerror = () => {
        console.error("Database count error:", query.error);
        return callback({});
      };

      query.onsuccess = async () => {
        await setStorageAsync(
          "databaseSize",
          String(query.result)
        );
        return callback({});
      };
    };
  }

  /**
   * Sets current timestamp in storage
   * @param {string} key - Storage key for timestamp
   * @returns {Function} Function for AsyncSeries
   */
  static time(key) {
    return async (args, callback) => {
      await setStorageAsync(key, String(Date.now()));
      return callback({});
    };
  }

  /**
   * Gets YouTube cookies
   * @returns {Function} Function for AsyncSeries
   */
  static cookies() {
    return (args, callback) => {
      const cookieNames = ["SAPISID", "__Secure-3PAPISID"];
      const cookies = {};

      const getCookie = () => {
        if (cookieNames.length === 0) {
          return callback(cookies);
        }

        const cookieName = cookieNames.shift();
        chrome.cookies.get(
          {
            url: "https://www.youtube.com",
            name: cookieName,
          },
          (cookie) => {
            cookies[cookieName] = cookie ? cookie.value : null;
            getCookie();
          }
        );
      };

      getCookie();
    };
  }

  /**
   * Creates YouTube authentication header
   * @returns {Function} Function for AsyncSeries
   */
  static contauth() {
    return (args, callback) => {
      const time = Math.round(Date.now() / 1000);
      const cookie = args.objCookies["SAPISID"] || args.objCookies["__Secure-3PAPISID"];
      const origin = "https://www.youtube.com";

      crypto.subtle
        .digest("SHA-1", new TextEncoder().encode(`${time} ${cookie} ${origin}`))
        .then((hash) => {
          const hashArray = Array.from(new Uint8Array(hash));
          const hashHex = hashArray
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");

          return callback({
            strAuth: `SAPISIDHASH ${time}_${hashHex}`,
          });
        });
    };
  }

  /**
   * Gets current video from processing queue
   * @returns {Function} Function for AsyncSeries
   */
  static video() {
    return (args, callback) => {
      if (!Object.hasOwn(args, "intVideo")) {
        args.intVideo = 0;
      }

      if (args.intVideo >= args.objVideos.length) {
        return callback({}, "objVideo-Next");
      }

      return callback(args.objVideos[args.intVideo]);
    };
  }
}