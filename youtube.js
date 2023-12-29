'use strict';

var strLastchange = null;
var objVideocache = [];
var intMarkcache = {};

// ##########################################################

var refresh = function() {
    for (var objVideo of objVideocache) {
        var strIdent = objVideo.href.split('&')[0].slice(-11);

        mark(objVideo, strIdent);

        if (intMarkcache.hasOwnProperty(strIdent) === true) {
            continue;
        }

        chrome.runtime.sendMessage({
            'strMessage': 'youtubeLookup',
            'strIdent': strIdent
        }, function(objResponse) {
            if (objResponse !== null) {
                intMarkcache[objResponse.strIdent] = objResponse.intTimestamp;

                for (var objVideo of document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v=' + objResponse.strIdent + '"], a.ytd-thumbnail[href^="/shorts/' + objResponse.strIdent + '"]')) {
                    mark(objVideo, objResponse.strIdent);
                }
            }
        });
    }
};

var mark = function(objVideo, strIdent) {
    if ((intMarkcache.hasOwnProperty(strIdent) === true) && (objVideo.classList.contains('youwatch-mark') === false)) {
        objVideo.classList.add('youwatch-mark');

        if (intMarkcache[strIdent] !== 0) {
            objVideo.setAttribute('watchdate', ' - ' + new Date(intMarkcache[strIdent]).toISOString().split('T')[0].split('-').join('.'));
        }

    } else if ((intMarkcache.hasOwnProperty(strIdent) !== true) && (objVideo.classList.contains('youwatch-mark') !== false)) {
        objVideo.classList.remove('youwatch-mark');

    }
};

// ##########################################################

chrome.runtime.onMessage.addListener(function(objData, objSender, funcResponse) {
    if (objData.strMessage === 'youtubeRefresh') {
        refresh();

    } else if (objData.strMessage === 'youtubeMark') {
        intMarkcache[objData.strIdent] = objData.intTimestamp;

        for (var objVideo of document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v=' + objData.strIdent + '"], a.ytd-thumbnail[href^="/shorts/' + objData.strIdent + '"]')) {
            mark(objVideo, objData.strIdent);
        }

    }

    funcResponse(null);
});

// ##########################################################

document.addEventListener('youwatch-message', function(objEvent) {
    chrome.runtime.sendMessage(objEvent.detail, function(objResponse) {
        // ...
    });
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
    }

    objVideocache = window.document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v="], a.ytd-thumbnail[href^="/shorts/"]');

    if (strLastchange === window.location.href + ':' + window.document.title + ':' + objVideocache.length) {
        return;
    }

    strLastchange = window.location.href + ':' + window.document.title + ':' + objVideocache.length;

    refresh();
}, 300);
