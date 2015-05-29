'use strict';

self.port.on('youtubeWatch', function(objectArguments) {
	
});

self.port.on('youtubeLookup', function(objectArguments) {
	{
		objectArguments.intIdent = {};
		
		for (var intFor1 = 0; intFor1 < objectArguments.strIdent.length; intFor1 += 1) {
			objectArguments.intIdent[objectArguments.strIdent[intFor1]] = 1;
		}
	}
	
	{
		var elementHandle = document.querySelectorAll('a[href]');
		
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
				if (objectArguments.intIdent.hasOwnProperty(strIdent) === true) {
					Youtube.updateMark(elementHandle[intFor1]);
					
				} else if (objectArguments.intIdent.hasOwnProperty(strIdent) === false) {
					elementHandle[intFor1].onmousedown = function(eventHandle) {
						if ((eventHandle.button === 0) || (eventHandle.button === 1)) {
							Youtube.updateMark(this);
						}
					};
					
				}
			}
		}
	}
});

var Youtube = {
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
			if (document.querySelector('#eow-title') !== null) {
				if (document.querySelector('#eow-title').getAttribute('title') !== null) {
					objectArguments.strTitle = document.querySelector('#eow-title').getAttribute('title');
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
	
	lookup: function() {
	   	var objectArguments = {
	   		'strIdent': []
	   	};
		
		{
			var elementHandle = document.querySelectorAll('a[href]');
			
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
					objectArguments.strIdent.push(strIdent);
				}
			}
		}
		
		if (objectArguments.strIdent.length === 0) {
			return;
		}
		
		{
			self.port.emit('youtubeLookup', objectArguments);
		}
	},
	
	updateMark: function(elementHandle) {
		{
			elementHandle.classList.add('watched');
		}
		
		{
			var elementBadge = document.createElement('div')
			
			elementBadge.classList.add('watched-badge');
			elementBadge.innerHTML = 'WATCHED';
			
			elementHandle.appendChild(elementBadge);
		}
	}
};

{
	Youtube.watch();
	
   	Youtube.lookup();
}

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
	
	document.onclick = function(eventHandle) {
		if (eventHandle.button !== 0) {
			return;
		}
		
		{
			observerHandle.intThreshold = 8;
		}
		
		{
			observerHandle.disconnect();
			
			observerHandle.observe(document, {
				'childList': true,
				'subtree': true
			});
		}
	};
}