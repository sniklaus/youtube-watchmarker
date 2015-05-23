'use strict';

require('chrome').Cu.import('resource://gre/modules/FileUtils.jsm');
require('chrome').Cu.import('resource://gre/modules/Services.jsm');

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
					return require('chrome').Ci.nsIAboutModule.ALLOW_SCRIPT;
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
					toolbarpanelHandle.port.emit('eventShow');
				}
			});
			
			toolbarpanelHandle.on('hide', function() {
				{
					toolbarbuttonHandle.state('window', {
						'checked': false
					});
				}
				
				{
					toolbarpanelHandle.port.emit('eventHide');
				}
			});
		}
	}
	
	{
    	var PreferenceHistory_sqlserviceHandle = Services.storage.openDatabase(FileUtils.getFile('ProfD', [ 'YouRect.PreferenceHistory.sqlite' ]));
    	
    	var PreferenceHistory_statementCreate  = PreferenceHistory_sqlserviceHandle.createStatement(
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
		
		var PreferenceHistory_statementSave = PreferenceHistory_sqlserviceHandle.createStatement(
			'UPDATE PreferenceHistory ' +
			'SET ' +
			'	longTimestamp = :longTimestamp, ' +
			'	strIdent = :strIdent, ' +
			'	strTitle = :strTitle, ' +
			'	intCount = :intCount ' +
			'WHERE intIdent = :intIdent '
		);
    	
    	var PreferenceHistory_statementSelect = PreferenceHistory_sqlserviceHandle.createStatement(
			'SELECT   * ' +
			'FROM     PreferenceHistory ' +
			'WHERE    strIdent IN (:strIdent) '
		);
		
		require('sdk/page-mod').PageMod({
			'include': '*.youtube.com',
			'contentScriptFile': [
				require('sdk/self').data.url('./jquery.js'),
				require('sdk/self').data.url('./hook.js')
			],
		    'onAttach': function(workerHandle) {
		        workerHandle.port.on('eventWatch', function(strIdent, strTitle) {
		        	if (strIdent === '') {
		        		return;
		        		
		        	} else if (strTitle === '') {
		        		return;
		        		
		        	}
		        	
					/*{
						PreferenceHistory.acquire();
						
						PreferenceHistory.selectOpen(
							'SELECT   * ' +
							'FROM     PreferenceHistory ' +
							'WHERE    strIdent = :PARAM0 ',
							[ strIdent ]
						);
						
						PreferenceHistory.selectNext();
						
						if (PreferenceHistory.intIdent === 0) {
							boolContinue = true;
						}
						
						if (PreferenceHistory.intIdent === 0) {
							PreferenceHistory.intIdent = 0;
							PreferenceHistory.longTimestamp = new Date().getTime();
							PreferenceHistory.strIdent = strIdent;
							PreferenceHistory.strTitle = strTitle;
							PreferenceHistory.intCount = 1;
							
							PreferenceHistory.create();
							
						} else if (PreferenceHistory.intIdent !== 0) {
							PreferenceHistory.intIdent = PreferenceHistory.intIdent;
							PreferenceHistory.longTimestamp = new Date().getTime();
							PreferenceHistory.strIdent = strIdent;
							PreferenceHistory.strTitle = strTitle;
							PreferenceHistory.intCount = PreferenceHistory.intCount + 1;
							
							PreferenceHistory.save();
							
						}
						
						PreferenceHistory.selectClose();
						
						PreferenceHistory.release();
					}*/
		        });
		        
		        workerHandle.port.on('eventLookup', function(strLookup) {
		        	if (strLookup.length === 0) {
		        		return;
		        	}
		        	
		        	{
						PreferenceHistory_statementSelect.reset();
		        	}
		        	
					{
						var bindingarrayHandle = PreferenceHistory_statementSelect.newBindingParamsArray();
						
						for (var intFor1 = 0; intFor1 < strLookup.length; intFor1 += 1) {
							var bindingHandle = bindingarrayHandle.newBindingParams();
							
							{
								bindingHandle.bindByName('strIdent', strLookup[intFor1]);
							}
							
							{
						  		bindingarrayHandle.addParams(bindingHandle);
							}
						}
						
						PreferenceHistory_statementSelect.bindParameters(bindingarrayHandle);
					}
					
					{
						PreferenceHistory_statementSelect.executeAsync({
							'handleResult': function(resultHandle) {
								var strLookup = [];
								
								{
									do {
										var rowHandle = resultHandle.getNextRow();
										
										if (rowHandle === null) {
											break;
										}
										
										{
											strLookup.push(rowHandle.getResultByName('strIdent'));
										}
									} while (true);
								}
								
								{
									workerHandle.port.emit('eventLookup', strLookup);
								}
							}
						});
					}
		        });
		    }
		});
	}
};

exports.onUnload = function(optionsHandle) {
	
};