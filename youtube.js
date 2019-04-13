'use strict';

var Youtube = {
	objectPort: null,

	init: function() {
		Youtube.objectPort = chrome.runtime.connect({
			'name': 'youtube'
		});

		Youtube.objectPort.onMessage.addListener(function(objectData) {
			if (objectData.strMessage === 'youtubeEnsure') {
				Youtube.ensureCallback(objectData.objectArguments);
			}

			if (objectData.strMessage === 'youtubeWatch') {
				Youtube.watchCallback(objectData.objectArguments);
			}

			if (objectData.strMessage === 'youtubeLookup') {
				Youtube.lookupCallback(objectData.objectArguments);
			}
		});

		Youtube.clicks();
		Youtube.ensure();
		Youtube.watch();
		Youtube.lookup();
	},
	
	dispel: function() {
		Youtube.objectPort = null;
	},

	clicks: function() {
		for (var objectAnchor of window.document.getElementsByTagName('a')) {
			if (objectAnchor.onclick !== null) {
				continue;
				
			} else if (objectAnchor.getAttribute('href') === null) {
				continue;
				
			} 
			
			objectAnchor.onclick = function(objectEvent) {
				objectEvent.stopPropagation();
			};
		}
	},

	ensure: function() {
		var objectVideos = [];

		for (var objectBadge of window.document.getElementsByTagName('ytd-thumbnail-overlay-playback-status-renderer')) {
			var strIdent = '';
			var strTitle = '';
			
			if (objectBadge.parentNode.parentNode.getAttribute('href') !== null) {
				if (objectBadge.parentNode.parentNode.getAttribute('href').substr(0, 9) === '/watch?v=') {
					strIdent = objectBadge.parentNode.parentNode.getAttribute('href').substr(9).substr(0, 11); // new
				}
			}

			if (objectBadge.parentNode.parentNode.parentNode.parentNode.querySelectorAll('#video-title[title]').length === 1) {
				strTitle = objectBadge.parentNode.parentNode.parentNode.parentNode.querySelectorAll('#video-title[title]')[0].title; // new
			}

			if (strIdent === '') {
				continue;
				
			} else if (strTitle === '') {
				continue;
				
			} else if (objectBadge.parentNode.parentNode.getElementsByTagName('img').length === 0) { // new
				continue;
				
			}
			
			objectVideos.push({
				'strIdent': strIdent,
				'strTitle': strTitle,
			});
		}

		for (var objectBadge of window.document.getElementsByClassName('watched-badge')) {
			var strIdent = '';
			var strTitle = '';
			
			if (objectBadge.parentNode.getAttribute('href') !== null) {
				if (objectBadge.parentNode.getAttribute('href').substr(0, 9) === '/watch?v=') {
					strIdent = objectBadge.parentNode.getAttribute('href').substr(9).substr(0, 11); // old
				}
			}

			if (objectBadge.parentNode.parentNode.parentNode.querySelectorAll('.spf-link[title]').length === 1) {
				strTitle = objectBadge.parentNode.parentNode.parentNode.querySelectorAll('.spf-link[title]')[0].title; // old
			}
			
			if (strIdent === '') {
				continue;
				
			} else if (strTitle === '') {
				continue;
				
			} else if (objectBadge.parentNode.getElementsByTagName('img').length === 0) { // old
				continue;
				
			}

			objectVideos.push({
				'strIdent': strIdent,
				'strTitle': strTitle,
			});
		}

		Youtube.objectPort.postMessage({
			'strMessage': 'youtubeEnsure',
			'objectArguments' : {
				'objectVideos': objectVideos
			}
		});
	},
	
	ensureCallback: function(objectArguments) {

	},
	
	watch: function() {
		var strIdent = '';
		var strTitle = '';
		
		if (window.location !== null) {
			if (window.location.href.split('/watch?v=').length === 2) {
				strIdent = window.location.href.split('/watch?v=')[1].substr(0, 11);
			}
		}
		
		if (window.document.getElementsByTagName('ytd-video-primary-info-renderer').length === 1) {
			if (window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].getElementsByClassName('title').length === 1) {
				strTitle = window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].getElementsByClassName('title')[0].textContent; // new
			}
		}

		if (window.document.getElementById('eow-title') !== null) {
			if (window.document.getElementById('eow-title').getAttribute('title') !== null) {
				strTitle = window.document.getElementById('eow-title').getAttribute('title'); // old
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
		
		Youtube.objectPort.postMessage({
			'strMessage': 'youtubeWatch',
			'objectArguments' : {
				'strIdent': strIdent,
				'longTimestamp': new Date().getTime(),
				'strTitle': strTitle,
				'intCount': null
			}
		});
	},
	
	watchCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		if (objectArguments.intCount > 1) {
			if (window.document.getElementsByTagName('ytd-video-primary-info-renderer').length === 1) {
				var objectBadge = window.document.createElement('div');

				objectBadge.classList.add('yourect-watched-badge');
				objectBadge.id = 'yourect-header-badge';
				objectBadge.style.left = 'auto';
				objectBadge.style.right = '0px';
				objectBadge.style.zIndex = 10000;
				objectBadge.textContent = 'WATCHED';

				window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].appendChild(objectBadge); // new

				window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].style.position = 'relative';
			}

			if (window.document.getElementById('watch-header') !== null) {
				var objectBadge = window.document.createElement('div');

				objectBadge.classList.add('yourect-watched-badge');
				objectBadge.id = 'yourect-header-badge';
				objectBadge.style.left = 'auto';
				objectBadge.style.right = '10px';
				objectBadge.style.zIndex = 10000;
				objectBadge.textContent = 'WATCHED';

				window.document.getElementById('watch-header').appendChild(objectBadge); // old

				window.document.getElementById('watch-header').style.position = 'relative';
			}
		}
	},
	
	lookup: function() {
		var objectVideos = [];

		for (var objectVideo of window.document.getElementsByTagName('a')) {
			var strIdent = '';
			var strTitle = '';

			if (objectVideo.getAttribute('href') !== null) {
				if (objectVideo.getAttribute('href').substr(0, 9) === '/watch?v=') {
					strIdent = objectVideo.getAttribute('href').substr(9).substr(0, 11); 
				}
			}

			{
				strTitle = 'lookup, title can be ignored';
			}

			if (strIdent === '') {
				continue;

			} else if (strTitle === '') {
				return;
				
			} else if (objectVideo.getElementsByTagName('img').length === 0) {
				continue;

			} else if (objectVideo.classList.contains('yourect-watched-marker') === true) {
				continue;

			}

			objectVideo.id = 'YouRect' + '-' + strIdent;

			objectVideos.push({
				'strIdent': strIdent,
				'strTitle': strTitle
			});
		}
		
		Youtube.objectPort.postMessage({
			'strMessage': 'youtubeLookup',
			'objectArguments' : {
				'objectVideos': objectVideos
			}
		});
	},
	
	lookupCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		do {
			var objectVideo = window.document.getElementById('YouRect' + '-' + objectArguments.strIdent);
			
			if (objectVideo === null) {
				break;
			}

			objectVideo.id = 'YouRect' + '-' + objectArguments.strIdent + '-' + 'watched';

			if (objectVideo.getElementsByTagName('img').length === 0) {
				continue;

			} else if (objectVideo.classList.contains('yourect-watched-marker') === true) {
				continue;

			}

			var objectBadge = window.document.createElement('div');
			
			objectBadge.classList.add('yourect-watched-badge');
			objectBadge.textContent = 'WATCHED';
			
			objectVideo.appendChild(objectBadge);

			objectVideo.classList.add('yourect-watched-marker');
		} while (true);
	}
};
Youtube.init();

{
	chrome.runtime.onMessage.addListener(function(objectData) {
		if (objectData.strMessage === 'youtubeUpdate') {
			Youtube.clicks();
			Youtube.ensure();
			Youtube.watch();
			Youtube.lookup();

		} else if (objectData.strMessage === 'youtubeImage') {
			if (window.document.getElementById('YouRect' + '-' + objectData.strIdent) === null) {
				if (window.document.getElementById('YouRect' + '-' + objectData.strIdent + '-' + 'watched') === null) {
					Youtube.lookup();
				}
			}

		}
	});
}