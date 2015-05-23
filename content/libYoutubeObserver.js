'use strict'

var YoutubeObserver = {
	voidObserver: [],
	
	boolEnabled: false,
	
	init: function() {
		{
			YoutubeObserver.voidObserver = [];
		}
		
		{
			YoutubeObserver.boolEnabled = true;
		}
	},
	
	dispel: function() {
		{
			YoutubeObserver.voidObserver = [];
		}
		
		{
			YoutubeObserver.boolEnabled = false;
		}
	},
	
	addObserver: function(functionobserverHandle) {
		{
			YoutubeObserver.voidObserver.push(functionobserverHandle);
		}
	},
	
	deleteObserver: function(functionobserverHandle) {
		{
			YoutubeObserver.voidObserver.splice(YoutubeObserver.voidObserver.indexOf(functionobserverHandle), 1);
		}
	},
	
	update: function() {
		{
			if (YoutubeObserver.boolEnabled === false) {
				return;
			}
		}
		
		{
			for (var intFor1 = 0; intFor1 < YoutubeObserver.voidObserver.length; intFor1 += 1) {
				(YoutubeObserver.voidObserver[intFor1])();
			}
		}
	}
};
YoutubeObserver.init();
