'use strict';

var Youtube = {
	init: function() {
		{
			self.port.on('youtubeWatch', Youtube.watchCallback);
			
			self.port.on('youtubeLookup', Youtube.lookupCallback);
		}
		
		{
			Youtube.watch();
			
			Youtube.lookup();
		}
	},
	
	dispel: function() {
		
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
			if (window.document.getElementById('eow-title') !== null) {
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
			if (window.document.getElementById('watch-header') !== null) {
				if (window.document.getElementById('watch-header-badge') !== null) {
					window.document.getElementById('watch-header').removeChild(window.document.getElementById('watch-header-badge'));
				}
			}
		}
		
		{
			self.port.emit('youtubeWatch', {
				'longTimestamp': new Date().getTime(),
				'strIdent': strIdent,
				'strTitle': strTitle
			});
		}
	},
	
	watchCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			if (objectArguments.intCount > 1) {
				if (window.document.getElementById('watch-header') !== null) {
					var elementBadge = window.document.createElement('div')
					
					elementBadge.classList.add('watched-badge');
					elementBadge.id = 'player-watched-badge';
					elementBadge.style.left = 'auto';
					elementBadge.style.right = '10px';
					elementBadge.style.zIndex = 10000;
					elementBadge.innerHTML = 'WATCHED';
					
					window.document.getElementById('watch-header').style.position = 'relative';
					window.document.getElementById('watch-header').appendChild(elementBadge);
				}
			}
		}
	},
	
	lookup: function() {
		{
			var elementHandle = window.document.getElementsByTagName('a');
			
			for (var intFor1 = 0; intFor1 < elementHandle.length; intFor1 += 1) {
				var strIdent = '';
				
				{
					if (elementHandle[intFor1].getAttribute('href') !== null) {
						if (elementHandle[intFor1].getAttribute('href').substr(0, 9) === '/watch?v=') {
							strIdent = elementHandle[intFor1].getAttribute('href').substr(9).split('&')[0]; 
						}
					}
				}
				
				if (strIdent === '') {
					continue;
					
				} else if (elementHandle[intFor1].getElementsByTagName('img').length === 0) {
					continue;
					
				} else if (elementHandle[intFor1].classList.contains('watched') === true) {
					continue;
					
				}
				
				{
					elementHandle[intFor1].id = 'YouRect' + '-' + strIdent;
				}
				
				{
					self.port.emit('youtubeLookup', {
						'strIdent': strIdent
					});
				}
			}
		}
	},
	
	lookupCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			do {
				var elementHandle = window.document.getElementById('YouRect' + '-' + objectArguments.strIdent);
				
				if (elementHandle === null) {
					break;
				}
				
				{
					elementHandle.id = null;
				}
				
				if (elementHandle.getElementsByTagName('img').length === 0) {
					continue;
					
				} else if (elementHandle.classList.contains('watched') === true) {
					continue;
					
				}
				
				{
					elementHandle.classList.add('watched');
				}
				
				{
					var elementBadge = window.document.createElement('div')
					
					elementBadge.classList.add('watched-badge');
					elementBadge.innerHTML = 'WATCHED';
					
					elementHandle.appendChild(elementBadge);
				}
			} while (true);
		}
	}
};
Youtube.init();

{
	var observerHandle = new MutationObserver(function() {
		if (observerHandle.intThreshold === 0) {
			observerHandle.disconnect();
			
			return;
		}
		
		{
			observerHandle.intThreshold -= 1;
		}
		
		{
			Youtube.watch();
			
		   	Youtube.lookup();
		}
	});
	
	window.document.onclick = function(eventHandle) {
		if (eventHandle.button !== 0) {
			return;
		}
		
		{
			observerHandle.intThreshold = 8;
		}
		
		{
			observerHandle.disconnect();
			
			observerHandle.observe(window.document, {
				'childList': true,
				'subtree': true
			});
		}
	};
	
	window.setInterval(function() {
		if (observerHandle.strHref === window.location.href) {
			return;
		}
		
		{
			observerHandle.strHref = window.location.href;
		}
		
		{
			observerHandle.intThreshold = 8;
		}
		
		{
			observerHandle.disconnect();
			
			observerHandle.observe(window.document, {
				'childList': true,
				'subtree': true
			});
		}
	}, 500);
}