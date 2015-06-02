'use strict'

var PreferenceDatabaseObserver = {
	voidObserver: [],
	
	boolEnabled: false,
	
	init: function() {
		{
			PreferenceDatabaseObserver.voidObserver = [];
		}
		
		{
			PreferenceDatabaseObserver.boolEnabled = true;
		}
	},
	
	dispel: function() {
		{
			PreferenceDatabaseObserver.voidObserver = [];
		}
		
		{
			PreferenceDatabaseObserver.boolEnabled = false;
		}
	},
	
	addObserver: function(functionobserverHandle) {
		{
			PreferenceDatabaseObserver.voidObserver.push(functionobserverHandle);
		}
	},
	
	deleteObserver: function(functionobserverHandle) {
		{
			PreferenceDatabaseObserver.voidObserver.splice(PreferenceDatabaseObserver.voidObserver.indexOf(functionobserverHandle), 1);
		}
	},
	
	update: function() {
		{
			if (PreferenceDatabaseObserver.boolEnabled === false) {
				return;
			}
		}
		
		{
			for (var intFor1 = 0; intFor1 < PreferenceDatabaseObserver.voidObserver.length; intFor1 += 1) {
				(PreferenceDatabaseObserver.voidObserver[intFor1])();
			}
		}
	}
};
PreferenceDatabaseObserver.init();
