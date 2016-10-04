'use strict';

var Language = {
	objectStrings: [],
	
	init: function() {
		{
			Language.objectStrings = JSON.parse(String(jsLanguage.getStrStrings()));
		}
	},
	
	dispel: function() {
		{
			Language.objectStrings = [];
		}
	},
	
	updateContent: function(strContent) {
		var strUpdated = strContent;
		
		{
			for (var intFor1 = 0; intFor1 < Language.objectStrings.length; intFor1 += 1) {
				strUpdated = strUpdated.replace(new RegExp('@string/' + Language.objectStrings[intFor1].strName, 'g'), Language.objectStrings[intFor1].strValue);
			}
		}
		
		return strUpdated;
	}
};
Language.init();

jQuery(window.document).ready(function() {
	{
		window.document.title = Language.updateContent(window.document.title);
	}
	
	{
		jQuery(window.document.body).find('*').contents()
			.filter(function() {
				return this.nodeType === Node.TEXT_NODE;
			})
			.each(function() {
				var strContent = this.nodeValue;
				
				if (strContent.indexOf('@string') === -1) {
					return;
				}
				
				this.nodeValue = Language.updateContent(strContent);
			})
		;
	}
	
	{
		jQuery(window.document.body).find('[value]')
			.each(function() {
				var strContent = jQuery(this).attr('value');
				
				if (strContent.indexOf('@string') === -1) {
					return;
				}
				
				jQuery(this).attr('value', Language.updateContent(strContent));
			})
		;
		
		jQuery(window.document.body).find('[placeholder]')
			.each(function() {
				var strContent = jQuery(this).attr('placeholder');
				
				if (strContent.indexOf('@string') === -1) {
					return;
				}
				
				jQuery(this).attr('placeholder', Language.updateContent(strContent));
			})
		;
	}
});