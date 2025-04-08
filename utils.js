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

export const setDefaultInLocalStorageIfNull = function (key, defaultValue) {
  if (getStorageSync(key) === null) {
    setStorageSync(key, String(defaultValue));
  }
}

export const getStorageSync = function (key) {
  return window.localStorage.getItem(key);
}

export const setStorageSync = function (key, value) {
  window.localStorage.setItem(key, value);
}

// export const getStorageAsync = function (key) {
//   return new Promise((resolve) => {
//     chrome.storage.local.get([key], (result) => {
//       resolve(result[key]); // Resolves with value or undefined
//     });
//   });
// }

// export const setStorageAsync = function (key, value) {
//   return new Promise((resolve) => {
//     chrome.storage.local.set({ [key]: value }, () => {
//       resolve(); // Resolves when set completes
//     });
//   });
// }

export const Node = {
  series: function (objFunctions, funcCallback) {
    let strFunctions = Object.keys(objFunctions);

    let objWorkspace = {};

    let funcNext = function (objArgs, objOverwrite) {
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

      objFunctions[strFunctions[0]](objWorkspace, funcNext);
    };

    objFunctions[strFunctions[0]](objWorkspace, funcNext);
  },
}

export const setupPortListener = function (portName, messageHandlers) {
  chrome.runtime.onConnect.addListener(function (objPort) {
    if (objPort.name === portName) {
      objPort.onMessage.addListener(function (objData) {
        const strMessage = objData.strMessage;
        const objRequest = objData.objRequest;

        // Common response function
        const funcResponse = function (objResponse) {
          objPort.postMessage({
            strMessage: strMessage, // Echo the original message type
            objResponse: objResponse,
          });
        };

        // Common progress function
        const funcProgress = function (objResponse) {
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
}