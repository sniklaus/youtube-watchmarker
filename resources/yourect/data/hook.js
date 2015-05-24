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
		jQuery('a[href]').each(function() {
			var strIdent = '';
			
			{
				if (jQuery(this).attr('href').substr(0, 9) === '/watch?v=') {
					strIdent = jQuery(this).attr('href').substr(9).split('&')[0]; 
				}
			}
			
			if (strIdent === '') {
				return;
				
			} else if (jQuery(this).hasClass('watched') === true) {
				return;
				
			} else if (jQuery(this).children().size() !== 1) {
				return;
				
			}
			
			{
				if (boolLookup.hasOwnProperty(strIdent) === true) {
					jQuery(this)
						.addClass('watched')
						.append(jQuery('<div></div>')
							.addClass('watched-badge')
							.text('WATCHED')
						)
					;
					
				} else if (boolLookup.hasOwnProperty(strIdent) === false) {
					jQuery(this)
						.off('mousedown')
						.on('mousedown', function(eventHandle) {
							if (eventHandle.which !== 1) {
								if (eventHandle.which !== 2) {
									return;
								}
							}
							
							jQuery(this)
								.addClass('watched')
								.append(jQuery('<div></div>')
									.addClass('watched-badge')
									.text('WATCHED')
								)
							;
						})
					;
					
				}
			}
		});
	}
});

var Hook = {
	strIdent: '',
	strTitle: '',
	
	updateWatch: function() {
		var strIdent = '';
		var strTitle = '';
		
		{
			if (window.location.href.split('/watch?v=').length === 2) {
				strIdent = window.location.href.split('/watch?v=')[1].split('&')[0]; 
			}
			
			if (jQuery('#eow-title').attr('title') !== undefined) {
				strTitle = jQuery('#eow-title').attr('title');
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
			jQuery('a[href]').each(function() {
				var strIdent = '';
				
				{
					if (jQuery(this).attr('href').substr(0, 9) === '/watch?v=') {
						strIdent = jQuery(this).attr('href').substr(9).split('&')[0]; 
					}
				}
				
				if (strIdent === '') {
					return;
					
				} else if (jQuery(this).hasClass('watched') === true) {
					return;
					
				} else if (jQuery(this).children().size() !== 1) {
					return;
					
				}
				
				{
					strLookup.push(strIdent);
				}
			});
		}
		
		if (strLookup.length === 0) {
			return;
		}
		
		{
			self.port.emit('eventLookup', {
				'strLookup': strLookup
			});
		}
	}
};

jQuery(document).ready(function() {	
	{
		Hook.updateWatch();
	}
	
	{
	   	Hook.updateLookup();
	}
	
	{
		new MutationObserver(function() {
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
});