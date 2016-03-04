'use strict'

Components.utils.import('resource://gre/modules/Services.jsm');

var PreferenceYoutube = {
	init: function() {
		
	},
	
	dispel: function() {
		
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
	
	getLongTimestamp: function() {
		if (Services.prefs.prefHasUserValue('extensions.YouRect.Youtube.longTimestamp') === true) {
			return parseInt(Services.prefs.getCharPref('extensions.YouRect.Youtube.longTimestamp'), 10);
		}
		
		return 0;
	},
	
	setLongTimestamp: function(longTimestamp) {
		{
			Services.prefs.setCharPref('extensions.YouRect.Youtube.longTimestamp', String(longTimestamp));
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	clearLongTimestamp: function() {
		{
			Services.prefs.clearUserPref('extensions.YouRect.Youtube.longTimestamp');
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	getBoolPlayerbadge: function() {
		if (Services.prefs.prefHasUserValue('extensions.YouRect.Youtube.boolPlayerbadge') === true) {
			return Services.prefs.getBoolPref('extensions.YouRect.Youtube.boolPlayerbadge');
		}
		
		return true;
	},
	
	setBoolPlayerbadge: function(boolPlayerbadge) {
		{
			Services.prefs.setBoolPref('extensions.YouRect.Youtube.boolPlayerbadge', boolPlayerbadge);
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	clearBoolPlayerbadge: function() {
		{
			Services.prefs.clearUserPref('extensions.YouRect.Youtube.boolPlayerbadge');
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
			PreferenceYoutube.clearStrAccess();
			
			PreferenceYoutube.clearStrRefresh();
			
			PreferenceYoutube.clearLongTimestamp();
			
			PreferenceYoutube.clearBoolPlayerbadge();
		}
		
		{
			PreferenceYoutubeObserver.boolEnabled = true;
			
			PreferenceYoutubeObserver.update();
		}
	}
};
PreferenceYoutube.init();
