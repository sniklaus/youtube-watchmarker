'use strict';

self.port.on('eventShow', function(objectEvent) {
	
});

self.port.on('eventHide', function(objectEvent) {
	
});

self.port.on('eventLookup', function(objectEvent) {
	{
		objectEvent.intIdent = {};
		
		for (var intFor1 = 0; intFor1 < objectEvent.strIdent.length; intFor1 += 1) {
			objectEvent.intIdent[objectEvent.strIdent[intFor1]] = 1;
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
				if (objectEvent.intIdent.hasOwnProperty(strIdent) === true) {
					Hook.updateMark(elementHandle[intFor1]);
					
				} else if (objectEvent.intIdent.hasOwnProperty(strIdent) === false) {
					elementHandle[intFor1].onmousedown = function(eventHandle) {
						if ((eventHandle.button === 0) || (eventHandle.button === 1)) {
							Hook.updateMark(this);
						}
					};
					
				}
			}
		}
	}
});

var Hook = {
	updateWatch: function() {
	   	var objectEvent = {
	   		'strIdent': '',
	   		'strTitle': ''
	   	};
		
		{
			if (window.location !== null) {
				if (window.location.href.split('/watch?v=').length === 2) {
					objectEvent.strIdent = window.location.href.split('/watch?v=')[1].split('&')[0]; 
				}
			}
		}
		
		{
			if (document.querySelector('#eow-title') !== null) {
				if (document.querySelector('#eow-title').getAttribute('title') !== null) {
					objectEvent.strTitle = document.querySelector('#eow-title').getAttribute('title');
				}
			}
		}
		
		if (objectEvent.strIdent === '') {
			return;
			
		} else if (objectEvent.strTitle === '') {
			return;
			
		} else if (objectEvent.strIdent === Hook.updateWatch.strIdent) {
			return;
			
		} else if (objectEvent.strTitle === Hook.updateWatch.strTitle) {
			return;
			
		}
		
		{
			Hook.updateWatch.strIdent = objectEvent.strIdent;
			
			Hook.updateWatch.strTitle = objectEvent.strTitle;
		}
		
		{
			self.port.emit('eventWatch', objectEvent);
		}
	},
	
	updateLookup: function() {
	   	var objectEvent = {
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
					objectEvent.strIdent.push(strIdent);
				}
			}
		}
		
		if (objectEvent.strIdent.length === 0) {
			return;
		}
		
		{
			self.port.emit('eventLookup', objectEvent);
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
	Hook.updateWatch();
}

{
   	Hook.updateLookup();
}

{
	var intThreshold = 0;
	
	document.onclick = function() {
		{
			intThreshold = 8;
		}
	};
	
	new MutationObserver(function(mutations) {
		if (intThreshold === 0) {
			return;
		}
		
		{
			intThreshold -= 1;
		}
		
		{
			Hook.updateWatch();
		}
		
		{
		   	Hook.updateLookup();
		}
	}).observe(document, {
		'childList': true,
		'subtree': true
	});
}