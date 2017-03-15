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

	ensure: function() {
		var strIdentities = [];

		{
			var objectBadges = document.getElementsByClassName('watched-badge');

			for (var intFor1 = 0; intFor1 < objectBadges.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (objectBadges[intFor1].parentNode.getAttribute('href') !== null) {
						if (objectBadges[intFor1].parentNode.getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = objectBadges[intFor1].parentNode.getAttribute('href').substr(9).split('&')[0]; 
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
			var objectProgressbars = document.getElementsByClassName('resume-playback-progress-bar');

			for (var intFor1 = 0; intFor1 < objectProgressbars.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (objectProgressbars[intFor1].parentNode.children[0].getAttribute('href') !== null) {
						if (objectProgressbars[intFor1].parentNode.children[0].getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = objectProgressbars[intFor1].parentNode.children[0].getAttribute('href').substr(9).split('&')[0]; 
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
					strIdent = window.location.href.split('/watch?v=')[1].split('&')[0]; 
				}
			}
		}
		
		{
			if (window.document.getElementById('info') !== null) { // new
				if (window.document.getElementById('info').getElementsByClassName('title').length === 1) {
					strTitle = window.document.getElementById('info').getElementsByClassName('title')[0].textContent
				}
			}

			if (window.document.getElementById('eow-title') !== null) { // old
				if (window.document.getElementById('eow-title').getAttribute('title') !== null) {
					strTitle = window.document.getElementById('eow-title').getAttribute('title');
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
			if (window.document.getElementById('info') !== null) { // new
				if (window.document.getElementById('watch-header-badge') !== null) {
					window.document.getElementById('watch-header').removeChild(window.document.getElementById('watch-header-badge'));
				}
			}

			if (window.document.getElementById('watch-header') !== null) { // old
				if (window.document.getElementById('watch-header-badge') !== null) {
					window.document.getElementById('watch-header').removeChild(window.document.getElementById('watch-header-badge'));
				}
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
				if (window.document.getElementById('info') !== null) { // new
					var objectBadge = window.document.createElement('div')
					
					{
						objectBadge.classList.add('watched-badge');

						objectBadge.id = 'watch-header-badge';

						objectBadge.style.left = 'auto';
						objectBadge.style.right = '0px';
						objectBadge.style.zIndex = 10000;

						objectBadge.textContent = 'WATCHED';
					}

					{
						window.document.getElementById('watch-header').style.position = 'relative';
					}
					
					window.document.getElementById('watch-header').appendChild(objectBadge);
				}

				if (window.document.getElementById('watch-header') !== null) { // old
					var objectBadge = window.document.createElement('div')
					
					{
						objectBadge.classList.add('watched-badge');

						objectBadge.id = 'watch-header-badge';

						objectBadge.style.left = 'auto';
						objectBadge.style.right = '10px';
						objectBadge.style.zIndex = 10000;

						objectBadge.textContent = 'WATCHED';
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
							strIdent = objectVideo[intFor1].getAttribute('href').substr(9).split('&')[0]; 
						}
					}
				}
				
				if (strIdent === '') {
					continue;
					
				} else if (objectVideo[intFor1].getElementsByTagName('img').length === 0) {
					continue;

				} else if (objectVideo[intFor1].getElementsByClassName('watched-badge').length !== 0) {
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
					objectVideo.id = null;
				}
				
				if (objectVideo.getElementsByTagName('img').length === 0) {
					continue;

				} else if (objectVideo.getElementsByClassName('watched-badge').length !== 0) {
					continue;

				}
				
				{
					objectVideo.classList.add('watched');
				}
				
				{
					var objectBadge = window.document.createElement('div')
					
					{
						objectBadge.classList.add('watched-badge');

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
				Youtube.ensure();

				Youtube.watch();

				Youtube.lookup();
			}
		}
	});
}