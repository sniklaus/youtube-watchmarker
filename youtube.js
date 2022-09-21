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
            boolMarkcache[strIdent] = false;
        }

        mark(objVideo, boolMarkcache[strIdent]);
    }
};

var mark = function(objVideo, boolMark) {
    if ((boolMark === true) && (objVideo.classList.contains('youwatch-mark') === false)) {
        objVideo.classList.add('youwatch-mark');

    } else if ((boolMark !== true) && (objVideo.classList.contains('youwatch-mark') !== false)) {
        objVideo.classList.remove('youwatch-mark');

    }
};

// ##########################################################

chrome.runtime.onMessage.addListener(function(objData) {
    if (objData.strMessage === 'youtubeRefresh') {
        refresh();
    }

    if (objData.strMessage === 'youtubeMark') {
        boolMarkcache[objData.strIdent] = true;

        for (var objVideo of document.querySelectorAll('a.ytd-thumbnail[href^="/watch?v=' + objData.strIdent + '"], a.ytd-thumbnail[href^="/shorts/' + objData.strIdent + '"]')) {
            mark(objVideo, true);
        }
    } 
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
