'use strict';

var Youtube = {
	objPort: null,

	init: function() {
		Youtube.objPort = chrome.runtime.connect({
			'name': 'youtube'
		});

		Youtube.objPort.onMessage.addListener(function(objData) {
			if (objData.strMessage === 'youtubeEnsure') {
				Youtube.ensureCallback(objData.objResponse);
			}

			if (objData.strMessage === 'youtubeWatch') {
				Youtube.watchCallback(objData.objResponse);
			}

			if (objData.strMessage === 'youtubeLookup') {
				Youtube.lookupCallback(objData.objResponse);
			}
		});

		Youtube.clicks();
		Youtube.ensure();
		Youtube.watch();
		Youtube.lookup();
	},
	
	dispel: function() {
		Youtube.objPort = null;
	},

	clicks: function() {
		return; // DISABLED

		for (var objAnchor of window.document.getElementsByTagName('a')) {
			if (objAnchor.onclick !== null) {
				continue;
				
			} else if (objAnchor.getAttribute('href') === null) {
				continue;
				
			} 
			
			objAnchor.onclick = function(objEvent) {
				objEvent.stopPropagation();
			};
		}
	},

	ensure: function() {
		return; // DISABLED

		var objVideos = [];

		for (var objBadge of window.document.getElementsByTagName('ytd-thumbnail-overlay-playback-status-renderer')) {
			var strIdent = '';
			var strTitle = '';
			
			if (objBadge.parentNode.parentNode.getAttribute('href') !== null) {
				if (objBadge.parentNode.parentNode.getAttribute('href').substr(0, 9) === '/watch?v=') {
					strIdent = objBadge.parentNode.parentNode.getAttribute('href').substr(9).substr(0, 11);
				}
			}

			if (objBadge.parentNode.parentNode.parentNode.parentNode.querySelectorAll('#video-title[title]').length === 1) {
				strTitle = objBadge.parentNode.parentNode.parentNode.parentNode.querySelectorAll('#video-title[title]')[0].title;
			}

			if (strIdent === '') {
				continue;
				
			} else if (strTitle === '') {
				continue;
				
			} else if (objBadge.parentNode.parentNode.getElementsByTagName('img').length === 0) {
				continue;
				
			}
			
			objVideos.push({
				'strIdent': strIdent,
				'strTitle': strTitle,
			});
		}

		Youtube.objPort.postMessage({
			'strMessage': 'youtubeEnsure',
			'objRequest' : {
				'objVideos': objVideos
			}
		});
	},
	
	ensureCallback: function(objResponse) {

	},
	
	watch: function() {
		return; // DISABLED

		var strIdent = '';
		var strTitle = '';
		
		if (window.location !== null) {
			if (window.location.href.split('/watch?v=').length === 2) {
				strIdent = window.location.href.split('/watch?v=')[1].substr(0, 11);
			}
		}
		
		if (window.document.getElementsByTagName('ytd-video-primary-info-renderer').length === 1) {
			if (window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].getElementsByClassName('title').length === 1) {
				strTitle = window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].getElementsByClassName('title')[0].textContent;
			}
		}

		if (strIdent === '') {
			return;
			
		} else if (strTitle === '') {
			return;
			
		} else if (strIdent === Youtube.watch.strIdent) {
			return;
			
		} else if (strTitle === Youtube.watch.strTitle) {
			return;
			
		}
		
		Youtube.watch.strIdent = strIdent;
		Youtube.watch.strTitle = strTitle;
		
		if (window.document.getElementById('yourect-header-badge') !== null) {
			window.document.getElementById('yourect-header-badge').parentNode.removeChild(window.document.getElementById('yourect-header-badge'));
		}
		
		Youtube.objPort.postMessage({
			'strMessage': 'youtubeWatch',
			'objRequest' : {
				'objVideo': {
					'strIdent': strIdent,
					'longTimestamp': new Date().getTime(),
					'strTitle': strTitle,
					'intCount': null
				}
			}
		});
	},
	
	watchCallback: function(objResponse) {
		if (objResponse === null) {
			return;
		}
		
		if (objResponse.intCount > 1) {
			if (window.document.getElementsByTagName('ytd-video-primary-info-renderer').length === 1) {
				var objBadge = window.document.createElement('div');

				objBadge.classList.add('yourect-watched-badge');
				objBadge.id = 'yourect-header-badge';
				objBadge.style.left = 'auto';
				objBadge.style.right = '0px';
				objBadge.style.zIndex = 10000;
				objBadge.textContent = 'WATCHED';

				window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].appendChild(objBadge);

				window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].style.position = 'relative';
			}
		}
	},
	
	lookup: function() {
		return; // DISABLED

		var objVideos = [];

		for (var objVideo of window.document.getElementsByTagName('a')) {
			var strIdent = '';
			var strTitle = '';

			if (objVideo.getAttribute('href') !== null) {
				if (objVideo.getAttribute('href').substr(0, 9) === '/watch?v=') {
					strIdent = objVideo.getAttribute('href').substr(9).substr(0, 11); 
				}
			}

			{
				strTitle = 'lookup, title can be ignored';
			}

			if (strIdent === '') {
				continue;

			} else if (strTitle === '') {
				return;
				
			} else if (objVideo.getElementsByTagName('img').length === 0) {
				continue;

			} else if (objVideo.classList.contains('yourect-watched-marker') === true) {
				continue;

			}

			objVideo.id = 'YouRect' + '-' + strIdent;

			objVideos.push({
				'strIdent': strIdent,
				'strTitle': strTitle
			});
		}
		
		Youtube.objPort.postMessage({
			'strMessage': 'youtubeLookup',
			'objRequest' : {
				'objVideos': objVideos
			}
		});
	},
	
	lookupCallback: function(objResponse) {
		if (objResponse === null) {
			return;
		}
		
		while (true) {
			var objVideo = window.document.getElementById('YouRect' + '-' + objResponse.strIdent);
			
			if (objVideo === null) {
				break;
			}

			objVideo.id = 'YouRect' + '-' + objResponse.strIdent + '-' + 'watched';

			if (objVideo.getElementsByTagName('img').length === 0) {
				continue;

			} else if (objVideo.classList.contains('yourect-watched-marker') === true) {
				continue;

			}

			var objBadge = window.document.createElement('div');
			
			objBadge.classList.add('yourect-watched-badge');
			objBadge.textContent = 'WATCHED';
			
			objVideo.appendChild(objBadge);

			objVideo.classList.add('yourect-watched-marker');
		}
	}
};
Youtube.init();

chrome.runtime.onMessage.addListener(function(objData) {
	if (objData.strMessage === 'youtubeUpdate') {
		Youtube.ensure();
		Youtube.watch();
		Youtube.lookup();

	} else if (objData.strMessage === 'youtubeImage') {
		var objImage = window.document.querySelector('img[src="' + objData.strLink + '"]');

		if (objImage === null) {
			return;
		}

		var objVideo = objImage.closest('a.ytd-thumbnail');

		if (objVideo === null) {
			return;
		}

		if (objData.boolWatched === true) {
			var objBadge = window.document.createElement('div');

			objBadge.classList.add('yourect-watched-badge');
			objBadge.textContent = 'WATCHED';

			objVideo.appendChild(objBadge);

			objVideo.classList.add('yourect-watched-marker'); // TODO: conditional

		} else if (objData.boolWatched === true) {
			var objProgress = objVideo.querySelector('.ytd-thumbnail-overlay-resume-playback-renderer');

			if (objProgress === null) {
				return;
			}

			//TODO: mark as watched

		}


		/*if (window.document.getElementById('YouRect' + '-' + objData.strIdent) === null) {
			if (window.document.getElementById('YouRect' + '-' + objData.strIdent + '-' + 'watched') === null) {
				Youtube.lookup();
			}
		}*/

	}
});
