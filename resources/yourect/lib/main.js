'use strict';

var Components = {
	'utils': require('chrome').Cu,
	'interfaces': require('chrome').Ci
};

Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

var History = {
	sqlserviceHandle: Services.storage.openDatabase(FileUtils.getFile('ProfD', [ 'YouRect.PreferenceHistory.sqlite' ])),
	
	updateWatch: function(objectArguments, functionCallback) {
    	var Select_intIdent = 0;
    	var Select_longTimestamp = 0;
    	var Select_strIdent = '';
    	var Select_strTitle = '';
    	var Select_intCount = 0;
    	
    	var functionSelect = function() {
	    	var statementHandle = History.sqlserviceHandle.createStatement(
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
					if (intReason === Components.interfaces.mozIStorageStatementCallback.REASON_ERROR) {
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
	    	var statementHandle = History.sqlserviceHandle.createStatement(
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
					if (intReason === Components.interfaces.mozIStorageStatementCallback.REASON_ERROR) {
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
	    	var statementHandle = History.sqlserviceHandle.createStatement(
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
					if (intReason === Components.interfaces.mozIStorageStatementCallback.REASON_ERROR) {
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
	
	updateLookup: function(objectArguments, functionCallback) {
		var Select_strIdent = [];
		
    	var functionSelect = function() {
	    	var statementHandle = History.sqlserviceHandle.createStatement(
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
					if (intReason === Components.interfaces.mozIStorageStatementCallback.REASON_ERROR) {
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
	},
	
	updateYoutube: function(objectArguments, functionCallback) {
		if (require('sdk/preferences/service').get('extensions.YouRect.Youtube.strKey') === '') {
			return;
			
		} else if (require('sdk/preferences/service').get('extensions.YouRect.Youtube.strAccess') === '') {
			return;
			
		} else if (require('sdk/preferences/service').get('extensions.YouRect.Youtube.strRefresh') === '') {
			return;
			
		}
		
		var Auth_strKey = require('sdk/preferences/service').get('extensions.YouRect.Youtube.strKey');
		var Auth_strAccess = require('sdk/preferences/service').get('extensions.YouRect.Youtube.strAccess');
		var Auth_strRefresh = require('sdk/preferences/service').get('extensions.YouRect.Youtube.strRefresh');
		
		var functionAuth = function() {
			require('sdk/request').Request({
				'url': 'https://www.googleapis.com/oauth2/v3/token',
				'content':  'grant_type=' + encodeURIComponent('refresh_token') + '&refresh_token=' + encodeURIComponent(Auth_strRefresh) + '&client_id=' + encodeURIComponent(objectArguments.strClient) + '&client_secret=' + encodeURIComponent(objectArguments.strSecret) + '&redirect_uri=' + encodeURIComponent(objectArguments.strRedirect),
				'onComplete': function(responseHandle) {
					if (responseHandle.status !== 200) {
						functionCallback(null);
						
						return;
						
					} else if (responseHandle.json === null) {
						functionCallback(null);
						
						return;
						
					}
					
					{
						if (jsonHandle.access_token !== undefined) {
							require('sdk/preferences/service').set('extensions.YouRect.Youtube.strAccess', responseHandle.json.access_token);
						}
						
						if (jsonHandle.refresh_token !== undefined) {
							require('sdk/preferences/service').set('extensions.YouRect.Youtube.strRefresh', responseHandle.json.refresh_token);
						}
					}
					
					functionChannels();
				}
			}).post();
		};
		
		var Channels_strHistory = '';
		
		var functionChannels = function() {
			require('sdk/request').Request({
				'url': 'https://www.googleapis.com/youtube/v3/channels?key=' + encodeURIComponent(objectArguments.strApi) + '&part=' + encodeURIComponent('contentDetails') + '&mine=' + encodeURIComponent('true'),
				'headers': {
					'Authorization': 'Bearer ' + Auth_strAccess
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
		
		var Playlistitems_intThreshold = 128;
		var Playlistitems_strNext = '';
		var Playlistitems_resultHandle = [];
		
		var functionPlaylistitems = function() {
			require('sdk/request').Request({
				'url': 'https://www.googleapis.com/youtube/v3/playlistItems?key=' + encodeURIComponent(objectArguments.strApi) + '&part=' + encodeURIComponent('snippet') + '&maxResults=' + encodeURIComponent('50') + '&playlistId=' + encodeURIComponent(Channels_strHistory) + '&pageToken=' + encodeURIComponent(Playlistitems_strNext),
				'headers': {
					'Authorization': 'Bearer ' + Auth_strAccess
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
    			History.sqlserviceHandle.beginTransaction();
    		}
    		
			functionWatchIterator(0);
    	};
    	
    	var WatchIterator_intIndex = 0;
		
		var functionWatchIterator = function(intIncrement) {
			{
				WatchIterator_intIndex += intIncrement;
			}
			
			{
				if (WatchIterator_intIndex < FilesystemRead_strFiles.length) {
					functionWatch();
					
				} else if (WatchIterator_intIndex >= FilesystemRead_strFiles.length) {
					functionCommit();
					
				}
			}
		};
		
		var functionWatch = function() {
			{
				History.updateWatch({
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
    			History.sqlserviceHandle.commitTransaction();
    		}
    		
			{
				if (Playlistitems_intThreshold > 0) {
					if (Playlistitems_strNext !== '') {
    					{
    						Playlistitems_resultHandle = [];
    					}
    					
    					{
							functionPlaylistitems();
						}
						
						return;
					}
				}
			}
			
			{
				require('sdk/preferences/service').set('extensions.YouRect.Youtube.longTimestamp', new Date().getTime());
			}
			
			functionCallback({});
    	};
    	
		functionAuth();
	}
};

exports.main = function(optionsHandle) {
	{
		require('sdk/platform/xpcom').Factory({
			'contract': '@mozilla.org/network/protocol/about;1?what=yourect',
			'Component': require('sdk/core/heritage').Class({
				'extends': require('sdk/platform/xpcom').Unknown,
				'interfaces': [ 'nsIAboutModule' ],
				'newChannel': function(uriHandle) {
					var channelHandle = Services.io.newChannel('chrome://yourect/content/index.html', null, null);
					
					{
						channelHandle.originalURI = uriHandle;
					}
					
					return channelHandle;
				},
				'getURIFlags': function(uriHandle) {
					return Components.interfaces.nsIAboutModule.ALLOW_SCRIPT;
				}
			})
		});
	}
	
	{	
		var toolbarbuttonHandle = require('sdk/ui/button/toggle').ToggleButton({
			'id': 'idYouRect_Toolbarbutton',
			'label': 'YouRect',
			'icon': 'chrome://YouRect/content/images/icon.png'
		});

		{
			toolbarbuttonHandle.on('click', function(stateHandle) {
				{
					if (stateHandle.checked === true) {
						toolbarpanelHandle.show({
							'position': toolbarbuttonHandle
						});
						
					} else if (stateHandle.checked === false) {
						toolbarpanelHandle.hide();
						
					}
				}
			});
		}
		
		var toolbarpanelHandle = require('sdk/panel').Panel({
			'width': 640,
			'height': 480,
			'contentURL': 'about:yourect',
			'contentScriptFile': [
				require('sdk/self').data.url('./jquery.js'),
				require('sdk/self').data.url('./panel.js')
			]
		});
		
		{
			toolbarpanelHandle.on('show', function() {
				{
					toolbarbuttonHandle.state('window', {
						'checked': true
					});
				}
				
				{
					toolbarpanelHandle.port.emit('eventShow', {});
				}
			});
			
			toolbarpanelHandle.on('hide', function() {
				{
					toolbarbuttonHandle.state('window', {
						'checked': false
					});
				}
				
				{
					toolbarpanelHandle.port.emit('eventHide', {});
				}
			});
		}
	}
	
	{
		require('sdk/page-mod').PageMod({
			'include': '*.youtube.com',
			'contentScriptFile': [
				require('sdk/self').data.url('./hook.js')
			],
		    'onAttach': function(workerHandle) {
		        workerHandle.port.on('eventWatch', function(objectEvent) {
					History.updateWatch({
						'longTimestamp': new Date().getTime(),
						'strIdent': objectEvent.strIdent,
						'strTitle': objectEvent.strTitle,
						'intCount': 1
					}, function(objectArguments) {
						
					});
		        });
		        
		        workerHandle.port.on('eventLookup', function(objectEvent) {
					History.updateLookup({
						'strIdent': objectEvent.strIdent
					}, function(objectArguments) {
						if (objectArguments === null) {
							return;
						}
						
						workerHandle.port.emit('eventLookup', {
							'strIdent': objectArguments.strIdent
						});
					});
		        });
		    }
		});
	}
	
	{
		require('sdk/timers').setInterval(function() {
			History.updateYoutube({
				'strApi': 'AIzaSyAqgO1S-h65tnJvWGpJnGu5xt5qSokFcNo',
				'strClient': '701883762296-67ev6up58cp45mkp184ishf84ru0746r.apps.googleusercontent.com',
				'strSecret': 'tt90dhQUf9HJyx3ju-_9dmOD',
				'strRedirect': 'urn:ietf:wg:oauth:2.0:oob'
			}, function(objectArguments) {
				
			});
		}, 60 * 60 * 1000);
	}
};

exports.onUnload = function(optionsHandle) {
	
};