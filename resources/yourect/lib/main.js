'use strict';

var requireChrome = require('chrome');
var requireHeritage = require('sdk/core/heritage');
var requirePagemod = require('sdk/page-mod');
var requirePanel = require('sdk/panel');
var requirePreferences = require('sdk/preferences/service');
var requireRequest = require('sdk/request');
var requireSelf = require('sdk/self');
var requireTabs = require('sdk/tabs');
var requireTimers = require('sdk/timers');
var requireToggle = require('sdk/ui/button/toggle');
var requireXpcom = require('sdk/platform/xpcom');

requireChrome.Cu.import('resource://gre/modules/FileUtils.jsm');
requireChrome.Cu.import('resource://gre/modules/Services.jsm');

var Youtube = {
	strApi: '',
	strClient: '',
	strSecret: '',
	strRedirect: '',
	strScope: '',
	
	sqlserviceHistory: null,
	
	init: function() {
		{
			Youtube.strApi = 'AIzaSyAqgO1S-h65tnJvWGpJnGu5xt5qSokFcNo';
			
			Youtube.strClient = '701883762296-67ev6up58cp45mkp184ishf84ru0746r.apps.googleusercontent.com';
			
			Youtube.strSecret = 'tt90dhQUf9HJyx3ju-_9dmOD';
			
			Youtube.strRedirect = 'urn:ietf:wg:oauth:2.0:oob';
			
			Youtube.strScope = 'https://www.googleapis.com/auth/youtube.readonly';
		}
		
		{
			Youtube.sqlserviceHistory = Services.storage.openDatabase(FileUtils.getFile('ProfD', [ 'YouRect.PreferenceHistory.sqlite' ]));
		}
		
		{
			Youtube.sqlserviceHistory.executeSimpleSQL(
				'CREATE INDEX IF NOT EXISTS Index_longTimestamp ON PreferenceHistory (longTimestamp) '
			);
			
			Youtube.sqlserviceHistory.executeSimpleSQL(
				'CREATE INDEX IF NOT EXISTS Index_strIdent ON PreferenceHistory (strIdent) '
			);
		}
	},
	
	dispel: function() {
		{
			Youtube.strApi = '';
			
			Youtube.strClient = '';
			
			Youtube.strSecret = '';
			
			Youtube.strRedirect = '';
			
			Youtube.strScope = '';
		}
		
		{
			Youtube.sqlserviceHistory = null;
		}
	},
	
	authorize: function() {
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
	},
	
	link: function(objectArguments, functionCallback) {
		var functionAuth = function() {
			requireRequest.Request({
				'url': 'https://www.googleapis.com/oauth2/v3/token',
				'content': {
					'grant_type': 'authorization_code',
					'code': functionCallback.strKey,
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
	},
	
	unlink: function() {
		{
			requirePreferences.get('extensions.YouRect.Youtube.strAccess', '');
			
			requirePreferences.get('extensions.YouRect.Youtube.strRefresh', '');
		}
	},
	
	synchronize: function(objectArguments, functionCallback) {
		if (requirePreferences.get('extensions.YouRect.Youtube.strAccess') === '') {
			return;
			
		} else if (requirePreferences.get('extensions.YouRect.Youtube.strRefresh') === '') {
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
								'longTimestamp': Date.parse(responseHandle.json.items[intFor1].snippet.publishedAt),
								'strIdent': responseHandle.json.items[intFor1].snippet.resourceId.videoId,
								'strTitle': responseHandle.json.items[intFor1].snippet.title
							});
						}
					}
					
					functionBegin();
				}
			}).get();
		};
		
    	var functionBegin = function() {
    		{
    			Youtube.sqlserviceHistory.beginTransaction();
    		}
    		
			functionWatchIterator(null);
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
					functionCommit();
					
				}
			}
		};
		
		var functionWatch = function() {
			{
				Youtube.watch({
					'longTimestamp': Playlistitems_resultHandle[WatchIterator_intIndex].longTimestamp,
					'strIdent': Playlistitems_resultHandle[WatchIterator_intIndex].strIdent,
					'strTitle': Playlistitems_resultHandle[WatchIterator_intIndex].strTitle,
					'intCount': 1
				}, function(objectArguments) {
					if (objectArguments === null) {
						functionCallback(null);
						
						return;
					}
					
					{
						if (objectArguments.intIdent !== 0) {
							Playlistitems_intThreshold -= 1;
						}
					}
					
					functionWatchIterator(1);
				});
			}
		};
    	
    	var functionCommit = function() {
    		{
    			Youtube.sqlserviceHistory.commitTransaction();
    		}
    		
			functionFinalize();
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
    	var Select_intIdent = 0;
    	var Select_longTimestamp = 0;
    	var Select_strIdent = '';
    	var Select_strTitle = '';
    	var Select_intCount = 0;
    	
    	var functionSelect = function() {
	    	var statementHandle = Youtube.sqlserviceHistory.createStatement(
				'SELECT   * ' +
				'FROM     PreferenceHistory ' +
				'WHERE    strIdent = :strIdent '
			);
			
			statementHandle.params.strIdent = objectArguments.strIdent;
			
			statementHandle.executeAsync({
				'handleResult': function(resultHandle) {
					var rowHandle = resultHandle.getNextRow();
					
					if (rowHandle !== null) {
						Select_intIdent = rowHandle.getResultByName('intIdent');
						Select_longTimestamp = rowHandle.getResultByName('longTimestamp');
						Select_strIdent = rowHandle.getResultByName('strIdent');
						Select_strTitle = rowHandle.getResultByName('strTitle');
						Select_intCount = rowHandle.getResultByName('intCount');
					}
				},
				'handleCompletion': function(intReason) {
					if (intReason === requireChrome.Ci.mozIStorageStatementCallback.REASON_ERROR) {
						functionCallback(null);
						
						return;
					}
					
					if (Select_intIdent === 0) {
						functionInsert();
						
					} else if (Select_intIdent !== 0) {
						functionUpdate();
						
					}
				}
			});
    	};
    	
    	var functionInsert = function() {
	    	var statementHandle = Youtube.sqlserviceHistory.createStatement(
				'INSERT INTO PreferenceHistory ' +
				'	( ' + 
				'		longTimestamp, ' +
				'		strIdent, ' +
				'		strTitle, ' +
				'		intCount ' +
				'	) ' +
				'VALUES ' +
				'	( ' +
				'		:longTimestamp, ' +
				'		:strIdent, ' +
				'		:strTitle, ' +
				'		:intCount ' +
				'	) '
			);
			
			statementHandle.params.longTimestamp = objectArguments.longTimestamp;
			statementHandle.params.strIdent = objectArguments.strIdent;
			statementHandle.params.strTitle = objectArguments.strTitle;
			statementHandle.params.intCount = 1;
			
			statementHandle.executeAsync({
				'handleCompletion': function(intReason) {
					if (intReason === requireChrome.Ci.mozIStorageStatementCallback.REASON_ERROR) {
						functionCallback(null);
						
						return;
					}
					
					functionCallback({
						'intIdent': Select_intIdent,
						'longTimestamp': Select_longTimestamp,
						'strIdent': Select_strIdent,
						'strTitle': Select_strTitle,
						'intCount': Select_intCount
					});
				}
			});
    	};
    	
    	var functionUpdate = function() {
	    	var statementHandle = Youtube.sqlserviceHistory.createStatement(
				'UPDATE PreferenceHistory ' +
				'SET ' +
				'	longTimestamp = :longTimestamp, ' +
				'	strIdent = :strIdent, ' +
				'	strTitle = :strTitle, ' +
				'	intCount = :intCount ' +
				'WHERE intIdent = :intIdent '
			);
			
			statementHandle.params.intIdent = Select_intIdent;
			statementHandle.params.longTimestamp = objectArguments.longTimestamp;
			statementHandle.params.strIdent = objectArguments.strIdent;
			statementHandle.params.strTitle = objectArguments.strTitle;
			statementHandle.params.intCount = Select_intCount + objectArguments.intCount;
			
			statementHandle.executeAsync({
				'handleCompletion': function(intReason) {
					if (intReason === requireChrome.Ci.mozIStorageStatementCallback.REASON_ERROR) {
						functionCallback(null);
						
						return;
					}
					
					functionCallback({
						'intIdent': Select_intIdent,
						'longTimestamp': Select_longTimestamp,
						'strIdent': Select_strIdent,
						'strTitle': Select_strTitle,
						'intCount': Select_intCount
					});
				}
			});
    	};
    	
    	functionSelect();
	},
	
	lookup: function(objectArguments, functionCallback) {
		var Select_strIdent = [];
		
    	var functionSelect = function() {
	    	var statementHandle = Youtube.sqlserviceHistory.createStatement(
				'SELECT   * ' +
				'FROM     PreferenceHistory ' +
				'WHERE    strIdent IN (:strIdent) '
			);
    		
			statementHandle.bindParameters((function() {
				var bindingarrayHandle = statementHandle.newBindingParamsArray();
				
				for (var intFor1 = 0; intFor1 < objectArguments.strIdent.length; intFor1 += 1) {
					var bindingHandle = bindingarrayHandle.newBindingParams();
					
					{
						bindingHandle.bindByName('strIdent', objectArguments.strIdent[intFor1]);
					}
					
					{
				  		bindingarrayHandle.addParams(bindingHandle);
					}
				}
				
				return bindingarrayHandle;
			})());
			
			statementHandle.executeAsync({
				'handleResult': function(resultHandle) {
					do {
						var rowHandle = resultHandle.getNextRow();
						
						if (rowHandle === null) {
							break;
						}
						
						{
							Select_strIdent.push(rowHandle.getResultByName('strIdent'));
						}
					} while (true);
				},
				'handleCompletion': function(intReason) {
					if (intReason === requireChrome.Ci.mozIStorageStatementCallback.REASON_ERROR) {
						functionCallback(null);
						
						return;
					}
					
					functionCallback({
						'strIdent': Select_strIdent
					});
				}
			});
		};
		
		functionSelect();
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
			'contentScriptFile': [
				requireSelf.data.url('./jquery.js'),
				requireSelf.data.url('./moment.js'),
				requireSelf.data.url('./libEffects.js'),
				requireSelf.data.url('./libLanguage.preface.js'),
				requireSelf.data.url('./libLanguage.js'),
				requireSelf.data.url('./libModal.js'),
				requireSelf.data.url('./libPreferenceHistory.js'),
				requireSelf.data.url('./libPreferenceHistoryObserver.js'),
				requireSelf.data.url('./libPreferenceYoutube.js'),
				requireSelf.data.url('./libPreferenceYoutubeObserver.js'),
				requireSelf.data.url('./index.js')
			],
		    'onAttach': function(workerHandle) {
		        workerHandle.port.on('youtubeAuthorize', function(objectArguments) {
					Youtube.authorize();
		        });
				
		        workerHandle.port.on('youtubeLink', function(objectArguments) {
					Youtube.link(objectArguments, function(objectArguments) {
						workerHandle.port.emit('youtubeLink', objectArguments);
					});
		        });
				
		        workerHandle.port.on('youtubeUnlink', function(objectArguments) {
					Youtube.unlink(objectArguments);
		        });
				
		        workerHandle.port.on('youtubeSynchronize', function(objectArguments) {
					workerHandle.port.emit('youtubeSynchronize', {
						'strStatus': 'statusLoading'
					});
					
					Youtube.synchronize(objectArguments, function(objectArguments) {
						if (objectArguments === null) {
							workerHandle.port.emit('youtubeSynchronize', {
								'strStatus': 'statusError'
							});
							
						} else if (objectArguments !== null) {
							workerHandle.port.emit('youtubeSynchronize', {
								'strStatus': 'statusSuccess'
							});
							
						}
					});
		        });
		    }
		});
	}
	
	{
		requirePagemod.PageMod({
			'include': [ '*.youtube.com' ],
			'contentScriptFile': [
				requireSelf.data.url('./youtube.js')
			],
		    'onAttach': function(workerHandle) {
		        workerHandle.port.on('youtubeWatch', function(objectArguments) {
					Youtube.watch(objectArguments, function(objectArguments) {
						workerHandle.port.emit('youtubeWatch', objectArguments);
					});
		        });
		        
		        workerHandle.port.on('youtubeLookup', function(objectArguments) {
					Youtube.lookup(objectArguments, function(objectArguments) {
						workerHandle.port.emit('youtubeLookup', objectArguments);
					});
		        });
		    }
		});
	}
	
	{	
		var toolbarbuttonHandle = requireToggle.ToggleButton({
			'id': 'idToolbarbutton',
			'label': 'YouRect',
			'icon': 'chrome://YouRect/content/images/icon.png'
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
			'contentURL': 'about:yourect',
			'contentScriptFile': []
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