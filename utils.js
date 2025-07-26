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
 * Gets a value from Chrome storage asynchronously using native promises
 * @param {string} key - Storage key
 * @returns {Promise<string|null>} The stored value or null if not found
 */
export const getStorageAsync = async (key) => {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  } catch (error) {
    throw new Error(`Failed to get ${key} from chrome.storage.local: ${error.message}`);
  }
};

/**
 * Gets multiple values from Chrome storage asynchronously
 * @param {string[]} keys - Array of storage keys
 * @returns {Promise<Object>} Object containing the stored values
 */
export const getMultipleStorageAsync = async (keys) => {
  try {
    return await chrome.storage.local.get(keys);
  } catch (error) {
    throw new Error(`Failed to get multiple keys from chrome.storage.local: ${error.message}`);
  }
};

/**
 * Gets all keys from Chrome storage (Chrome 130+)
 * @returns {Promise<string[]>} Array of all storage keys
 */
export const getStorageKeysAsync = async () => {
  try {
    return await chrome.storage.local.getKeys();
  } catch (error) {
    throw new Error(`Failed to get storage keys: ${error.message}`);
  }
};

/**
 * Sets a value in Chrome storage asynchronously using native promises
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @param {string} [errorMessage] - Custom error message
 * @returns {Promise<void>}
 */
export const setStorageAsync = async (key, value, errorMessage) => {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    const errorMsg = errorMessage || `Failed to set ${key} in chrome.storage.local: ${error.message}`;
    throw new Error(errorMsg);
  }
};

/**
 * Sets multiple values in Chrome storage asynchronously
 * @param {Object} items - Object containing key-value pairs to store
 * @returns {Promise<void>}
 */
export const setMultipleStorageAsync = async (items) => {
  try {
    await chrome.storage.local.set(items);
  } catch (error) {
    throw new Error(`Failed to set multiple items in chrome.storage.local: ${error.message}`);
  }
};

/**
 * Removes a value from Chrome storage asynchronously
 * @param {string} key - Storage key to remove
 * @returns {Promise<void>}
 */
export const removeStorageAsync = async (key) => {
  try {
    await chrome.storage.local.remove([key]);
  } catch (error) {
    throw new Error(`Failed to remove ${key} from chrome.storage.local: ${error.message}`);
  }
};

/**
 * Removes multiple values from Chrome storage asynchronously
 * @param {string[]} keys - Array of storage keys to remove
 * @returns {Promise<void>}
 */
export const removeMultipleStorageAsync = async (keys) => {
  try {
    await chrome.storage.local.remove(keys);
  } catch (error) {
    throw new Error(`Failed to remove multiple keys from chrome.storage.local: ${error.message}`);
  }
};

/**
 * Clears all data from Chrome storage asynchronously
 * @returns {Promise<void>}
 */
export const clearStorageAsync = async () => {
  try {
    await chrome.storage.local.clear();
  } catch (error) {
    throw new Error(`Failed to clear chrome.storage.local: ${error.message}`);
  }
};

// Sync storage utilities
/**
 * Gets a value from Chrome sync storage asynchronously
 * @param {string} key - Storage key
 * @returns {Promise<any>} The stored value or undefined if not found
 */
export const getSyncStorageAsync = async (key) => {
  try {
    const result = await chrome.storage.sync.get([key]);
    return result[key];
  } catch (error) {
    throw new Error(`Failed to get ${key} from chrome.storage.sync: ${error.message}`);
  }
};

/**
 * Gets multiple values from Chrome sync storage asynchronously
 * @param {string[]} keys - Array of storage keys
 * @returns {Promise<Object>} Object containing the stored values
 */
export const getMultipleSyncStorageAsync = async (keys) => {
  try {
    return await chrome.storage.sync.get(keys);
  } catch (error) {
    throw new Error(`Failed to get multiple keys from chrome.storage.sync: ${error.message}`);
  }
};

/**
 * Gets all keys from Chrome sync storage (Chrome 130+)
 * @returns {Promise<string[]>} Array of all storage keys
 */
export const getSyncStorageKeysAsync = async () => {
  try {
    return await chrome.storage.sync.getKeys();
  } catch (error) {
    throw new Error(`Failed to get sync storage keys: ${error.message}`);
  }
};

/**
 * Sets a value in Chrome sync storage asynchronously
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {Promise<void>}
 */
export const setSyncStorageAsync = async (key, value) => {
  try {
    await chrome.storage.sync.set({ [key]: value });
  } catch (error) {
    throw new Error(`Failed to set ${key} in chrome.storage.sync: ${error.message}`);
  }
};

/**
 * Sets multiple values in Chrome sync storage asynchronously
 * @param {Object} items - Object containing key-value pairs to store
 * @returns {Promise<void>}
 */
export const setMultipleSyncStorageAsync = async (items) => {
  try {
    await chrome.storage.sync.set(items);
  } catch (error) {
    throw new Error(`Failed to set multiple items in chrome.storage.sync: ${error.message}`);
  }
};

/**
 * Sets a default value in storage if the key doesn't exist
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value to set
 * @returns {Promise<void>}
 */
export const setDefaultInStorageIfNull = async (key, defaultValue) => {
  try {
    const result = await chrome.storage.local.get([key]);
    if (result[key] === undefined) {
      await chrome.storage.local.set({ [key]: defaultValue });
    }
  } catch (error) {
    throw new Error(`Failed to set default value for ${key}: ${error.message}`);
  }
};

/**
 * Sets a default value in sync storage if the key doesn't exist
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value to set
 * @returns {Promise<void>}
 */
export const setDefaultInSyncStorageIfNull = async (key, defaultValue) => {
  try {
    const result = await chrome.storage.sync.get([key]);
    if (result[key] === undefined) {
      await chrome.storage.sync.set({ [key]: defaultValue });
    }
  } catch (error) {
    throw new Error(`Failed to set default sync value for ${key}: ${error.message}`);
  }
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
      }
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
}