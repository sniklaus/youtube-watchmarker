'use strict';

var Cu = require('chrome').Cu;
var Ci = require('chrome').Ci;

Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

var XMLHttpRequest = require('sdk/net/xhr').XMLHttpRequest;

var Request = {
	init: function() {
	
	},
	
	dispel: function() {
		
	},
	
	update: function(objectArguments, functionCallback) {
		var requestHandle = new XMLHttpRequest();
		
		requestHandle.onreadystatechange = function() {
			if (requestHandle.readyState !== 4) {
				return;
			}
			
			var objectJson = null;
			
			try {
				objectJson = JSON.parse(requestHandle.response);
			} catch(e) {
				objectJson = null;
			}
			
			functionCallback({
				'intStatus': requestHandle.status,
				'strResponse': requestHandle.response,
				'objectJson': objectJson
			});
		};
		
		if (objectArguments.strType === 'GET') {
			requestHandle.open(objectArguments.strType, objectArguments.strLink + '?' + objectArguments.strData, true);
			
		} else if (objectArguments.strType === 'POST') {
			requestHandle.open(objectArguments.strType, objectArguments.strLink, true);
			
		}
		
		for (var strHeader in objectArguments.strHeader) {
			requestHandle.setRequestHeader(strHeader, objectArguments.strHeader[strHeader]);
		}
		
		if (objectArguments.strType === 'GET') {
			requestHandle.send();
			
		} else if (objectArguments.strType === 'POST') {
			requestHandle.send(objectArguments.strData);
			
		}
	}
};
Request.init();

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
	
	updateSynchronize: function(objectArguments, functionCallback) {
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
			Request.update({
				'strType': 'POST',
				'strLink': 'https://www.googleapis.com/oauth2/v3/token',
				'strData': 'grant_type=' + encodeURIComponent('refresh_token') + '&refresh_token=' + encodeURIComponent(Auth_strRefresh) + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&client_secret=' + encodeURIComponent(Youtube.strSecret) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect),
				'strHeader': {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			}, function(objectArguments) {
				if (objectArguments.intStatus !== 200) {
					functionCallback(null);
					
					return;
					
				} else if (objectArguments.objectJson === null) {
					functionCallback(null);
					
					return;
					
				}
				
				{
					if (objectArguments.objectJson.access_token !== undefined) {
						require('sdk/preferences/service').set('extensions.YouRect.Youtube.strAccess', objectArguments.objectJson.access_token);
					}
					
					if (objectArguments.objectJson.refresh_token !== undefined) {
						require('sdk/preferences/service').set('extensions.YouRect.Youtube.strRefresh', objectArguments.objectJson.refresh_token);
					}
				}
				
				functionChannels();
			});
		};
		
		var Channels_strHistory = '';
		
		var functionChannels = function() {
			Request.update({
				'strType': 'GET',
				'strLink': 'https://www.googleapis.com/youtube/v3/channels',
				'strData': 'key=' + encodeURIComponent(Youtube.strApi) + '&part=' + encodeURIComponent('contentDetails') + '&mine=' + encodeURIComponent('true'),
				'strHeader': {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': 'Bearer ' + Auth_strAccess
				}
			}, function(objectArguments) {
				if (objectArguments.intStatus !== 200) {
					functionCallback(null);
					
					return;
					
				} else if (objectArguments.objectJson === null) {
					functionCallback(null);
					
					return;
					
				}
				
				{
					Channels_strHistory = objectArguments.objectJson.items[0].contentDetails.relatedPlaylists.watchHistory;
				}
				
				functionPlaylistitems();
			});
		};
		
		var Playlistitems_intThreshold = objectArguments.intThreshold;
		var Playlistitems_strNext = '';
		var Playlistitems_resultHandle = [];
		
		var functionPlaylistitems = function() {
			Request.update({
				'strType': 'GET',
				'strLink': 'https://www.googleapis.com/youtube/v3/playlistItems',
				'strData': 'key=' + encodeURIComponent(Youtube.strApi) + '&part=' + encodeURIComponent('snippet') + '&maxResults=' + encodeURIComponent('50') + '&playlistId=' + encodeURIComponent(Channels_strHistory) + '&pageToken=' + encodeURIComponent(Playlistitems_strNext),
				'strHeader': {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': 'Bearer ' + Auth_strAccess
				}
			}, function(objectArguments) {
				if (objectArguments.intStatus !== 200) {
					functionCallback(null);
					
					return;
					
				} else if (objectArguments.objectJson === null) {
					functionCallback(null);
					
					return;
					
				}
				
				{
					if (objectArguments.objectJson.nextPageToken === undefined) {
						Playlistitems_strNext = '';
						
					} else if (objectArguments.objectJson.nextPageToken !== undefined) {
						Playlistitems_strNext = objectArguments.objectJson.nextPageToken;
						
					}
				}
				
				{
					for (var intFor1 = 0; intFor1 < objectArguments.objectJson.items.length; intFor1 += 1) {
						Playlistitems_resultHandle.push({
							'longTimestamp': Date.parse(objectArguments.objectJson.items[intFor1].snippet.publishedAt),
							'strIdent': objectArguments.objectJson.items[intFor1].snippet.resourceId.videoId,
							'strTitle': objectArguments.objectJson.items[intFor1].snippet.title
						});
					}
				}
				
				functionBegin();
			});
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
				Youtube.updateWatch({
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
				require('sdk/preferences/service').set('extensions.YouRect.Youtube.longTimestamp', String(new Date().getTime()));
			}
			
			functionCallback({});
		};
    	
		functionAuth();
	},
	
	updateWatch: function(objectArguments, functionCallback) {
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
					if (intReason === Ci.mozIStorageStatementCallback.REASON_ERROR) {
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
					if (intReason === Ci.mozIStorageStatementCallback.REASON_ERROR) {
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
					if (intReason === Ci.mozIStorageStatementCallback.REASON_ERROR) {
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
					if (intReason === Ci.mozIStorageStatementCallback.REASON_ERROR) {
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
					return Ci.nsIAboutModule.ALLOW_SCRIPT;
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
					Youtube.updateWatch({
						'longTimestamp': new Date().getTime(),
						'strIdent': objectEvent.strIdent,
						'strTitle': objectEvent.strTitle,
						'intCount': 1
					}, function(objectArguments) {
						
					});
		        });
		        
		        workerHandle.port.on('eventLookup', function(objectEvent) {
					Youtube.updateLookup({
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
		require('sdk/timers').setTimeout(function() {
			Youtube.updateSynchronize({
				'intThreshold': 128
			}, function(objectArguments) {
				
			});
		}, 5 * 1000);
		
		require('sdk/timers').setInterval(function() {
			Youtube.updateSynchronize({
				'intThreshold': 128
			}, function(objectArguments) {
				
			});
		}, 60 * 60 * 1000);
	}
};

exports.onUnload = function(optionsHandle) {
	
};