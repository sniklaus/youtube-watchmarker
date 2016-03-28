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
			
			requestHandle.onerror = function() {
				console.log(requestHandle.error.name);
			};
			
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
			}, function(objectArguments) {
				bindHandle.port.emit('databaseSave-progress', objectArguments);
			});
		});
		
		bindHandle.port.on('databaseLoad', function(objectArguments) {
			Database.load.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('databaseLoad', objectArguments);
			}, function(objectArguments) {
				bindHandle.port.emit('databaseLoad-progress', objectArguments);
			});
		});
		
		bindHandle.port.on('databaseReset', function(objectArguments) {
			Database.reset.call(bindHandle, objectArguments, function(objectArguments) {
				bindHandle.port.emit('databaseReset', objectArguments);
			});
		});
	},
	
	save: function(objectArguments, functionCallback, functionProgress) {
		var Transaction_objectstoreHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectstoreHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readonly')
					.objectStore('storeDatabase')
				;
				
				Transaction_objectstoreHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
		var Select_resultHandle = [];
		
		var functionSelect = function() {
			var requestHandle = Transaction_objectstoreHandle
				.openCursor()
			;
			
			requestHandle.onsuccess = function() {
				functionProgress({
					'intSize': Select_resultHandle.length
				});
				
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
	
	load: function(objectArguments, functionCallback, functionProgress) {
		var Transaction_objectstoreHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectstoreHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_objectstoreHandle.onerror = function() {
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
			var requestHandle = Transaction_objectstoreHandle
				.index('strIdent')
				.get(objectArguments.resultHandle[SelectIterator_intIndex].strIdent)
			;
			
			requestHandle.onsuccess = function() {
				functionProgress({
					'intSize': SelectIterator_intIndex
				});
				
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
			var requestHandle = Transaction_objectstoreHandle
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
			var requestHandle = Transaction_objectstoreHandle
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
		var Transaction_objectstoreHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectstoreHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_objectstoreHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionReset();
		};
		
		var functionReset = function() {
			var requestHandle = Transaction_objectstoreHandle
				.clear()
			;
			
			requestHandle.onsuccess = function() {
				functionCount();
			};
		};
		
		var functionCount = function() {
			var requestHandle = Transaction_objectstoreHandle
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
			}, function(objectArguments) {
				bindHandle.port.emit('historySynchronize-progress', objectArguments);
			});
		});
	},
	
	synchronize: function(objectArguments, functionCallback, functionProgress) {
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
				
				functionTransaction();
			});
		};
		
		var Transaction_objectstoreHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectstoreHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_objectstoreHandle.onerror = function() {
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
			var requestHandle = Transaction_objectstoreHandle
				.index('strIdent')
				.get(Search_resultHandle[SelectIterator_intIndex].strIdent)
			;
			
			requestHandle.onsuccess = function() {
				functionProgress({
					'intSize': SelectIterator_intIndex
				});
				
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
			var requestHandle = Transaction_objectstoreHandle
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
			var requestHandle = Transaction_objectstoreHandle
				.count()
			;
			
			requestHandle.onsuccess = function() {
				{
					requirePreferences.set('extensions.YouRect.Database.intSize', requestHandle.result);
				}
				
				functionCallback({});
			};
		};
		
		functionSearch();
	}
};
History.init();

var Youtube = {
	strApi: '',
	
	strClient: '',
	strSecret: '',
	strRedirect: '',
	
	strScope: '',
	
	bindHandle: null,
	
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
		
		{
			Youtube.bindHandle = [];
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
		
		{
			Youtube.bindHandle = [];
		}
	},
	
	bind: function(bindHandle) {
		Youtube.bindHandle.push(bindHandle);
		
		bindHandle.on('detach', function () {
			if (Youtube.bindHandle.indexOf(this) !== -1) {
				Youtube.bindHandle.splice(Youtube.bindHandle.indexOf(this), 1);
			}
		});
		
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
			}, function(objectArguments) {
				bindHandle.port.emit('youtubeSynchronize-progress', objectArguments);
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
	
	synchronize: function(objectArguments, functionCallback, functionProgress) {
		if (requirePreferences.get('extensions.YouRect.Youtube.strAccess', '') === '') {
			functionCallback(null);
			
			return;
			
		} else if (requirePreferences.get('extensions.YouRect.Youtube.strRefresh', '') === '') {
			functionCallback(null);
			
			return;
			
		}
		
		var functionAuth = function() {
			requireRequest.Request({
				'url': 'https://www.googleapis.com/oauth2/v3/token',
				'content': {
					'grant_type': 'refresh_token',
					'refresh_token': requirePreferences.get('extensions.YouRect.Youtube.strRefresh', ''),
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
					'Authorization': 'Bearer ' + requirePreferences.get('extensions.YouRect.Youtube.strAccess', '')
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
		
		var Playlistitems_intNew = 0;
		var Playlistitems_intExisting = 0
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
					'Authorization': 'Bearer ' + requirePreferences.get('extensions.YouRect.Youtube.strAccess', '')
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
						Playlistitems_resultHandle = [];
						
						for (var intFor1 = 0; intFor1 < responseHandle.json.items.length; intFor1 += 1) {
							Playlistitems_resultHandle.push({
								'strIdent': responseHandle.json.items[intFor1].snippet.resourceId.videoId,
								'longTimestamp': Date.parse(responseHandle.json.items[intFor1].snippet.publishedAt),
								'strTitle': responseHandle.json.items[intFor1].snippet.title
							});
						}
					}
					
					functionTransaction();
				}
			}).get();
		};
		
		var Transaction_objectstoreHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectstoreHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_objectstoreHandle.onerror = function() {
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
				if (SelectIterator_intIndex < Playlistitems_resultHandle.length) {
					functionSelect();
					
				} else if (SelectIterator_intIndex >= Playlistitems_resultHandle.length) {
					functionCount();
					
				}
			}
		};
		
		var Select_strIdent = '';
		var Select_longTimestamp = 0;
		var Select_strTitle = '';
		var Select_intCount = 0;
		
		var functionSelect = function() {
			var requestHandle = Transaction_objectstoreHandle
				.index('strIdent')
				.get(Playlistitems_resultHandle[SelectIterator_intIndex].strIdent)
			;
			
			requestHandle.onsuccess = function() {
				functionProgress({
					'intSize': Playlistitems_intNew + Playlistitems_intExisting
				});
				
				if ((requestHandle.result === undefined) || (requestHandle.result === null)) {
					Playlistitems_intNew += 1;
					
					Select_strIdent = Playlistitems_resultHandle[SelectIterator_intIndex].strIdent;
					Select_longTimestamp = Playlistitems_resultHandle[SelectIterator_intIndex].longTimestamp;
					Select_strTitle = Playlistitems_resultHandle[SelectIterator_intIndex].strTitle;
					Select_intCount = 1;
					
					functionPut();
					
				} else if ((requestHandle.result !== undefined) && (requestHandle.result !== null)) {
					Playlistitems_intExisting += 1;
					
					Select_strIdent = requestHandle.result.strIdent;
					Select_longTimestamp = Playlistitems_resultHandle[SelectIterator_intIndex].longTimestamp;
					Select_strTitle = Playlistitems_resultHandle[SelectIterator_intIndex].strTitle;
					Select_intCount = requestHandle.result.intCount;
					
					functionPut();
					
				}
				
				if (Playlistitems_intExisting > objectArguments.intThreshold) {
					Playlistitems_strNext = '';
				}
			};
		};
		
		var functionPut = function() {
			var requestHandle = Transaction_objectstoreHandle
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
			var requestHandle = Transaction_objectstoreHandle
				.count()
			;
			
			requestHandle.onsuccess = function() {
				{
					requirePreferences.set('extensions.YouRect.Database.intSize', requestHandle.result);
				}
				
				functionFinalize();
			};
		};
		
		var functionFinalize = function() {
			if (Playlistitems_strNext !== '') {
				functionPlaylistitems();
				
				return;
			}
			
			{
				requirePreferences.set('extensions.YouRect.Youtube.longTimestamp', String(new Date().getTime()));
			}
			
			functionCallback({});
		};
		
		functionAuth();
	},
	
	watch: function(objectArguments, functionCallback) {
		var Transaction_objectstoreHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectstoreHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readwrite')
					.objectStore('storeDatabase')
				;
				
				Transaction_objectstoreHandle.onerror = function() {
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
			var requestHandle = Transaction_objectstoreHandle
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
					Select_longTimestamp = objectArguments.longTimestamp;
					Select_strTitle = objectArguments.strTitle;
					Select_intCount = requestHandle.result.intCount + 1;
					
					functionPut();
					
				}
			};
		};
		
		var functionPut = function() {
			var requestHandle = Transaction_objectstoreHandle
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
			var requestHandle = Transaction_objectstoreHandle
				.count()
			;
			
			requestHandle.onsuccess = function() {
				{
					requirePreferences.set('extensions.YouRect.Database.intSize', requestHandle.result);
				}
				
				{
					for (var intFor1 = 0; intFor1 < Youtube.bindHandle.length; intFor1 += 1) {
						Youtube.bindHandle[intFor1].port.emit('youtubeLookup', {
							'strIdent': Select_strIdent,
							'longTimestamp': Select_longTimestamp,
							'strTitle': Select_strTitle,
							'intCount': Select_intCount
						});
					}
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
		var Transaction_objectstoreHandle = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectstoreHandle = Database.indexbaseHandle
					.transaction([ 'storeDatabase' ], 'readonly')
					.objectStore('storeDatabase')
				;
				
				Transaction_objectstoreHandle.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
		var Select_objectstoreHandle = null;
		
		var functionSelect = function() {
			{
				Select_objectstoreHandle = Transaction_objectstoreHandle
					.index('strIdent')
				;
			}
			
			objectArguments.strIdentities.forEach(functionParallel);
		};
		
		var functionParallel = function(strIdent) {
			var requestHandle = Select_objectstoreHandle
				.get(strIdent)
			;
			
			requestHandle.onsuccess = function(responseHandle) {
				if (requestHandle.result === undefined) {
					return;
					
				} else if (requestHandle.result === null) {
					return;
					
				}
				
				functionCallback({
					'strIdent': requestHandle.result.strIdent,
					'longTimestamp': requestHandle.result.longTimestamp,
					'strTitle': requestHandle.result.strTitle,
					'intCount': requestHandle.result.intCount
				});
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
			'include': [ 'about:yourect', 'about:yourect#*', 'chrome://yourect/content/index.html', 'chrome://yourect/content/index.html#*' ],
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
			'contentStyle': [
				'.watched .video-thumb { opacity: 0.3; }',
				'.watched .yt-uix-simple-thumb-related { opacity: 0.3; }'
			],
			'contentScriptFile': [ requireSelf.data.url('./youtube.js') ],
			'contentScriptOptions': {
				'strType': 'typePagemod'
			},
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
			'contentScriptFile': [ requireSelf.data.url('./index.js') ],
			'contentScriptOptions': {
				'strType': 'typePanel'
			}
		});
		
		{
			toolbarpanelHandle.on('show', function() {
				toolbarbuttonHandle.state('window', {
					'checked': true
				});
				
				toolbarpanelHandle.port.emit('panelShow', {});
			});
			
			toolbarpanelHandle.on('hide', function() {
				toolbarbuttonHandle.state('window', {
					'checked': false
				});
				
				toolbarpanelHandle.port.emit('panelHide', {});
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
				
			}, function(objectArguments) {
				
			});
		}, 60 * 60 * 1000);
	}
};

exports.onUnload = function(optionsHandle) {
	
};