'use strict';

var strLastchange = null;
var objVideocache = [];
var objProgresscache = [];
var boolMarkcache = {};

// ##########################################################

var refresh = function() {
    for (var objProgress of objProgresscache) {
        var objVideo = objProgress.parentNode.parentNode;

        if (objVideo.matches('a.ytd-thumbnail') === false) continue;

        const lastSlashIndex = objVideo.href.lastIndexOf('/');
        const strIdent = objVideo.href.substring(lastSlashIndex).replace('/', '').replace('watch?v=', '');

        if (boolMarkcache.hasOwnProperty(strIdent) === false) {
            boolMarkcache[strIdent] = false;
        }

        if (boolMarkcache[strIdent] === false) {
            boolMarkcache[strIdent] = true;

            chrome.runtime.sendMessage({
                'strMessage': 'youtubeEnsure',
                'strIdent': strIdent,
                'strTitle': document.querySelector('a[title][href$="' + strIdent + '"]').title
            });
        }
    }

    for (var objVideo of objVideocache) {
        var strIdent = objVideo.href.substr(32, 11);

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

        for (var objVideo of document.querySelectorAll('a.ytd-thumbnail[href$="' + objData.strIdent + '"]')) {
            mark(objVideo, true);
        }
    } 
});

// ##########################################################

window.setInterval(function() {
    if (document.hidden === true) {
        return;
    }

    objVideocache = window.document.querySelectorAll('a.ytd-thumbnail');
    objProgresscache = window.document.querySelectorAll('ytd-thumbnail-overlay-resume-playback-renderer');

    if (strLastchange === window.location.href + ':' + window.document.title + ':' + objVideocache.length + ':' + objProgresscache.length) {
        return;
    }

    strLastchange = window.location.href + ':' + window.document.title + ':' + objVideocache.length + ':' + objProgresscache.length;

    refresh();
}, 300);
