'use strict';

let strLastchange = null;
let intWatchdate = {};
let objObservers = new WeakMap();

// ##########################################################

let videos = function(strIdent) {
    return Array.from(window.document.querySelectorAll(([
        'a.ytd-thumbnail[href^="/watch?v=' + strIdent + '"]', // regular
        'a.yt-lockup-view-model-wiz__content-image[href^="/watch?v=' + strIdent + '"]', // regular
        'ytd-compact-video-renderer a.yt-simple-endpoint[href^="/watch?v=' + strIdent + '"]', // regular
        'a.ytp-ce-covering-overlay[href*="/watch?v=' + strIdent + '"]', // overlays
        'a.ytp-videowall-still[href*="/watch?v=' + strIdent + '"]', // videowall
        'a.ytd-thumbnail[href^="/shorts/' + strIdent + '"]', // shorts
        'a.ShortsLockupViewModelHostEndpoint[href^="/shorts/' + strIdent + '"]', // shorts
        'a.reel-item-endpoint[href^="/shorts/' + strIdent + '"]', // shorts
        'a.media-item-thumbnail-container[href^="/watch?v=' + strIdent + '"]', // mobile
    ]).join(', ')));
};

let refresh = function() {
    let objVideos = videos('');

    for (let objVideo of objVideos) {
        let strIdent = objVideo.href.split('&')[0].slice(-11);
        let strTitle = '';

        mark(objVideo, strIdent);

        observe(objVideo);

        if (intWatchdate.hasOwnProperty(strIdent) === true) {
            continue;
        }

        for (let intTitle = 0, objTitle = objVideo.parentNode; intTitle < 5; intTitle += 1, objTitle = objTitle.parentNode) {
            if (objTitle.querySelector('#video-title') !== null) {
                strTitle = objTitle.querySelector('#video-title').innerText.trim(); break;
            }
        }

        chrome.runtime.sendMessage({
            'strMessage': 'youtubeLookup',
            'strIdent': strIdent,
            'strTitle': strTitle
        }, function(objResponse) {
            if (objResponse !== null) {
                intWatchdate[objResponse.strIdent] = objResponse.intTimestamp;

                for (let objVideo of videos(objResponse.strIdent)) {
                    mark(objVideo, objResponse.strIdent);
                }
            }
        });
    }
    
    strLastchange = window.location.href + ':' + window.document.title + ':' + objVideos.length;
};

let mark = function(objVideo, strIdent) {
    if ((intWatchdate.hasOwnProperty(strIdent) === true) && (objVideo.classList.contains('youwatch-mark') === false)) {
        objVideo.classList.add('youwatch-mark');

        if (intWatchdate[strIdent] !== 0) {
            objVideo.setAttribute('watchdate', ' - ' + new Date(intWatchdate[strIdent]).toISOString().split('T')[0].split('-').join('.'));
        }

    } else if ((intWatchdate.hasOwnProperty(strIdent) !== true) && (objVideo.classList.contains('youwatch-mark') !== false)) {
        objVideo.classList.remove('youwatch-mark');

        if (objVideo.hasAttribute('watchdate') === true) {
            objVideo.removeAttribute('watchdate');
        }

    }
};

let observe = function(objVideo) {
    if (objObservers.has(objVideo) === true) {
        return;
    }

    let objObserver = new MutationObserver(function() {
        mark(objVideo, objVideo.href.split('&')[0].slice(-11));
    });

    objObserver.observe(objVideo, {'attributes': true, 'attributeFilter': ['href']});

    objObservers.set(objVideo, objObserver);
};

// ##########################################################

chrome.runtime.onMessage.addListener(function(objData, objSender, funcResponse) {
    if (objData.strMessage === 'youtubeRefresh') {
        refresh();

    } else if (objData.strMessage === 'youtubeMark') {
        intWatchdate[objData.strIdent] = objData.intTimestamp;

        for (let objVideo of videos(objData.strIdent)) {
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

    } else if (strLastchange === window.location.href + ':' + window.document.title + ':' + videos('').length) {
        return;

    }

    refresh();
}, 300);
