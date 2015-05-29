'use strict'

var PreferenceHistoryObserver = {
	voidObserver: [],
	
	boolEnabled: false,
	
	init: function() {
		{
			PreferenceHistoryObserver.voidObserver = [];
		}
		
		{
			PreferenceHistoryObserver.boolEnabled = true;
		}
	},
	
	dispel: function() {
		{
			PreferenceHistoryObserver.voidObserver = [];
		}
		
		{
			PreferenceHistoryObserver.boolEnabled = false;
		}
	},
	
	addObserver: function(functionobserverHandle) {
		{
			PreferenceHistoryObserver.voidObserver.push(functionobserverHandle);
		}
	},
	
	deleteObserver: function(functionobserverHandle) {
		{
			PreferenceHistoryObserver.voidObserver.splice(PreferenceHistoryObserver.voidObserver.indexOf(functionobserverHandle), 1);
		}
	},
	
	update: function() {
		{
			if (PreferenceHistoryObserver.boolEnabled === false) {
				return;
			}
		}
		
		{
			for (var intFor1 = 0; intFor1 < PreferenceHistoryObserver.voidObserver.length; intFor1 += 1) {
				(PreferenceHistoryObserver.voidObserver[intFor1])();
			}
		}
	}
};
PreferenceHistoryObserver.init();
