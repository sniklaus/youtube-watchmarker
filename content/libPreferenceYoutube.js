'use strict'

Components.utils.import('resource://gre/modules/Services.jsm');

var PreferenceYoutube = {
	init: function() {
		
	},
	
	dispel: function() {
		
	},
	
	getStrKey: function() {
		if (Services.prefs.prefHasUserValue('extensions.YouRect.Youtube.strKey') === true) {
			return Services.prefs.getCharPref('extensions.YouRect.Youtube.strKey');
		}
		
		return "";
	},
	
	setStrKey: function(strKey) {
		{
			Services.prefs.setCharPref('extensions.YouRect.Youtube.strKey', strKey);
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	clearStrKey: function() {
		{
			Services.prefs.clearUserPref('extensions.YouRect.Youtube.strKey');
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	getStrAccess: function() {
		if (Services.prefs.prefHasUserValue('extensions.YouRect.Youtube.strAccess') === true) {
			return Services.prefs.getCharPref('extensions.YouRect.Youtube.strAccess');
		}
		
		return "";
	},
	
	setStrAccess: function(strAccess) {
		{
			Services.prefs.setCharPref('extensions.YouRect.Youtube.strAccess', strAccess);
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	clearStrAccess: function() {
		{
			Services.prefs.clearUserPref('extensions.YouRect.Youtube.strAccess');
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	getStrRefresh: function() {
		if (Services.prefs.prefHasUserValue('extensions.YouRect.Youtube.strRefresh') === true) {
			return Services.prefs.getCharPref('extensions.YouRect.Youtube.strRefresh');
		}
		
		return "";
	},
	
	setStrRefresh: function(strRefresh) {
		{
			Services.prefs.setCharPref('extensions.YouRect.Youtube.strRefresh', strRefresh);
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	clearStrRefresh: function() {
		{
			Services.prefs.clearUserPref('extensions.YouRect.Youtube.strRefresh');
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	clear: function() {
		{
			PreferenceYoutubeObserver.boolEnabled = false;
		}
		
		{
			PreferenceYoutube.clearStrKey();
			
			PreferenceYoutube.clearStrAccess();
			
			PreferenceYoutube.clearStrRefresh();
		}
		
		{
			PreferenceYoutubeObserver.boolEnabled = true;
			
			PreferenceYoutubeObserver.update();
		}
	}
};
PreferenceYoutube.init();
