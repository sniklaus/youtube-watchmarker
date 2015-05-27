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
    	var sqlservicePreferenceHistory = Services.storage.openDatabase(FileUtils.getFile('ProfD', [ 'YouRect.PreferenceHistory.sqlite' ]));
    	
		require('sdk/page-mod').PageMod({
			'include': '*.youtube.com',
			'contentScriptFile': [
				require('sdk/self').data.url('./hook.js')
			],
		    'onAttach': function(workerHandle) {
		        workerHandle.port.on('eventWatch', function(objectEvent) {
		        	var Select_intIdent = 0;
		        	var Select_longTimestamp = 0;
		        	var Select_strIdent = '';
		        	var Select_strTitle = '';
		        	var Select_intCount = 0;
		        	
		        	var functionSelect = function() {
				    	var statementHandle = sqlservicePreferenceHistory.createStatement(
							'SELECT   * ' +
							'FROM     PreferenceHistory ' +
							'WHERE    strIdent = :strIdent '
						);
						
						statementHandle.params.strIdent = objectEvent.strIdent;
						
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
							'handleCompletion': function(aReason) {
								if (Select_intIdent === 0) {
									functionInsert();
									
								} else if (Select_intIdent !== 0) {
									functionUpdate();
									
								}
							}
						});
		        	};
		        	
		        	var functionInsert = function() {
				    	var statementHandle = sqlservicePreferenceHistory.createStatement(
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
						
						statementHandle.params.longTimestamp = new Date().getTime();
						statementHandle.params.strIdent = objectEvent.strIdent;
						statementHandle.params.strTitle = objectEvent.strTitle;
						statementHandle.params.intCount = 1;
						
						statementHandle.executeAsync();
		        	};
		        	
		        	var functionUpdate = function() {
				    	var statementHandle = sqlservicePreferenceHistory.createStatement(
							'UPDATE PreferenceHistory ' +
							'SET ' +
							'	longTimestamp = :longTimestamp, ' +
							'	strIdent = :strIdent, ' +
							'	strTitle = :strTitle, ' +
							'	intCount = :intCount ' +
							'WHERE intIdent = :intIdent '
						);
						
						statementHandle.params.intIdent = Select_intIdent;
						statementHandle.params.longTimestamp = new Date().getTime();
						statementHandle.params.strIdent = objectEvent.strIdent;
						statementHandle.params.strTitle = objectEvent.strTitle;
						statementHandle.params.intCount = Select_intCount + 1;
						
						statementHandle.executeAsync();
		        	};
		        	
		        	functionSelect();
		        });
		        
		        workerHandle.port.on('eventLookup', function(objectEvent) {
		        	var functionSelect = function() {
				    	var statementHandle = sqlservicePreferenceHistory.createStatement(
							'SELECT   * ' +
							'FROM     PreferenceHistory ' +
							'WHERE    strIdent IN (:strIdent) '
						);
		        		
						statementHandle.bindParameters((function() {
							var bindingarrayHandle = statementHandle.newBindingParamsArray();
							
							for (var intFor1 = 0; intFor1 < objectEvent.strLookup.length; intFor1 += 1) {
								var bindingHandle = bindingarrayHandle.newBindingParams();
								
								{
									bindingHandle.bindByName('strIdent', objectEvent.strLookup[intFor1]);
								}
								
								{
							  		bindingarrayHandle.addParams(bindingHandle);
								}
							}
							
							return bindingarrayHandle;
						})());
						
						statementHandle.executeAsync({
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
									workerHandle.port.emit('eventLookup', {
										'strLookup': strLookup
									});
								}
							}
						});
					};
					
					functionSelect();
		        });
		    }
		});
	}
};

exports.onUnload = function(optionsHandle) {
	
};