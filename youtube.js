'use strict';

var strLastchange = null;
var objVideocache = [];
var objProgresscache = [];
var boolMarkcache = {};

// ##########################################################

var refresh = function() {
    for (var objProgress of objProgresscache) {
        var objVideo = objProgress.parentNode.parentNode;

        if (objVideo.matches('a.ytd-thumbnail[href^="/watch?v="], a.ytd-thumbnail[href^="/shorts/"]') === false) {
            continue;
        }

        var strIdent = objVideo.href.split('&')[0].slice(-11);

        if (boolMarkcache.hasOwnProperty(strIdent) === false) {
            boolMarkcache[strIdent] = false;
        }

        if (boolMarkcache[strIdent] === false) {
            boolMarkcache[strIdent] = true;

            var objTitle = document.querySelector('a[title][href^="/watch?v=' + strIdent + '"], a[title][href^="/shorts/' + strIdent + '"], a[href^="/watch?v=' + strIdent + '"] #video-title[title]');
            if (objTitle === null) {
                console.error('could not find title for video', strIdent)
            } else {
                chrome.runtime.sendMessage({
                    'strMessage': 'youtubeEnsure',
                    'strIdent': strIdent,
                    'strTitle': objTitle.title
                });
            }
        }
    }

    for (var objVideo of objVideocache) {
        var strIdent = objVideo.href.split('&')[0].slice(-11);

        if (boolMarkcache.hasOwnProperty(strIdent) === false) {
            // Initialize to false for now, but fire youtubeLookup message to background,
            // which will reply with youtubeMark message if it's actually already watched.
            boolMarkcache[strIdent] = false;

            chrome.runtime.sendMessage({
                'strMessage': 'youtubeLookup',
                'strIdent': strIdent
            }, function(objResponse) {
                if (objResponse) {
                    mark(objResponse.strIdent, true);
                }
            });
        }

        markStyle(objVideo, boolMarkcache[strIdent]);
    }
};

var mark = function(strIdent, boolMark) {
    console.debug('markForIdent:', strIdent, '=>', boolMark);

    boolMarkcache[strIdent] = boolMark;

    for (var objVideo of document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v=' + strIdent + '"], a.ytd-thumbnail[href^="/shorts/' + strIdent + '"]')) {
        markStyle(objVideo, boolMark);
    }
};

var markStyle = function(objVideo, boolMark) {
    if ((boolMark === true) && (objVideo.classList.contains('youwatch-mark') === false)) {
        objVideo.classList.add('youwatch-mark');

    } else if ((boolMark !== true) && (objVideo.classList.contains('youwatch-mark') !== false)) {
        objVideo.classList.remove('youwatch-mark');

    }
};

// ##########################################################

chrome.runtime.onMessage.addListener(function(objData, sender, sendResponse) {
    if (objData.strMessage === 'youtubeRefresh') {
        refresh();
    }

    if (objData.strMessage === 'youtubeMark') {
        mark(objData.strIdent, true);
    }

    // synchronous response to prevent "The message port closed before a response was received."
    sendResponse(null);
});

// ##########################################################

window.setInterval(function() {
    if (document.hidden === true) {
        return;
    }

    objVideocache = window.document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v="], a.ytd-thumbnail[href^="/shorts/"]');
    objProgresscache = window.document.querySelectorAll('ytd-thumbnail-overlay-resume-playback-renderer');

    if (strLastchange === window.location.href + ':' + window.document.title + ':' + objVideocache.length + ':' + objProgresscache.length) {
        return;
    }

    strLastchange = window.location.href + ':' + window.document.title + ':' + objVideocache.length + ':' + objProgresscache.length;

    refresh();
}, 300);
