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