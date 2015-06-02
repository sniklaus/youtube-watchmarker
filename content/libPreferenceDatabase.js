'use strict'

Components.utils.import('resource://gre/modules/Services.jsm');

var PreferenceDatabase = {
	init: function() {
		
	},
	
	dispel: function() {
		
	},
	
	getIntSize: function() {
		if (Services.prefs.prefHasUserValue('extensions.YouRect.Database.intSize') === true) {
			return Services.prefs.getIntPref('extensions.YouRect.Database.intSize');
		}
		
		return 0;
	},
	
	setIntSize: function(intSize) {
		{
			Services.prefs.setIntPref('extensions.YouRect.Database.intSize', intSize);
		}
		
		{
			PreferenceDatabaseObserver.update();
		}
	},
	
	clearIntSize: function() {
		{
			Services.prefs.clearUserPref('extensions.YouRect.Database.intSize');
		}
		
		{
			PreferenceDatabaseObserver.update();
		}
	},
	
	clear: function() {
		{
			PreferenceDatabaseObserver.boolEnabled = false;
		}
		
		{
			PreferenceDatabase.clearIntSize();
		}
		
		{
			PreferenceDatabaseObserver.boolEnabled = true;
			
			PreferenceDatabaseObserver.update();
		}
	}
};
PreferenceDatabase.init();
