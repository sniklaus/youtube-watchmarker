'use strict';

var Language = {
	jsonStrings: [],
	
	init: function() {
		{
			Language.jsonStrings = JSON.parse(String(jsLanguage.getStrStrings()));
		}
	},
	
	dispel: function() {
		{
			Language.jsonStrings = [];
		}
	},
	
	updateContent: function(strContent) {
		var strUpdated = strContent;
		
		{
			for (var intFor1 = 0; intFor1 < Language.jsonStrings.length; intFor1 += 1) {
				strUpdated = strUpdated.replace(new RegExp('@string/' + Language.jsonStrings[intFor1].strName, 'g'), Language.jsonStrings[intFor1].strValue);
			}
		}
		
		return strUpdated;
	}
};
Language.init();

jQuery(document).ready(function() {
	{
		document.title = Language.updateContent(document.title);
	}
	
	{
		jQuery('body').find('*').contents()
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
		jQuery('body').find('[value]')
			.each(function() {
				var strContent = jQuery(this).attr('value');
				
				if (strContent.indexOf('@string') === -1) {
					return;
				}
				
				jQuery(this).attr('value', Language.updateContent(strContent));
			})
		;
		
		jQuery('body').find('[placeholder]')
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