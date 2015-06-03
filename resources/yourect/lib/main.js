'use strict';

var requireChrome = require('chrome');
var requireHeritage = require('sdk/core/heritage');
var requireHistory = require('sdk/places/history');
var requireIndexbase = require('sdk/indexed-db');
var requirePagemod = require('sdk/page-mod');
var requirePanel = require('sdk/panel');
var requirePreferences = require('sdk/preferences/service');
var requireRequest = require('sdk/request');
var requireSelf = require('sdk/self');
var requireTabs = require('sdk/tabs');
var requireTimers = require('sdk/timers');
var requireToggle = require('sdk/ui/button/toggle');
var requireXpcom = require('sdk/platform/xpcom');

requireChrome.Cu.import('resource://gre/modules/Services.jsm');

var Database = {
	indexbaseHandle: null,
	
	init: function() {
		{
			var requestHandle = requireIndexbase.indexedDB.open('Database', 1);
			
			requestHandle.onupgradeneeded = function() {
				if (requestHandle.result.objectStoreNames.contains('storeDatabase') === true) {
					return;
				}
				
				var objectstoreHandle = requestHandle.result.createObjectStore('storeDatabase', {
					'keyPath': 'strIdent'
				})
				
				objectstoreHandle.createIndex('strIdent', 'strIdent', {
					'unique': true
				});
			};
			
			requestHandle.onsuccess = function() {
				Database.indexbaseHandle = requestHandle.result;
			};
		}
	},
	
	dispel: function() {
		{
			Database.indexbaseHandle = null;
		}
	},
	
	bind: function(bindHandle) {
		bindHandle.port.on('databaseSave', function(objectArguments) {
			Database.save.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('databaseSave', objectArguments);
			});
		});
		
		bindHandle.port.on('databaseLoad', function(objectArguments) {
			Database.load.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('databaseLoad', objectArguments);
			});
		});
		
		bindHandle.port.on('databaseReset', function(objectArguments) {
			Database.reset.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('databaseReset', objectArguments);
			});
		});
	},
	
	save: function(objectArguments, functionCallback) {
		var Transaction_requestHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_requestHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readonly')
					.objectStore('storeDatabase')
				;
				
				Transaction_requestHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
		var Select_resultHandle = [];
		
    	var functionSelect = function() {
			var requestHandle = Transaction_requestHandle
				.openCursor()
			;
			
			requestHandle.onsuccess = function() {
				if ((requestHandle.result === undefined) || (requestHandle.result === null)) {
					functionCallback({
						'resultHandle': Select_resultHandle
					});
					
				} else if ((requestHandle.result !== undefined) && (requestHandle.result !== null)) {
					Select_resultHandle.push({
						'strIdent': requestHandle.result.value.strIdent,
						'longTimestamp': requestHandle.result.value.longTimestamp,
						'strTitle': requestHandle.result.value.strTitle,
						'intCount': requestHandle.result.value.intCount
					});
					
					requestHandle.result.continue();
					
				}
			};
		};
		
		functionTransaction();
	},
	
	load: function(objectArguments, functionCallback) {
		var Transaction_requestHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_requestHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_requestHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelectIterator(null);
		};
		
    	var SelectIterator_intIndex = 0;
		
		var functionSelectIterator = function(intIncrement) {
			{
				if (intIncrement === null) {
					SelectIterator_intIndex = 0;
					
				} else if (intIncrement !== null) {
					SelectIterator_intIndex += intIncrement;
					
				}
			}
			
			{
				if (SelectIterator_intIndex < objectArguments.resultHandle.length) {
					functionSelect();
					
				} else if (SelectIterator_intIndex >= objectArguments.resultHandle.length) {
					functionCount();
					
				}
			}
		};
		
    	var Select_strIdent = '';
    	var Select_longTimestamp = 0;
    	var Select_strTitle = '';
    	var Select_intCount = 0;
		
    	var functionSelect = function() {
			var requestHandle = Transaction_requestHandle
				.index('strIdent')
				.get(objectArguments.resultHandle[SelectIterator_intIndex].strIdent)
			;
			
			requestHandle.onsuccess = function() {
				if ((requestHandle.result === undefined) || (requestHandle.result === null)) {
					Select_strIdent = objectArguments.resultHandle[SelectIterator_intIndex].strIdent;
					Select_longTimestamp = objectArguments.resultHandle[SelectIterator_intIndex].longTimestamp;
					Select_strTitle = objectArguments.resultHandle[SelectIterator_intIndex].strTitle;
					Select_intCount = objectArguments.resultHandle[SelectIterator_intIndex].intCount;
					
					functionPut();
					
				} else if ((requestHandle.result !== undefined) && (requestHandle.result !== null)) {
					Select_strIdent = requestHandle.result.strIdent;
					Select_longTimestamp = Math.max(requestHandle.result.longTimestamp, objectArguments.resultHandle[SelectIterator_intIndex].longTimestamp);
					Select_strTitle = requestHandle.result.strTitle;
					Select_intCount = Math.max(requestHandle.result.intCount, objectArguments.resultHandle[SelectIterator_intIndex].intCount);
					
					functionPut();
					
				}
			};
		};
		
		var functionPut = function() {
			var requestHandle = Transaction_requestHandle
				.put({
					'strIdent': Select_strIdent,
					'longTimestamp': Select_longTimestamp,
					'strTitle': Select_strTitle,
					'intCount': Select_intCount
				})
			;
			
			requestHandle.onsuccess = function() {
				functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var requestHandle = Transaction_requestHandle
				.count()
			;
			
			requestHandle.onsuccess = function() {
				{
					requirePreferences.set('extensions.YouRect.Database.intSize', requestHandle.result);
				}
				
				functionCallback({});
			};
		};
		
		functionTransaction();
	},
	
	reset: function(objectArguments, functionCallback) {
		var Transaction_requestHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_requestHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_requestHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionReset();
		};
		
		var functionReset = function() {
			var requestHandle = Transaction_requestHandle
				.clear()
			;
			
			requestHandle.onsuccess = function() {
				functionCount();
			};
		};
		
		var functionCount = function() {
			var requestHandle = Transaction_requestHandle
				.count()
			;
			
			requestHandle.onsuccess = function() {
				{
					requirePreferences.set('extensions.YouRect.Database.intSize', requestHandle.result);
				}
				
				functionCallback({});
			};
		};
		
		functionTransaction();
	}
};
Database.init();

var History = {
	init: function() {
		
	},
	
	dispel: function() {
		
	},
	
	bind: function(bindHandle) {
		bindHandle.port.on('historySynchronize', function(objectArguments) {
			History.synchronize.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('historySynchronize', objectArguments);
			});
		});
	},
	
	synchronize: function(objectArguments, functionCallback) {
		var Transaction_requestHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_requestHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_requestHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSearch();
		};
		
		var Search_resultHandle = [];
		
		var functionSearch = function() {
			requireHistory.search({
				'url': 'https://www.youtube.com/watch?v=*'
			}).on('end', function(resultHandle) {
				{
					for (var intFor1 = 0; intFor1 < resultHandle.length; intFor1 += 1) {
						Search_resultHandle.push({
							'strIdent': resultHandle[intFor1].url.split('/watch?v=')[1].split('&')[0],
							'longTimestamp': resultHandle[intFor1].time,
							'strTitle': resultHandle[intFor1].title,
							'intCount': resultHandle[intFor1].accessCount
						});
					}
				}
				
				functionSelectIterator(null);
			});
		};
		
		var SelectIterator_intIndex = 0;
		
		var functionSelectIterator = function(intIncrement) {
			{
				if (intIncrement === null) {
					SelectIterator_intIndex = 0;
					
				} else if (intIncrement !== null) {
					SelectIterator_intIndex += intIncrement;
					
				}
			}
			
			{
				if (SelectIterator_intIndex < Search_resultHandle.length) {
					functionSelect();
					
				} else if (SelectIterator_intIndex >= Search_resultHandle.length) {
					functionCount();
					
				}
			}
		};
		
    	var Select_strIdent = '';
    	var Select_longTimestamp = 0;
    	var Select_strTitle = '';
    	var Select_intCount = 0;
		
    	var functionSelect = function() {
			var requestHandle = Transaction_requestHandle
				.index('strIdent')
				.get(Search_resultHandle[SelectIterator_intIndex].strIdent)
			;
			
			requestHandle.onsuccess = function() {
				if ((requestHandle.result === undefined) || (requestHandle.result === null)) {
					Select_strIdent = Search_resultHandle[SelectIterator_intIndex].strIdent;
					Select_longTimestamp = Search_resultHandle[SelectIterator_intIndex].longTimestamp;
					Select_strTitle = Search_resultHandle[SelectIterator_intIndex].strTitle;
					Select_intCount = Search_resultHandle[SelectIterator_intIndex].intCount;
					
					functionPut();
					
				} else if ((requestHandle.result !== undefined) && (requestHandle.result !== null)) {
					Select_strIdent = requestHandle.result.strIdent;
					Select_longTimestamp = Math.max(requestHandle.result.longTimestamp, Search_resultHandle[SelectIterator_intIndex].longTimestamp);
					Select_strTitle = requestHandle.result.strTitle;
					Select_intCount = Math.max(requestHandle.result.intCount, Search_resultHandle[SelectIterator_intIndex].intCount);
					
					functionPut();
					
				}
			};
		};
		
		var functionPut = function() {
			var requestHandle = Transaction_requestHandle
				.put({
					'strIdent': Select_strIdent,
					'longTimestamp': Select_longTimestamp,
					'strTitle': Select_strTitle,
					'intCount': Select_intCount
				})
			;
			
			requestHandle.onsuccess = function() {
				functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var requestHandle = Transaction_requestHandle
				.count()
			;
			
			requestHandle.onsuccess = function() {
				{
					requirePreferences.set('extensions.YouRect.Database.intSize', requestHandle.result);
				}
				
				functionCallback({});
			};
		};
		
		functionTransaction();
	}
};
History.init();

var Youtube = {
	strApi: '',
	
	strClient: '',
	strSecret: '',
	strRedirect: '',
	
	strScope: '',
	
	init: function() {
		{
			Youtube.strApi = 'AIzaSyAqgO1S-h65tnJvWGpJnGu5xt5qSokFcNo';
		}
		
		{
			Youtube.strClient = '701883762296-67ev6up58cp45mkp184ishf84ru0746r.apps.googleusercontent.com';
			
			Youtube.strSecret = 'tt90dhQUf9HJyx3ju-_9dmOD';
			
			Youtube.strRedirect = 'urn:ietf:wg:oauth:2.0:oob';
		}
		
		{
			Youtube.strScope = 'https://www.googleapis.com/auth/youtube.readonly';
		}
	},
	
	dispel: function() {
		{
			Youtube.strApi = '';
		}
		
		{
			Youtube.strClient = '';
			
			Youtube.strSecret = '';
			
			Youtube.strRedirect = '';
		}
		
		{
			Youtube.strScope = '';
		}
	},
	
	bind: function(bindHandle) {
		bindHandle.port.on('youtubeAuthorize', function(objectArguments) {
			Youtube.authorize.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('youtubeAuthorize', objectArguments);
			});
		});
		
		bindHandle.port.on('youtubeLink', function(objectArguments) {
			Youtube.link.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('youtubeLink', objectArguments);
			});
		});
		
		bindHandle.port.on('youtubeUnlink', function(objectArguments) {
			Youtube.unlink.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('youtubeUnlink', objectArguments);
			});
		});
		
		bindHandle.port.on('youtubeSynchronize', function(objectArguments) {
			Youtube.synchronize.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('youtubeSynchronize', objectArguments);
			});
		});
		
		bindHandle.port.on('youtubeWatch', function(objectArguments) {
			Youtube.watch.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('youtubeWatch', objectArguments);
			});
		});
		
		bindHandle.port.on('youtubeLookup', function(objectArguments) {
			Youtube.lookup.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('youtubeLookup', objectArguments);
			});
		});
	},
	
	authorize: function(objectArguments, functionCallback) {
		{
			var strContent = [];
			
			strContent.push('response_type' + '=' + 'code');
			strContent.push('client_id' + '=' + Youtube.strClient);
			strContent.push('redirect_uri' + '=' + Youtube.strRedirect);
			strContent.push('scope' + '=' + Youtube.strScope);
			
			requireTabs.open({
				'url': 'https://accounts.google.com/o/oauth2/auth' + '?' + strContent.join('&'),
				'inBackground': false
			});
		}
		
		functionCallback({});
	},
	
	link: function(objectArguments, functionCallback) {
		var functionAuth = function() {
			requireRequest.Request({
				'url': 'https://www.googleapis.com/oauth2/v3/token',
				'content': {
					'grant_type': 'authorization_code',
					'code': objectArguments.strKey,
					'client_id': Youtube.strClient,
					'client_secret': Youtube.strSecret,
					'redirect_uri': Youtube.strRedirect
				},
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				'onComplete': function(responseHandle) {
					if (responseHandle.status !== 200) {
						functionCallback(null);
						
						return;
						
					} else if (responseHandle.json === null) {
						functionCallback(null);
						
						return;
						
					}
					
					{
						if (responseHandle.json.access_token !== undefined) {
							requirePreferences.set('extensions.YouRect.Youtube.strAccess', responseHandle.json.access_token);
						}
						
						if (responseHandle.json.refresh_token !== undefined) {
							requirePreferences.set('extensions.YouRect.Youtube.strRefresh', responseHandle.json.refresh_token);
						}
					}
					
					functionCallback({});
				}
			}).post();
		};
		
		functionAuth();
	},
	
	unlink: function(objectArguments, functionCallback) {
		{
			requirePreferences.get('extensions.YouRect.Youtube.strAccess', '');
			
			requirePreferences.get('extensions.YouRect.Youtube.strRefresh', '');
		}
		
		functionCallback({});
	},
	
	synchronize: function(objectArguments, functionCallback) {
		if (requirePreferences.get('extensions.YouRect.Youtube.strAccess') === '') {
			functionCallback(null);
			
			return;
			
		} else if (requirePreferences.get('extensions.YouRect.Youtube.strRefresh') === '') {
			functionCallback(null);
			
			return;
			
		}
		
		var functionAuth = function() {
			requireRequest.Request({
				'url': 'https://www.googleapis.com/oauth2/v3/token',
				'content': {
					'grant_type': 'refresh_token',
					'refresh_token': requirePreferences.get('extensions.YouRect.Youtube.strRefresh'),
					'client_id': Youtube.strClient,
					'client_secret': Youtube.strSecret,
					'redirect_uri': Youtube.strRedirect
				},
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				'onComplete': function(responseHandle) {
					if (responseHandle.status !== 200) {
						functionCallback(null);
						
						return;
						
					} else if (responseHandle.json === null) {
						functionCallback(null);
						
						return;
						
					}
					
					{
						if (responseHandle.json.access_token !== undefined) {
							requirePreferences.set('extensions.YouRect.Youtube.strAccess', responseHandle.json.access_token);
						}
						
						if (responseHandle.json.refresh_token !== undefined) {
							requirePreferences.set('extensions.YouRect.Youtube.strRefresh', responseHandle.json.refresh_token);
						}
					}
					
					functionChannels();
				}
			}).post();
		};
		
		var Channels_strHistory = '';
		
		var functionChannels = function() {
			requireRequest.Request({
				'url': 'https://www.googleapis.com/youtube/v3/channels',
				'content': {
					'key': Youtube.strApi,
					'part': 'contentDetails',
					'mine': 'true'
				},
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': 'Bearer ' + requirePreferences.get('extensions.YouRect.Youtube.strAccess')
				},
				'onComplete': function(responseHandle) {
					if (responseHandle.status !== 200) {
						functionCallback(null);
						
						return;
						
					} else if (responseHandle.json === null) {
						functionCallback(null);
						
						return;
						
					}
					
					{
						Channels_strHistory = responseHandle.json.items[0].contentDetails.relatedPlaylists.watchHistory;
					}
					
					functionPlaylistitems();
				}
			}).get();
		};
		
		var Playlistitems_intThreshold = objectArguments.intThreshold;
		var Playlistitems_strNext = '';
		var Playlistitems_resultHandle = [];
		
		var functionPlaylistitems = function() {
			requireRequest.Request({
				'url': 'https://www.googleapis.com/youtube/v3/playlistItems',
				'content': {
					'key': Youtube.strApi,
					'part': 'snippet',
					'maxResults': '50',
					'playlistId': Channels_strHistory,
					'pageToken': Playlistitems_strNext
				},
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': 'Bearer ' + requirePreferences.get('extensions.YouRect.Youtube.strAccess')
				},
				'onComplete': function(responseHandle) {
					if (responseHandle.status !== 200) {
						functionCallback(null);
						
						return;
						
					} else if (responseHandle.json === null) {
						functionCallback(null);
						
						return;
						
					}
					
					{
						if (responseHandle.json.nextPageToken === undefined) {
							Playlistitems_strNext = '';
							
						} else if (responseHandle.json.nextPageToken !== undefined) {
							Playlistitems_strNext = responseHandle.json.nextPageToken;
							
						}
					}
					
					{
						for (var intFor1 = 0; intFor1 < responseHandle.json.items.length; intFor1 += 1) {
							Playlistitems_resultHandle.push({
								'strIdent': responseHandle.json.items[intFor1].snippet.resourceId.videoId,
								'longTimestamp': Date.parse(responseHandle.json.items[intFor1].snippet.publishedAt),
								'strTitle': responseHandle.json.items[intFor1].snippet.title
							});
						}
					}
					
					functionWatchIterator(null);
				}
			}).get();
		};
    	
    	var WatchIterator_intIndex = 0;
		
		var functionWatchIterator = function(intIncrement) {
			{
				if (intIncrement === null) {
					WatchIterator_intIndex = 0;
					
				} else if (intIncrement !== null) {
					WatchIterator_intIndex += intIncrement;
					
				}
			}
			
			{
				if (WatchIterator_intIndex < Playlistitems_resultHandle.length) {
					functionWatch();
					
				} else if (WatchIterator_intIndex >= Playlistitems_resultHandle.length) {
					functionFinalize();
					
				}
			}
		};
		
		var functionWatch = function() {
			{
				Youtube.watch({
					'strIdent': Playlistitems_resultHandle[WatchIterator_intIndex].strIdent,
					'longTimestamp': Playlistitems_resultHandle[WatchIterator_intIndex].longTimestamp,
					'strTitle': Playlistitems_resultHandle[WatchIterator_intIndex].strTitle,
					'intCount': 1
				}, function(objectArguments) {
					if (objectArguments === null) {
						functionCallback(null);
						
						return;
					}
					
					{
						if (objectArguments.intCount !== 1) {
							Playlistitems_intThreshold -= 1;
						}
					}
					
					functionWatchIterator(1);
				});
			}
		};
		
		var functionFinalize = function() {
			{
				Playlistitems_resultHandle = [];
			}
			
			{
				if (Playlistitems_intThreshold > 0) {
					if (Playlistitems_strNext !== '') {
						functionPlaylistitems();
						
						return;
					}
				}
			}
			
			{
				requirePreferences.set('extensions.YouRect.Youtube.longTimestamp', String(new Date().getTime()));
			}
			
			functionCallback({});
		};
    	
		functionAuth();
	},
	
	watch: function(objectArguments, functionCallback) {
		var Transaction_requestHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_requestHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_requestHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
    	var Select_strIdent = '';
    	var Select_longTimestamp = 0;
    	var Select_strTitle = '';
    	var Select_intCount = 0;
		
    	var functionSelect = function() {
			var requestHandle = Transaction_requestHandle
				.index('strIdent')
				.get(objectArguments.strIdent)
			;
			
			requestHandle.onsuccess = function() {
				if ((requestHandle.result === undefined) || (requestHandle.result === null)) {
					Select_strIdent = objectArguments.strIdent;
					Select_longTimestamp = objectArguments.longTimestamp;
					Select_strTitle = objectArguments.strTitle;
					Select_intCount = 1;
				
					functionPut();
					
				} else if ((requestHandle.result !== undefined) && (requestHandle.result !== null)) {
					Select_strIdent = requestHandle.result.strIdent;
					Select_longTimestamp = Math.max(requestHandle.result.longTimestamp, objectArguments.longTimestamp);
					Select_strTitle = objectArguments.strTitle;
					Select_intCount = requestHandle.result.intCount + objectArguments.intCount;
					
					functionPut();
					
				}
			};
		};
		
		var functionPut = function() {
			var requestHandle = Transaction_requestHandle
				.put({
					'strIdent': Select_strIdent,
					'longTimestamp': Select_longTimestamp,
					'strTitle': Select_strTitle,
					'intCount': Select_intCount
				})
			;
			
			requestHandle.onsuccess = function() {
				functionCount();
			};
		};
		
		var functionCount = function() {
			var requestHandle = Transaction_requestHandle
				.count()
			;
			
			requestHandle.onsuccess = function() {
				{
					requirePreferences.set('extensions.YouRect.Database.intSize', requestHandle.result);
				}
				
				functionCallback({
					'strIdent': Select_strIdent,
					'longTimestamp': Select_longTimestamp,
					'strTitle': Select_strTitle,
					'intCount': Select_intCount
				});
			};
		};
		
		functionTransaction();
	},
	
	lookup: function(objectArguments, functionCallback) {
		var Transaction_requestHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_requestHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_requestHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
    	var functionSelect = function() {
			var requestHandle = Transaction_requestHandle
				.index('strIdent')
				.get(objectArguments.strIdent)
			;
			
			requestHandle.onsuccess = function(responseHandle) {
				if ((requestHandle.result === undefined) || (requestHandle.result === null)) {
					functionCallback(null);
					
				} else if ((requestHandle.result !== undefined) && (requestHandle.result !== null)) {
					functionCallback({
						'strIdent': requestHandle.result.strIdent,
						'longTimestamp': requestHandle.result.longTimestamp,
						'strTitle': requestHandle.result.strTitle,
						'intCount': requestHandle.result.intCount
					});
					
				}
			};
		};
		
		functionTransaction();
	}
};
Youtube.init();

exports.main = function(optionsHandle) {
	{
		requireXpcom.Factory({
			'contract': '@mozilla.org/network/protocol/about;1?what=yourect',
			'Component': requireHeritage.Class({
				'extends': requireXpcom.Unknown,
				'interfaces': [ 'nsIAboutModule' ],
				'newChannel': function(uriHandle) {
					var channelHandle = Services.io.newChannel('chrome://yourect/content/index.html', null, null);
					
					{
						channelHandle.originalURI = uriHandle;
					}
					
					return channelHandle;
				},
				'getURIFlags': function(uriHandle) {
					return requireChrome.Ci.nsIAboutModule.ALLOW_SCRIPT;
				}
			})
		});
	}
	
	{
		requirePagemod.PageMod({
			'include': [ 'about:yourect', 'chrome://yourect/content/index.html' ],
			'contentScriptFile': [ requireSelf.data.url('./index.js') ],
		    'onAttach': function(workerHandle) {
				{
					Database.bind(workerHandle);
					
					History.bind(workerHandle);
					
					Youtube.bind(workerHandle);
				}
		    }
		});
	}
	
	{
		requirePagemod.PageMod({
			'include': [ '*.youtube.com' ],
			'contentScriptFile': [ requireSelf.data.url('./youtube.js') ],
		    'onAttach': function(workerHandle) {
				{
					Youtube.bind(workerHandle);
				}
		    }
		});
	}
	
	{	
		var toolbarbuttonHandle = requireToggle.ToggleButton({
			'id': 'idToolbarbutton',
			'label': 'YouRect',
			'icon': 'chrome://yourect/content/images/icon.png'
		});
		
		{
			toolbarbuttonHandle.on('click', function(stateHandle) {
				if (stateHandle.checked === true) {
					toolbarpanelHandle.show({
						'position': toolbarbuttonHandle
					});
				}
			});
			
			toolbarbuttonHandle.on('click', function(stateHandle) {
				if (stateHandle.checked === false) {
					toolbarpanelHandle.hide();
				}
			});
		}
		
		var toolbarpanelHandle = requirePanel.Panel({
			'width': 640,
			'height': 480,
			'contentURL': 'chrome://yourect/content/index.html',
			'contentScriptFile': [ requireSelf.data.url('./index.js') ]
		});
		
		{
			toolbarpanelHandle.on('show', function() {
				toolbarbuttonHandle.state('window', {
					'checked': true
				});
			});
			
			toolbarpanelHandle.on('hide', function() {
				toolbarbuttonHandle.state('window', {
					'checked': false
				});
			});
		}
		
		{
			Database.bind(toolbarpanelHandle);
			
			History.bind(toolbarpanelHandle);
			
			Youtube.bind(toolbarpanelHandle);
		}
	}
	
	{
		requireTimers.setInterval(function() {
			Youtube.synchronize({
				'intThreshold': 128
			}, function(objectArguments) {
				
			});
		}, 60 * 60 * 1000);
	}
};

exports.onUnload = function(optionsHandle) {
	
};