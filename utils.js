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
};