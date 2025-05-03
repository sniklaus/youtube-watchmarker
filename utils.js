import { Database } from "./bg-database.js";

console.log("utils.js: file loaded");
export const funcBrowser = function () {
  if (typeof browser !== "undefined") {
    return "firefox";
  }

  if (typeof chrome !== "undefined") {
    return "chrome";
  }

  return null;
};

export const funcHackyparse = function (strJson) {
  let intLength = 1;

  for (let intCount = 0; intLength < strJson.length; intLength += 1) {
    if (strJson[intLength - 1] === "{") {
      intCount += 1;
    } else if (strJson[intLength - 1] === "}") {
      intCount -= 1;
    }

    if (intCount === 0) {
      break;
    }
  }

  try {
    return JSON.parse(strJson.substr(0, intLength));
  } catch (objError) {
    // ...
  }

  return null;
};

export const funcSendmessage = function (intTab, objMessage, intRetry) {
  if (intRetry === 0) {
    return;
  } else if (intRetry === undefined) {
    intRetry = 100;
  }

  chrome.tabs.sendMessage(intTab, objMessage, {}, function (objResponse) {
    if (
      chrome.runtime.lastError !== undefined &&
      chrome.runtime.lastError !== null
    ) {
      setTimeout(funcSendmessage, 100, intTab, objMessage, intRetry - 1);
    }
  });
};

/**
 * Creates a response callback function.
 * Handles the null case by propagating null.
 * For non-null inputs, it applies the provided transformation logic.
 *
 * @param {Function} transformArgs - A function to transforms the non-null objArgs,
 *                                     or () => staticValue to return a static value
 * @param {Function} funcResponse - The callback function to be called with the transformed arguments.
 * @returns {Function} A callback function (objArgs, funcResponse) => void
 */
export const createResponseCallback = function (transformArgs, funcResponse) {
  return function (objArgs) {
    if (objArgs === null) {
      funcResponse(null);
    } else {
      funcResponse(transformArgs(objArgs));
    }
  };
}

export const setDefaultInLocalStorageIfNullSync = function (key, defaultValue) {
  if (getStorageSync(key) === null) {
    setStorageSync(key, String(defaultValue));
  }
}

export const setDefaultInLocalStorageIfNullAsync = async function (key, defaultValue) {
  const value = await getStorageAsync(key);
  if (value === null) {
    await setStorageAsync(key, String(defaultValue));
  }
}

export const getStorageSync = function (key) {
  return window.localStorage.getItem(key);
}

export const setStorageSync = function (key, value) {
  window.localStorage.setItem(key, value);
}

export const getStorageAsync = function (key) {
  return new Promise((resolve, reject) => {
    // Check localStorage first (synchronous) for legacy support
    const localValue = window.localStorage.getItem(key);

    if (localValue !== null) {
      // Migrate to chrome.storage.local and return the value
      setStorageAsync(key, localValue)
        .then(() => resolve(localValue))
        .catch(reject);
    } else {
      // No localStorage value, check chrome.storage.local
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to get ${key} from chrome.storage.local: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result[key] || null); // Return null if key doesn’t exist, mimicking localStorage
        }
      });
    }
  });
};

export const setStorageAsync = function (key, value, errorMessage) {
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

export const Node = {
  series: function (objFunctions, funcCallback) {
    let strFunctions = Object.keys(objFunctions);

    let objWorkspace = {};

    let funcNext = async function (objArgs, objOverwrite) {
      if (objArgs === null) {
        return funcCallback(null);
      }

      objWorkspace[strFunctions[0]] = objArgs;

      strFunctions.shift();

      if (objOverwrite !== undefined) {
        if (typeof objOverwrite === "string") {
          strFunctions = Object.keys(objFunctions);

          while (strFunctions.length > 0 && strFunctions[0] !== objOverwrite) {
            strFunctions.shift();
          }
        } else if (typeof objOverwrite === "object") {
          strFunctions = objOverwrite;
        }
      }

      if (strFunctions.length === 0) {
        return funcCallback(objWorkspace);
      }

      try {
        await objFunctions[strFunctions[0]](objWorkspace, funcNext);
      } catch (error) {
        console.error("Error in series step:", strFunctions[0], error);
        // Decide how to handle the error
      }
    };

    // Wrap the initial call in an async IIFE to handle potential async first function
    (async () => {
      try {
        await objFunctions[strFunctions[0]](objWorkspace, funcNext);
      } catch (error) {
        console.error("Error in initial series step:", strFunctions[0], error);
      }
    })();
  },
}

export const bgObject = {
  messaging: (portName, messageHandlers) => (objArgs, funcCallback) => {
    chrome.runtime.onConnect.addListener((objPort) => {
      if (objPort.name === portName) {
        objPort.onMessage.addListener((objData) => {
          const strMessage = objData.strMessage;
          const objRequest = objData.objRequest;

          // Common response function
          const funcResponse = (objResponse) => {
            objPort.postMessage({
              strMessage: strMessage, // Echo the original message type
              objResponse: objResponse,
            });
          };

          // Common progress function
          const funcProgress = (objResponse) => {
            objPort.postMessage({
              strMessage: `${strMessage}-progress`, // Indicate progress for the original message
              objResponse: objResponse,
            });
          };

          // Look up the handler for the received message
          const handler = messageHandlers[strMessage];

          if (handler) {
            // Call the specific handler function
            // We need a way to determine if the handler needs funcProgress.
            // One way is to check the function's arity (number of expected args).
            // Or, more simply, always pass it and let the handler ignore it if unused.
            handler(objRequest, funcResponse, funcProgress);
          } else {
            console.error(`[${portName}] Received unexpected message:`, strMessage);
          }
        });
      }
    });
    return funcCallback({});
  },
  database: () => (objArgs, funcCallback) => {
    return funcCallback(
      Database.objDatabase
        .transaction(["storeDatabase"], "readwrite")
        .objectStore("storeDatabase"),
    );
  },
  get: (funcProgress) => (objArgs, funcCallback) => {
    let objQuery = objArgs.objDatabase
      .index("strIdent")
      .get(objArgs.objVideo.strIdent);

    objQuery.onsuccess = function () {
      if (objArgs.intNew === undefined) {
        objArgs.intNew = 0;
        objArgs.intExisting = 0;
      }

      funcProgress({
        strProgress:
          "imported " +
          (objArgs.intNew + objArgs.intExisting) +
          " videos - " +
          objArgs.intNew +
          " were new",
      });

      // TODO: this part was only in Database.import.objGet, but there's no harm 
      // to have it here as well. As if longTimestamp is undefined, intTimestamp
      // simply stays undefined.
      if (objArgs.objVideo.intTimestamp === undefined) {
        objArgs.objVideo.intTimestamp = objArgs.objVideo.longTimestamp; // legacy
      }
      ////////////////////////////////////////////////////////

      if (objQuery.result === undefined || objQuery.result === null) {
        objArgs.intNew += 1;

        return funcCallback({
          strIdent: objArgs.objVideo.strIdent,
          intTimestamp:
            objArgs.objVideo.intTimestamp || new Date().getTime(),
          strTitle: objArgs.objVideo.strTitle || "",
          intCount: objArgs.objVideo.intCount || 1,
        });
      } else if (
        objQuery.result !== undefined &&
        objQuery.result !== null
      ) {
        objArgs.intExisting += 1;

        return funcCallback({
          strIdent: objQuery.result.strIdent,
          intTimestamp:
            Math.max(
              objQuery.result.intTimestamp,
              objArgs.objVideo.intTimestamp,
            ) || new Date().getTime(),
          // TODO: in Youtube.synchronize.objGet this was:
          // "intTimestamp: objArgs.objVideo.intTimestamp || objQuery.result.intTimestamp || new Date().getTime(),"
          // but I assume that was outdated code and Math.max should be used. I might be wrong.
          strTitle:
            objQuery.result.strTitle || objArgs.objVideo.strTitle || "",
          intCount:
            Math.max(
              objQuery.result.intCount,
              objArgs.objVideo.intCount,
            ) || 1,
          // TODO: in Youtube.synchronize.objGet this was "intCount: objArgs.objVideo.intCount || objQuery.result.intCount || 1"
          // but I assume that was outdated code and Math.max should be used. I might be wrong.
        });
      }
    };
  },
  put: () => (objArgs, funcCallback) => {
    if (objArgs.objGet.strIdent.trim() === "") {
      return funcCallback({});
    } else if (objArgs.objGet.strTitle.trim() === "") {
      return funcCallback({});
    }

    const objQuery = objArgs.objDatabase.put(objArgs.objGet);

    objQuery.onsuccess = () => {
      return funcCallback({});
    };
  },
  videoNext: () => (objArgs, funcCallback) => {
    objArgs.intVideo += 1;

    if (objArgs.intVideo < objArgs.objVideos.length) {
      return funcCallback({}, "objVideo");
    }

    objArgs.intVideo = 0;

    return funcCallback({});
  },
  count: () => (objArgs, funcCallback) => {
    let objQuery = objArgs.objDatabase.count();

    objQuery.onsuccess = () => {
      setStorageSync(
        "extensions.Youwatch.Database.intSize",
        String(objQuery.result),
      );

      return funcCallback({});
    };
  },
  time: (key) => (objArgs, funcCallback) => {
    setStorageSync(key, String(new Date().getTime()),
    );

    return funcCallback({});
  },
  cookies: () => (objArgs, funcCallback) => {
    let strCookies = ["SAPISID", "__Secure-3PAPISID"];
    let objCookies = {};

    let funcCookie = () => {
      if (strCookies.length === 0) {
        return funcCallback(objCookies);
      }

      let strCookie = strCookies.shift();

      chrome.cookies.get(
        {
          url: "https://www.youtube.com",
          name: strCookie,
        },
        (objCookie) => {
          if (objCookie === null) {
            objCookies[strCookie] = null;
          } else if (objCookie !== null) {
            objCookies[strCookie] = objCookie.value;
          }

          funcCookie();
        },
      );
    };

    funcCookie();
  },
  contauth: () => (objArgs, funcCallback) => {
    let intTime = Math.round(new Date().getTime() / 1000.0);
    let strCookie =
      objArgs.objCookies["SAPISID"] ||
      objArgs.objCookies["__Secure-3PAPISID"];
    let strOrigin = "https://www.youtube.com";

    // https://stackoverflow.com/a/32065323

    crypto.subtle
      .digest(
        "SHA-1",
        new TextEncoder().encode(
          intTime + " " + strCookie + " " + strOrigin,
        ),
      )
      .then((strHash) => {
        return funcCallback({
          strAuth:
            "SAPISIDHASH " +
            intTime +
            "_" +
            Array.from(new Uint8Array(strHash))
              .map(function (intByte) {
                return intByte.toString(16).padStart(2, "0");
              })
              .join(""),
        });
      });
  },
  video: () => function (objArgs, funcCallback) {
    if (Object.hasOwn(objArgs, "intVideo") === false) {
      objArgs.intVideo = 0;
    }

    if (objArgs.intVideo >= objArgs.objVideos.length) {
      return funcCallback({}, "objVideo-Next");
    }

    return funcCallback(objArgs.objVideos[objArgs.intVideo]);
  },
}