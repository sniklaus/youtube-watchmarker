'use strict'

var PreferenceYoutubeObserver = {
	voidObserver: [],
	
	boolEnabled: false,
	
	init: function() {
		{
			PreferenceYoutubeObserver.voidObserver = [];
		}
		
		{
			PreferenceYoutubeObserver.boolEnabled = true;
		}
	},
	
	dispel: function() {
		{
			PreferenceYoutubeObserver.voidObserver = [];
		}
		
		{
			PreferenceYoutubeObserver.boolEnabled = false;
		}
	},
	
	addObserver: function(functionobserverHandle) {
		{
			PreferenceYoutubeObserver.voidObserver.push(functionobserverHandle);
		}
	},
	
	deleteObserver: function(functionobserverHandle) {
		{
			PreferenceYoutubeObserver.voidObserver.splice(PreferenceYoutubeObserver.voidObserver.indexOf(functionobserverHandle), 1);
		}
	},
	
	update: function() {
		{
			if (PreferenceYoutubeObserver.boolEnabled === false) {
				return;
			}
		}
		
		{
			for (var intFor1 = 0; intFor1 < PreferenceYoutubeObserver.voidObserver.length; intFor1 += 1) {
				(PreferenceYoutubeObserver.voidObserver[intFor1])();
			}
		}
	}
};
PreferenceYoutubeObserver.init();
