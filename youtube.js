'use strict';

let strLastchange = null;
let intWatchdate = {};
const videoObserverMap = new WeakMap();

// ##########################################################

function getVideos(id = "") {
    const document = window.document;
    const selectors = [
        // Regular thumbnails.
        "a.ytd-thumbnail[href^=\"/watch?v=" + id + "\"]",
        "a.yt-lockup-view-model-wiz__content-image[href^=\"/watch?v=" + id + "\"]",

        // Video overlays.
        "a.ytp-ce-covering-overlay[href*=\"/watch?v=" + id + "\"]",

        // Video wall.
        "a.ytp-videowall-still[href*=\"/watch?v=" + id + "\"]",

        // Shorts.
        "a.ytd-thumbnail[href^=\"/shorts/" + id + "\"]",
        "a.ShortsLockupViewModelHostEndpoint[href^=\"/shorts/" + id + "\"]",
        "a.reel-item-endpoint[href^=\"/shorts/" + id + "\"]"
    ];
    const elements = Array.from(document.querySelectorAll(selectors.join(", ")));
    return elements;
}

function getVideoId(video) {
    const id = video.href.split("&")[0].slice(-11);
    return id;
}

function refresh() {
    const videos = getVideos();
    for (let objVideo of videos) {
        let strIdent = getVideoId(objVideo);
        let strTitle = '';

        mark(objVideo, strIdent);

        if (!videoObserverMap.has(objVideo)) {
            addVideoObserver(objVideo);
        }

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

                for (let objVideo of getVideos(objResponse.strIdent)) {
                    mark(objVideo, objResponse.strIdent);
                }
            }
        });
    }
    
    strLastchange = window.location.href + ':' + window.document.title + ':' + videos.length;
}

function mark(objVideo, strIdent) {
    if ((intWatchdate.hasOwnProperty(strIdent) === true) && (objVideo.classList.contains('youwatch-mark') === false)) {
        objVideo.classList.add('youwatch-mark');

        if (intWatchdate[strIdent] !== 0) {
            objVideo.setAttribute('watchdate', ' - ' + new Date(intWatchdate[strIdent]).toISOString().split('T')[0].split('-').join('.'));
        }

    } else if ((intWatchdate.hasOwnProperty(strIdent) !== true) && (objVideo.classList.contains('youwatch-mark') !== false)) {
        objVideo.classList.remove('youwatch-mark');
        objVideo.removeAttribute("watchdate");

    }
}

function addVideoObserver(video) {
    const observer = new MutationObserver(function (mutations, observer) {
        for (const mutation of mutations) {
            if (mutation.type === "attributes" && mutation.attributeName === "href") {
                const id = getVideoId(video);
                mark(video, id);
            }
        }
    });

    observer.observe(video, {attributes: true, attributeFilter: ["href"]});
    videoObserverMap.set(video, observer);
}

// ##########################################################

chrome.runtime.onMessage.addListener(function(objData, objSender, funcResponse) {
    if (objData.strMessage === 'youtubeRefresh') {
        refresh();

    } else if (objData.strMessage === 'youtubeMark') {
        intWatchdate[objData.strIdent] = objData.intTimestamp;

        for (let objVideo of getVideos(objData.strIdent)) {
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

    } else if (strLastchange === window.location.href + ':' + window.document.title + ':' + getVideos().length) {
        return;

    }

    refresh();
}, 300);
