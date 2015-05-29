'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

var jsLanguage = {
	getStrStrings: function() {
		var strStrings = [];
		
		{
			var enumeratorHandle = Services.strings.createBundle('chrome://YouRect/locale/strings.properties').getSimpleEnumeration();
			
			do {
				if (enumeratorHandle.hasMoreElements() === false) {
					break;
				}
				
				var propertyHandle = enumeratorHandle.getNext().QueryInterface(Components.interfaces.nsIPropertyElement);
				
				{
					strStrings.push({
						'strName': propertyHandle.key,
						'strValue': propertyHandle.value
					});
				}
			} while (true);
		}
		
		return JSON.stringify(strStrings);
	}
};
