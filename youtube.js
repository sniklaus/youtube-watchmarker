'use strict';

let strLastchange = null;
let intWatchdate = {};

// ##########################################################

let refresh = function() {
    for (let objVideo of window.document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v="], a.ytd-thumbnail[href^="/shorts/"]')) {
        let strIdent = objVideo.href.split('&')[0].slice(-11);

        mark(objVideo, strIdent);

        if (intWatchdate.hasOwnProperty(strIdent) === true) {
            continue;
        }

        chrome.runtime.sendMessage({
            'strMessage': 'youtubeLookup',
            'strIdent': strIdent
        }, function(objResponse) {
            if (objResponse !== null) {
                intWatchdate[objResponse.strIdent] = objResponse.intTimestamp;

                for (let objVideo of document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v=' + objResponse.strIdent + '"], a.ytd-thumbnail[href^="/shorts/' + objResponse.strIdent + '"]')) {
                    mark(objVideo, objResponse.strIdent);
                }
            }
        });
    }
    
    strLastchange = window.location.href + ':' + window.document.title + ':' + window.document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v="], a.ytd-thumbnail[href^="/shorts/"]').length;
};

let mark = function(objVideo, strIdent) {
    if ((intWatchdate.hasOwnProperty(strIdent) === true) && (objVideo.classList.contains('youwatch-mark') === false)) {
        objVideo.classList.add('youwatch-mark');

        if (intWatchdate[strIdent] !== 0) {
            objVideo.setAttribute('watchdate', ' - ' + new Date(intWatchdate[strIdent]).toISOString().split('T')[0].split('-').join('.'));
        }

    } else if ((intWatchdate.hasOwnProperty(strIdent) !== true) && (objVideo.classList.contains('youwatch-mark') !== false)) {
        objVideo.classList.remove('youwatch-mark');

    }
};

// ##########################################################

chrome.runtime.onMessage.addListener(function(objData, objSender, funcResponse) {
    if (objData.strMessage === 'youtubeRefresh') {
        refresh();

    } else if (objData.strMessage === 'youtubeMark') {
        intWatchdate[objData.strIdent] = objData.intTimestamp;

        for (let objVideo of document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v=' + objData.strIdent + '"], a.ytd-thumbnail[href^="/shorts/' + objData.strIdent + '"]')) {
            mark(objVideo, objData.strIdent);
        }

    }

    funcResponse(null);
});

// ##########################################################

document.addEventListener('yt-service-request-completed', function() {
    strLastchange = null; // there is a chance that this is not sufficient, the page may not be updated yet so if the interval function triggers it may have been too soon
});

document.addEventListener('yt-navigate-finish', function() {
    strLastchange = null; // there is a chance that this is not sufficient, the page may not be updated yet so if the interval function triggers it may have been too soon
});

window.setInterval(function() {
    if (document.hidden === true) {
        return;

    } else if (strLastchange === window.location.href + ':' + window.document.title + ':' + window.document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v="], a.ytd-thumbnail[href^="/shorts/"]').length) {
        return;

    }

    refresh();
}, 300);
