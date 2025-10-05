'use strict';

let strLastchange = null;
let intWatchdate = {};
let objObservers = new WeakMap();

// ##########################################################

let videos = function(strIdent) {
    return Array.from(window.document.querySelectorAll(([
        'a.yt-lockup-view-model__content-image[href^="/watch?v=' + strIdent + '"]', // regular
        'a.ytd-thumbnail[href^="/watch?v=' + strIdent + '"]', // list
        'a.reel-item-endpoint[href^="/shorts/' + strIdent + '"]', // shorts
        'a.ytp-videowall-still[href*="/watch?v=' + strIdent + '"]', // videowall
        'a.ytp-ce-covering-overlay[href*="/watch?v=' + strIdent + '"]', // overlays
        'a.media-item-thumbnail-container[href*="/watch?v=' + strIdent + '"]', // mobile
        'a.YtmCompactMediaItemImage[href*="/watch?v=' + strIdent + '"]', // mobile
    ]).join(', ')));
};

let refresh = async function() {
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

        await chrome.runtime.sendMessage({
            'strMessage': 'youtubeLookup',
            'strIdent': strIdent,
            'strTitle': strTitle,
        }, function(objResponse) {
            if ((objResponse === null) || (objResponse === undefined)) {
                return;
            }

            intWatchdate[objResponse.strIdent] = objResponse.intTimestamp;

            for (let objVideo of videos(objResponse.strIdent)) {
                mark(objVideo, objResponse.strIdent);
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

    objObserver.observe(objVideo, { 'attributes': true, 'attributeFilter': ['href'] });

    objObservers.set(objVideo, objObserver);
};

// ##########################################################

document.addEventListener('youtubeProgress', async function(objEvent) {
    await chrome.runtime.sendMessage({
        'strMessage': 'youtubeProgress',
        'strIdent': objEvent.detail['strIdent'],
        'strTitle': objEvent.detail['strTitle'],
        'boolEnsure': true,
    }, function(objResponse) {
        // ...
    });

    if (false) {
        window.setTimeout(function() {
            for (let objElement of document.querySelectorAll('span, a, yt-formatted-string')) {
                if (objElement.textContent.includes(objEvent.detail['strTitle']) === true) {
                    objElement.textContent = 'HOOK';
                }
            }
        }, 3000);
    }
});

// ##########################################################

chrome.runtime.onMessage.addListener(async function(objData, objSender, funcResponse) {
    if (objData.strMessage === 'youtubeRefresh') {
        await refresh();

    } else if (objData.strMessage === 'youtubeMark') {
        intWatchdate[objData.strIdent] = objData.intTimestamp;

        for (let objVideo of videos(objData.strIdent)) {
            mark(objVideo, objData.strIdent);
        }

    }

    funcResponse(null);
});

// ##########################################################

document.addEventListener('visibilitychange', async function() {
    if (document.visibilityState === 'visible') {
        await refresh();
    }
});

// ##########################################################

let eventhandler = function() {
    for (let delay = 0; delay < 3000 + 1; delay += 300) {
        window.setTimeout(refresh, delay); // refreshing right away might have been too early so instead we do it brute force
    }
};

document.addEventListener('yt-service-request-completed', eventhandler); // https://github.com/sota2501/youtube-chat-ex/blob/master/docs/event.md
document.addEventListener('yt-navigate-finish', eventhandler); // https://github.com/sota2501/youtube-chat-ex/blob/master/docs/event.md
document.addEventListener('yt-page-type-changed', eventhandler); // https://github.com/sota2501/youtube-chat-ex/blob/master/docs/event.md
document.addEventListener('yt-page-data-updated', eventhandler); // https://github.com/sota2501/youtube-chat-ex/blob/master/docs/event.md
document.addEventListener('yt-visibility-refresh', eventhandler); // https://github.com/1natsu172/Outside-YouTube-Player-Bar/blob/develop/src/core/services/eventEffectServices/libs/YT_EVENTS.ts

// ##########################################################

window.setInterval(async function() {
    if (document.hidden === true) {
        return;

    } else if (strLastchange === window.location.href + ':' + window.document.title + ':' + videos('').length) {
        return;

    }

    await refresh();
}, 300);
