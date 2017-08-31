'use strict';

var Youtube = {
	objectPort: null,

	init: function() {
		{
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
		}
		
		{
			Youtube.clicks();

			Youtube.ensure();

			Youtube.watch();

			Youtube.lookup();
		}
	},
	
	dispel: function() {
		{
			Youtube.objectPort = null;
		}
	},

	clicks: function() {
		{
			var objectAnchors = window.document.getElementsByTagName('a');
			
			for (var intFor1 = 0; intFor1 < objectAnchors.length; intFor1 += 1) {
				if (objectAnchors[intFor1].onclick !== null) {
					continue;
					
				} else if (objectAnchors[intFor1].getAttribute('href') === null) {
					continue;
					
				} 
				
				objectAnchors[intFor1].onclick = function(objectEvent) {
					objectEvent.stopPropagation();
				};
			}
		}
	},

	ensure: function() {
		var strIdentities = [];

		{
			var objectBadges = window.document.getElementsByTagName('ytd-thumbnail-overlay-playback-status-renderer'); // new

			for (var intFor1 = 0; intFor1 < objectBadges.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (objectBadges[intFor1].parentNode.parentNode.getAttribute('href') !== null) {
						if (objectBadges[intFor1].parentNode.parentNode.getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = objectBadges[intFor1].parentNode.parentNode.getAttribute('href').substr(9).substr(0, 11); 
						}
					}
				}
				
				if (strIdent === '') {
					continue;
					
				} else if (objectBadges[intFor1].parentNode.parentNode.getElementsByTagName('img').length === 0) {
					continue;
					
				}
				
				{
					strIdentities.push(strIdent);
				}
			}
		}

		{
			var objectBadges = window.document.getElementsByClassName('watched-badge'); // old
			
			for (var intFor1 = 0; intFor1 < objectBadges.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (objectBadges[intFor1].parentNode.getAttribute('href') !== null) {
						if (objectBadges[intFor1].parentNode.getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = objectBadges[intFor1].parentNode.getAttribute('href').substr(9).substr(0, 11); 
						}
					}
				}
				
				if (strIdent === '') {
					continue;
					
				} else if (objectBadges[intFor1].parentNode.getElementsByTagName('img').length === 0) {
					continue;
					
				}
				
				{
					strIdentities.push(strIdent);
				}
			}
		}

		{
			var objectProgressbars = window.document.getElementsByTagName('ytd-thumbnail-overlay-resume-playback-renderer'); // new
			
			for (var intFor1 = 0; intFor1 < objectProgressbars.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (objectProgressbars[intFor1].parentNode.parentNode.getAttribute('href') !== null) {
						if (objectProgressbars[intFor1].parentNode.parentNode.getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = objectProgressbars[intFor1].parentNode.parentNode.getAttribute('href').substr(9).substr(0, 11); 
						}
					}
				}
				
				if (strIdent === '') {
					continue;
					
				} else if (objectProgressbars[intFor1].parentNode.parentNode.getElementsByTagName('img').length === 0) {
					continue;
					
				}
				
				{
					strIdentities.push(strIdent);
				}
			}
		}
		
		{
			var objectProgressbars = window.document.getElementsByClassName('resume-playback-progress-bar'); // old
			
			for (var intFor1 = 0; intFor1 < objectProgressbars.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (objectProgressbars[intFor1].parentNode.children[0].getAttribute('href') !== null) {
						if (objectProgressbars[intFor1].parentNode.children[0].getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = objectProgressbars[intFor1].parentNode.children[0].getAttribute('href').substr(9).substr(0, 11); 
						}
					}
				}
				
				if (strIdent === '') {
					continue;
					
				} else if (objectProgressbars[intFor1].parentNode.children[0].getElementsByTagName('img').length === 0) {
					continue;
					
				}
				
				{
					strIdentities.push(strIdent);
				}
			}
		}
		
		{
			Youtube.objectPort.postMessage({
				'strMessage': 'youtubeEnsure',
				'objectArguments' : {
					'strIdentities': strIdentities
				}
			});
		}
	},
	
	ensureCallback: function(objectArguments) {

	},
	
	watch: function() {
		var strIdent = '';
		var strTitle = '';
		
		{
			if (window.location !== null) {
				if (window.location.href.split('/watch?v=').length === 2) {
					strIdent = window.location.href.split('/watch?v=')[1].substr(0, 11);
				}
			}
		}
		
		{
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
		
		{
			Youtube.watch.strIdent = strIdent;
			
			Youtube.watch.strTitle = strTitle;
		}
		
		{
			if (window.document.getElementById('yourect-header-badge') !== null) {
				window.document.getElementById('yourect-header-badge').parentNode.removeChild(window.document.getElementById('yourect-header-badge'));
			}
		}
		
		{
			Youtube.objectPort.postMessage({
				'strMessage': 'youtubeWatch',
				'objectArguments' : {
					'strIdent': strIdent,
					'longTimestamp': new Date().getTime(),
					'strTitle': strTitle,
					'intCount': null
				}
			});
		}
	},
	
	watchCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			if (objectArguments.intCount > 1) {
				if (window.document.getElementsByTagName('ytd-video-primary-info-renderer').length === 1) { // new
					var objectBadge = window.document.createElement('div');
					
					{
						objectBadge.classList.add('yourect-watched-badge');

						objectBadge.textContent = 'WATCHED';

						objectBadge.id = 'yourect-header-badge';

						objectBadge.style.left = 'auto';
						objectBadge.style.right = '0px';
						objectBadge.style.zIndex = 10000;
					}

					{
						window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].style.position = 'relative';
					}
					
					window.document.getElementsByTagName('ytd-video-primary-info-renderer')[0].appendChild(objectBadge);
				}

				if (window.document.getElementById('watch-header') !== null) { // old
					var objectBadge = window.document.createElement('div');
					
					{
						objectBadge.classList.add('yourect-watched-badge');

						objectBadge.textContent = 'WATCHED';

						objectBadge.id = 'yourect-header-badge';

						objectBadge.style.left = 'auto';
						objectBadge.style.right = '10px';
						objectBadge.style.zIndex = 10000;
					}

					{
						window.document.getElementById('watch-header').style.position = 'relative';
					}
					
					window.document.getElementById('watch-header').appendChild(objectBadge);
				}
			}
		}
	},
	
	lookup: function() {
		var strIdentities = [];
		
		{
			var objectVideo = window.document.getElementsByTagName('a');
			
			for (var intFor1 = 0; intFor1 < objectVideo.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (objectVideo[intFor1].getAttribute('href') !== null) {
						if (objectVideo[intFor1].getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = objectVideo[intFor1].getAttribute('href').substr(9).substr(0, 11); 
						}
					}
				}
				
				if (strIdent === '') {
					continue;
					
				} else if (objectVideo[intFor1].getElementsByTagName('img').length === 0) {
					continue;

				} else if (objectVideo[intFor1].classList.contains('yourect-watched-marker') === true) {
					continue;
					
				}
				
				{
					objectVideo[intFor1].id = 'YouRect' + '-' + strIdent;
				}
				
				{
					strIdentities.push(strIdent);
				}
			}
		}
		
		{
			Youtube.objectPort.postMessage({
				'strMessage': 'youtubeLookup',
				'objectArguments' : {
					'strIdentities': strIdentities
				}
			});
		}
	},
	
	lookupCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			do {
				var objectVideo = window.document.getElementById('YouRect' + '-' + objectArguments.strIdent);
				
				if (objectVideo === null) {
					break;
				}
				
				{
					objectVideo.id = 'YouRect' + '-' + objectArguments.strIdent + '-' + 'watched';
				}
				
				if (objectVideo.getElementsByTagName('img').length === 0) {
					continue;

				} else if (objectVideo.classList.contains('yourect-watched-marker') === true) {
					continue;

				}

				{
					objectVideo.classList.add('yourect-watched-marker');
				}
				
				{
					var objectBadge = window.document.createElement('div');
					
					{
						objectBadge.classList.add('yourect-watched-badge');

						objectBadge.textContent = 'WATCHED';
					}
					
					objectVideo.appendChild(objectBadge);
				}
			} while (true);
		}
	}
};
Youtube.init();

{
	chrome.runtime.onMessage.addListener(function(objectData) {
		if (objectData.strMessage === 'youtubeUpdate') {
			{
				Youtube.clicks();

				Youtube.ensure();

				Youtube.watch();

				Youtube.lookup();
			}

		} else if (objectData.strMessage === 'youtubeImage') {
			{
				if (window.document.getElementById('YouRect' + '-' + objectData.strIdent) === null) {
					if (window.document.getElementById('YouRect' + '-' + objectData.strIdent + '-' + 'watched') === null) {
						Youtube.lookup();
					}
				}
			}

		}
	});
}