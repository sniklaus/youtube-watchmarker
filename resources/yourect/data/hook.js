'use strict';

self.port.on('eventLookup', function(strLookup) {
				console.log('lookup callback:' + strLookup.length);
	var boolLookup = {};
	
	{
		for (var intFor1 = 0; intFor1 < strLookup.length; intFor1 += 1) {
			boolLookup[strLookup[intFor1]] = true;
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
			
			if (boolLookup[strIdent] === true) {
				jQuery(this)
					.addClass('watched')
					.append(jQuery('<div></div>')
						.addClass('watched-badge')
						.text('WATCHED')
					)
				;
				
			} else if (boolLookup[strIdent] !== true) {
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
		});
	}
});

jQuery(document).ready(function() {
	{
		var strIdent = '';
		var strTitle = '';
		
		{
			if (window.location.href.substr(0, 9) === '/watch?v=') {
				strIdent = window.location.href.substr(9).split('&')[0]; 
			}
			
			if (jQuery('#eow-title').attr('title') !== undefined) {
				strTitle = jQuery('#eow-title').attr('title');
			}
		}
		
		{
			self.port.emit('eventWatch', strIdent, strTitle);
		}
	}
	
	{
		jQuery(document)
			.off('update')
			.on('update', function() {
				console.log('lookup');
				
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
				
				{
					self.port.emit('eventLookup', strLookup);
				}
			})
		;
		
		jQuery(document)
			.trigger('update')
		;
	}
	
	{
		new MutationObserver(function() {
			jQuery(document)
				.trigger('update')
			;
		}).observe(document, {
			'childList': true,
			'subtree': true
		});
	}
	
	{
		// TODO: autorefresh youtube if necessary
	}
});