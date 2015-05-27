'use strict';

self.port.on('eventShow', function(objectEvent) {
	
});

self.port.on('eventHide', function(objectEvent) {
	
});

self.port.on('eventLookup', function(objectEvent) {
	var boolLookup = {};
	
	{
		for (var intFor1 = 0; intFor1 < objectEvent.strLookup.length; intFor1 += 1) {
			boolLookup[objectEvent.strLookup[intFor1]] = true;
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
				if (boolLookup.hasOwnProperty(strIdent) === true) {
					Hook.updateMark(elementHandle[intFor1]);
					
				} else if (boolLookup.hasOwnProperty(strIdent) === false) {
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
	strIdent: '',
	strTitle: '',
	
	updateWatch: function() {
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
			if (document.querySelector('#eow-title') !== null) {
				if (document.querySelector('#eow-title').getAttribute('title') !== null) {
					strTitle = document.querySelector('#eow-title').getAttribute('title');
				}
			}
		}
		
		if (strIdent === '') {
			return;
			
		} else if (strTitle === '') {
			return;
			
		} else if (strIdent === Hook.strIdent) {
			return;
			
		} else if (strTitle === Hook.strTitle) {
			return;
			
		}
		
		{
			Hook.strIdent = strIdent;
			
			Hook.strTitle = strTitle;
		}
		
		{
			self.port.emit('eventWatch', {
				'strIdent': strIdent,
				'strTitle': strTitle
			});
		}
	},
	
	updateLookup: function() {
	   	var strLookup = [];
		
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
					strLookup.push(strIdent);
				}
			}
		}
		
		if (strLookup.length === 0) {
			return;
		}
		
		{
			self.port.emit('eventLookup', {
				'strLookup': strLookup
			});
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