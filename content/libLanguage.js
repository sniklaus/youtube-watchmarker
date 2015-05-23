'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

var Language = {
	bundleHandle: null,
	
	init: function() {
		{
			Language.bundleHandle = Services.strings.createBundle('chrome://YouRect/locale/strings.properties');
		}
	},
	
	dispel: function() {
		{
			Language.bundleHandle = null;
		}
	},
	
	updateContent: function(strContent) {
		var strUpdated = strContent;
		
		{
			var enumeratorHandle = Language.bundleHandle.getSimpleEnumeration();
			
			do {
				if (enumeratorHandle.hasMoreElements() === false) {
					break;
				}
				
				var propertyHandle = enumeratorHandle.getNext().QueryInterface(Components.interfaces.nsIPropertyElement);
				
				{
					strUpdated = strUpdated.replace(new RegExp('@string/' + propertyHandle.key, 'g'), propertyHandle.value);
				}
			} while (true);
		}
		
		return strUpdated;
	}
};
Language.init();

jQuery(document).ready(function() {
	{
		jQuery('body').find('*').contents().filter(function() {
			return this.nodeType === Node.TEXT_NODE;
		}).each(function() {
			var strContent = this.nodeValue;
			
			if (strContent.indexOf('@string') === -1) {
				return;
			}
			
			this.nodeValue = Language.updateContent(strContent);
		});
		
		jQuery('body').find('[value]').each(function() {
			var strContent = jQuery(this).attr('value');
			
			if (strContent.indexOf('@string') === -1) {
				return;
			}
			
			jQuery(this).attr('value', Language.updateContent(strContent));
		});
		
		jQuery('body').find('[placeholder]').each(function() {
			var strContent = jQuery(this).attr('placeholder');
			
			if (strContent.indexOf('@string') === -1) {
				return;
			}
			
			jQuery(this).attr('placeholder', Language.updateContent(strContent));
		});
	}
});