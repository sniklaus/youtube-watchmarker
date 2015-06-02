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
		var objectArguments = {
			'longTimestamp': new Date().getTime(),
			'strIdent': '',
			'strTitle': '',
			'intCount': 1
		};
		
		{
			if (window.location !== null) {
				if (window.location.href.split('/watch?v=').length === 2) {
					objectArguments.strIdent = window.location.href.split('/watch?v=')[1].split('&')[0]; 
				}
			}
		}
		
		{
			if (window.document.querySelector('#eow-title') !== null) {
				if (window.document.querySelector('#eow-title').getAttribute('title') !== null) {
					objectArguments.strTitle = window.document.querySelector('#eow-title').getAttribute('title');
				}
			}
		}
		
		if (objectArguments.strIdent === '') {
			return;
			
		} else if (objectArguments.strTitle === '') {
			return;
			
		} else if (objectArguments.strIdent === Youtube.watch.strIdent) {
			return;
			
		} else if (objectArguments.strTitle === Youtube.watch.strTitle) {
			return;
			
		}
		
		{
			Youtube.watch.strIdent = objectArguments.strIdent;
			
			Youtube.watch.strTitle = objectArguments.strTitle;
		}
		
		{
			self.port.emit('eventWatch', objectArguments);
		}
	},
	
	watchCallback: function(objectArguments) {
		
	},
	
	lookup: function() {
		var objectArguments = {
			'resultHandle': []
		};
		
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
					objectArguments.resultHandle.push({
						'intIdent': 0,
						'longTimestamp': 0,
						'strIdent': strIdent,
						'strTitle': '',
						'intCount': 0
					});
				}
			}
		}
		
		if (objectArguments.resultHandle.length === 0) {
			return;
		}
		
		{
			self.port.emit('youtubeLookup', objectArguments);
		}
	},
	
	lookupCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		var intLookup = {};
		
		{
			for (var intFor1 = 0; intFor1 < objectArguments.resultHandle.length; intFor1 += 1) {
				intLookup[objectArguments.resultHandle[intFor1].strIdent] = 1;
			}
		}
		
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
					if (intLookup.hasOwnProperty(strIdent) === true) {
						elementHandle[intFor1].onmousedown({
							'button': 0
						});
					}
				}
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