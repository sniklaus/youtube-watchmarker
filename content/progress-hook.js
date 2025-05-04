(function () {
  if (window.youwatchProgressHookInjected) {
    return;
  }
  window.youwatchProgressHookInjected = true;
  console.log('YouWatch progress hook injected');

  let funcParsejson = function (strJson) {
    let intLength = 1;

    for (let intCount = 0; intLength < strJson.length; intLength += 1) {
      if (strJson[intLength - 1] === '{') {
        intCount += 1;

      } else if (strJson[intLength - 1] === '}') {
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

  let funcHackyparse = function (strResponse) {
    for (let strVideo of strResponse.split('{"videoRenderer":{"videoId":"').slice(1)) { // desktop
      let objVideo = funcParsejson('{"videoRenderer":{"videoId":"' + strVideo);

      if (objVideo === null) {
        continue;

      } else if (JSON.stringify(objVideo).indexOf('"percentDurationWatched"') === -1) {
        continue;

      }

      let strIdent = objVideo['videoRenderer']['videoId'];
      let strTitle = null;

      if (strTitle === null) {
        try {
          strTitle = objVideo['videoRenderer']['title']['runs'][0]['text'];
        } catch (objError) {
          // ...
        }
      }

      if (strTitle === null) {
        try {
          strTitle = objVideo['videoRenderer']['title']['simpleText'];
        } catch (objError) {
          // ...
        }
      }

      if (strIdent.length !== 11) {
        continue;

      } else if (strTitle === null) {
        continue;

      }

      document.dispatchEvent(new CustomEvent('youwatch-progresshook', {
        'detail': {
          'strIdent': strIdent,
          'strTitle': strTitle
        }
      }));
    }

    for (let strVideo of strResponse.split('{"videoWithContextRenderer":{"headline":{"runs":[{"text":"').slice(1)) { // mobile
      let objVideo = funcParsejson('{"videoWithContextRenderer":{"headline":{"runs":[{"text":"').slice(strVideo);

      if (objVideo === null) {
        continue;

      } else if (JSON.stringify(objVideo).indexOf('"percentDurationWatched"') === -1) {
        continue;

      }

      let strIdent = objVideo['videoWithContextRenderer']['videoId'];
      let strTitle = null;

      if (strTitle === null) {
        try {
          strTitle = objVideo['videoWithContextRenderer']['headline']['runs'][0]['text'];
        } catch (objError) {
          // ...
        }
      }

      if (strTitle === null) {
        try {
          strTitle = objVideo['videoWithContextRenderer']['headline']['simpleText'];
        } catch (objError) {
          // ...
        }
      }

      if (strIdent.length !== 11) {
        continue;

      } else if (strTitle === null) {
        continue;

      }

      document.dispatchEvent(new CustomEvent('youwatch-progresshook', {
        'detail': {
          'strIdent': strIdent,
          'strTitle': strTitle
        }
      }));
    }
  };

  let objOrigxmlreq = window.XMLHttpRequest.prototype.open;
  let objOrigfetchreq = window.fetch;

  window.addEventListener('DOMContentLoaded', function () {
    funcHackyparse(document.body.innerHTML.split('var ytInitialData = ').slice(-1)[0].split(';</script>')[0].replace(new RegExp(String.fromCharCode(92) + String.fromCharCode(92) + 'x([0-9a-f][0-9a-f])', 'g'), function (objMatch) {
      return String.fromCharCode(parseInt(objMatch.substr(2), 16))
    }));
  });

  window.XMLHttpRequest.prototype.open = function () {
    this.addEventListener('load', function () {
      let strLink = this.responseURL;

      if ((strLink.indexOf('https://www.youtube.com/youtubei/v1/') === -1) && (strLink.indexOf('https://m.youtube.com/youtubei/v1/') === -1)) {
        return;
      }

      funcHackyparse(this.responseText);
    });

    return objOrigxmlreq.apply(this, arguments);
  };

  window.fetch = async function (objRequest, objOptions) {
    let objResponse = await objOrigfetchreq(objRequest, objOptions);

    let strLink = typeof (objRequest) === 'string' ? objRequest : objRequest.url;

    if ((strLink.indexOf('https://www.youtube.com/youtubei/v1/') === -1) && (strLink.indexOf('https://m.youtube.com/youtubei/v1/') === -1)) {
      return objResponse;
    }

    let strResponse = await objResponse.text();

    funcHackyparse(strResponse);

    return new Response(strResponse, {
      'status': objResponse.status,
      'statusText': objResponse.statusText,
      'headers': objResponse.headers
    });
  };
})();