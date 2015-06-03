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
			if (window.document.querySelector('#eow-title') !== null) {
				if (window.document.querySelector('#eow-title').getAttribute('title') !== null) {
					strTitle = window.document.querySelector('#eow-title').getAttribute('title');
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
			self.port.emit('youtubeWatch', {
				'longTimestamp': new Date().getTime(),
				'strIdent': strIdent,
				'strTitle': strTitle,
				'intCount': 1
			});
		}
	},
	
	watchCallback: function(objectArguments) {
		
	},
	
	lookup: function() {
		{
			var elementHandle = window.document.querySelectorAll('a[href]');
			
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
					
				} else if (elementHandle[intFor1].querySelector('img') === null) {
					continue;
					
				} else if (elementHandle[intFor1].classList.contains('watched') === true) {
					continue;
					
				}
				
				{
					elementHandle[intFor1].id = 'YouRect' + '-' + strIdent;
				}
				
				{
					elementHandle[intFor1].onmousedown = function(eventHandle) {
						if (eventHandle.button !== 0) {
							if (eventHandle.button !== 1) {
								return;
							}
						}
						
						if (this.querySelector('img') === null) {
							return;
							
						} else if (this.classList.contains('watched') === true) {
							return;
							
						}
						
						{
							this.classList.add('watched');
						}
						
						{
							var elementBadge = window.document.createElement('div')
							
							elementBadge.classList.add('watched-badge');
							elementBadge.innerHTML = 'WATCHED';
							
							this.appendChild(elementBadge);
						}
					};
				}
				
				{
					self.port.emit('youtubeLookup', {
						'intIdent': 0,
						'longTimestamp': 0,
						'strIdent': strIdent,
						'strTitle': '',
						'intCount': 0
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
			if (window.document.querySelector('#' + 'YouRect' + '-' + objectArguments.strIdent) !== null) {
				window.document.querySelector('#' + 'YouRect' + '-' + objectArguments.strIdent).onmousedown({
					'button': 0
				});
			}
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