'use strict';

// ##########################################################

let funcHackyparse = function(strJson) {
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

let funcParsevideos = function(strText, boolProgress) {
    let objVideos = [];

    for (let strVideo of strText.split('{"lockupViewModel":').slice(1)) {
        let objVideo = funcHackyparse('{"lockupViewModel":' + strVideo);

        if (objVideo === null) {
            continue;
        }

        if (boolProgress === true) {
            if (JSON.stringify(objVideo).indexOf('"thumbnailOverlayProgressBarViewModel"') === -1) {
                continue;
            }
        }

        let strIdent = objVideo['lockupViewModel']['contentId'];
        let strTitle = null;

        if (strTitle === null) {
            try {
                strTitle = objVideo['lockupViewModel']['metadata']['lockupMetadataViewModel']['title']['content'];
            } catch (objError) {
                // ...
            }
        }

        if (strTitle === null) {
            try {
                strTitle = objVideo['lockupViewModel']['rendererContext']['accessibilityContext']['label'];
            } catch (objError) {
                // ...
            }
        }

        if (strIdent.length !== 11) {
            continue;

        } else if (strTitle === null) {
            continue;

        }

        objVideos.push({
            'objVideo': objVideo,
            'strIdent': strIdent,
            'strTitle': strTitle,
        })
    }

    for (let strVideo of strText.split('{"videoRenderer":{"videoId":"').slice(1)) {
        let objVideo = funcHackyparse('{"videoRenderer":{"videoId":"' + strVideo);

        if (objVideo === null) {
            continue;
        }

        if (boolProgress === true) {
            if (JSON.stringify(objVideo).indexOf('"percentDurationWatched"') === -1) {
                continue;
            }
        }

        let strIdent = objVideo['videoRenderer']['videoId'];
        let strTitle = objVideo['videoRenderer']['title']['runs'][0]['text'];

        if (strIdent.length !== 11) {
            continue;
        }

        objVideos.push({
            'objVideo': objVideo,
            'strIdent': strIdent,
            'strTitle': strTitle,
        })
    }

    for (let strVideo of strText.split('{"playlistVideoRenderer":{"videoId":"').slice(1)) {
        let objVideo = funcHackyparse('{"playlistVideoRenderer":{"videoId":"' + strVideo);

        if (objVideo === null) {
            continue;
        }

        if (boolProgress === true) {
            if (JSON.stringify(objVideo).indexOf('"percentDurationWatched"') === -1) {
                continue;
            }
        }

        let strIdent = objVideo['playlistVideoRenderer']['videoId'];
        let strTitle = objVideo['playlistVideoRenderer']['title']['runs'][0]['text'];

        if (strIdent.length !== 11) {
            continue;
        }

        objVideos.push({
            'objVideo': objVideo,
            'strIdent': strIdent,
            'strTitle': strTitle,
        })
    }

    return objVideos;
};

let funcEmitvideos = function(strText) {
    for (let objVideo of funcParsevideos(strText, true)) {
        document.dispatchEvent(new CustomEvent('youtubeProgress', {
            'detail': {
                'strIdent': objVideo['strIdent'],
                'strTitle': objVideo['strTitle'],
            },
        }));
    }
};

// ##########################################################

window.addEventListener('DOMContentLoaded', function() {
    funcEmitvideos(document.documentElement.outerHTML.split('var ytInitialData = ').slice(-1)[0].split(';</script>')[0].replace(new RegExp(String.fromCharCode(92) + String.fromCharCode(92) + 'x([0-9a-f][0-9a-f])', 'g'), function(objMatch) {
        return String.fromCharCode(parseInt(objMatch.substr(2), 16));
    }));
});

// ##########################################################

let objXhr = window.XMLHttpRequest.prototype.open;
let objFetch = window.fetch;

window.XMLHttpRequest.prototype.open = function() {
    this.addEventListener('load', function() {
        if (this.responseURL.indexOf('https://www.youtube.com/youtubei/v1/') !== -1) {
            funcEmitvideos(this.responseText);
        }
    });

    return objXhr.apply(this, arguments);
};

window.fetch = async function(objRequest, objOptions) {
    let objResponse = await objFetch(objRequest, objOptions);


    if ((typeof(objRequest) === 'string' ? objRequest : objRequest.url).indexOf('https://www.youtube.com/youtubei/v1/') !== -1) {
        let strResponse = await objResponse.text();

        funcEmitvideos(strResponse);

        objResponse = new Response(strResponse, {
            'status': objResponse.status,
            'statusText': objResponse.statusText,
            'headers': objResponse.headers,
        });
    }

    return objResponse;
};
