'use strict';

var Database = {
	objectRequest: null,
	
	init: function() {
		{
			var objectRequest = window.indexedDB.open('Database', 1);
			
			objectRequest.onerror = function() {
				console.log(objectRequest.error.name);
			};
			
			objectRequest.onupgradeneeded = function() {
				if (objectRequest.result.objectStoreNames.contains('storeDatabase') === true) {
					return;
				}
				
				var objectStore = objectRequest.result.createObjectStore('storeDatabase', {
					'keyPath': 'strIdent'
				})
				
				objectStore.createIndex('strIdent', 'strIdent', {
					'unique': true
				});
			};
			
			objectRequest.onsuccess = function() {
				Database.objectDatabase = objectRequest.result;
			};
		}

		{
			chrome.runtime.onConnect.addListener(function(objectPort) {
				if (objectPort.name === 'database') {
					objectPort.onMessage.addListener(function(objectData) {
						if (objectData.strMessage === 'databaseSave') {
							Database.save(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'databaseSave',
									'objectArguments': objectArguments
								});
							}, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'databaseSave-progress',
									'objectArguments': objectArguments
								});
							});
						}

						if (objectData.strMessage === 'databaseLoad') {
							Database.load(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'databaseLoad',
									'objectArguments': objectArguments
								});
							}, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'databaseLoad-progress',
									'objectArguments': objectArguments
								});
							});
						}

						if (objectData.strMessage === 'databaseReset') {
							Database.reset(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'databaseReset',
									'objectArguments': objectArguments
								});
							});
						}
					});
				}
			});
		}
	},
	
	dispel: function() {
		{
			Database.objectDatabase = null;
		}
	},
	
	save: function(objectArguments, functionCallback, functionProgress) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readonly').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
		var Select_objectResults = [];
		
		var functionSelect = function() {
			var objectRequest = Transaction_objectStore.openCursor();
			
			objectRequest.onsuccess = function() {
				functionProgress({
					'strProgress': String(Select_objectResults.length)
				});
				
				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					functionCallback({
						'objectResults': Select_objectResults
					});
					
				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					Select_objectResults.push({
						'strIdent': objectRequest.result.value.strIdent,
						'longTimestamp': objectRequest.result.value.longTimestamp,
						'strTitle': objectRequest.result.value.strTitle,
						'intCount': objectRequest.result.value.intCount
					});
					
					objectRequest.result.continue();
					
				}
			};
		};
		
		functionTransaction();
	},
	
	load: function(objectArguments, functionCallback, functionProgress) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
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
				if (SelectIterator_intIndex < objectArguments.objectResults.length) {
					functionSelect();
					
				} else if (SelectIterator_intIndex >= objectArguments.objectResults.length) {
					functionCount();
					
				}
			}
		};
		
		var Select_strIdent = '';
		var Select_longTimestamp = 0;
		var Select_strTitle = '';
		var Select_intCount = 0;
		
		var functionSelect = function() {
			var objectRequest = Transaction_objectStore.index('strIdent').get(objectArguments.objectResults[SelectIterator_intIndex].strIdent);
			
			objectRequest.onsuccess = function() {
				if (functionProgress.intNew === undefined) {
					functionProgress.intNew = 0;
					functionProgress.intExisting = 0;

				} else if (functionProgress.intNew === undefined) {
					functionProgress.intNew = 0;
					functionProgress.intExisting = 0;

				}

				functionProgress({
					'strProgress': (functionProgress.intNew + functionProgress.intExisting) + ' - ' + functionProgress.intNew + ' were new'
				});
				
				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					functionProgress.intNew += 1;

					Select_strIdent = objectArguments.objectResults[SelectIterator_intIndex].strIdent;
					Select_longTimestamp = objectArguments.objectResults[SelectIterator_intIndex].longTimestamp || new Date().getTime();
					Select_strTitle = objectArguments.objectResults[SelectIterator_intIndex].strTitle || '';
					Select_intCount = objectArguments.objectResults[SelectIterator_intIndex].intCount || 1;
					
					functionPut();
					
				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					functionProgress.intExisting += 1;

					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = Math.max(objectRequest.result.longTimestamp, objectArguments.objectResults[SelectIterator_intIndex].longTimestamp) || new Date().getTime();
					Select_strTitle = objectRequest.result.strTitle || objectArguments.objectResults[SelectIterator_intIndex].strTitle || '';
					Select_intCount = Math.max(objectRequest.result.intCount, objectArguments.objectResults[SelectIterator_intIndex].intCount) || 1;
					
					functionPut();
					
				}
			};
		};
		
		var functionPut = function() {
			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});
			
			objectRequest.onsuccess = function() {
				functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();
			
			objectRequest.onsuccess = function() {
				{
					window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
				}
				
				functionCallback({});
			};
		};
		
		functionTransaction();
	},
	
	reset: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionReset();
		};
		
		var functionReset = function() {
			var objectRequest = Transaction_objectStore.clear();
			
			objectRequest.onsuccess = function() {
				functionCount();
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();
			
			objectRequest.onsuccess = function() {
				{
					window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
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
		{
			chrome.runtime.onConnect.addListener(function(objectPort) {
				if (objectPort.name === 'history') {
					objectPort.onMessage.addListener(function(objectData) {
						if (objectData.strMessage === 'historySynchronize') {
							History.synchronize(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'historySynchronize',
									'objectArguments': objectArguments
								});
							}, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'historySynchronize-progress',
									'objectArguments': objectArguments
								});
							});
						}
					});
				}
			});
		}
	},
	
	dispel: function() {
		
	},
	
	synchronize: function(objectArguments, functionCallback, functionProgress) {
		var Search_objectResults = [];
		
		var functionSearch = function() {
			chrome.history.search({
				'text': 'https://www.youtube.com/watch?v=',
				'startTime': objectArguments.longTimestamp,
				'maxResults': 1000000
			}, function(objectResult) {
				{
					for (var intFor1 = 0; intFor1 < objectResult.length; intFor1 += 1) {
						if (objectResult[intFor1].url.indexOf('https://www.youtube.com/watch?v=') !== 0) {
							continue;

						} else if (objectResult[intFor1].url.split('/watch?v=').length !== 2) {
							continue;

						}
						
						Search_objectResults.push({
							'strIdent': objectResult[intFor1].url.split('/watch?v=')[1].split('&')[0],
							'longTimestamp': objectResult[intFor1].lastVisitTime,
							'strTitle': objectResult[intFor1].title,
							'intCount': objectResult[intFor1].visitCount
						});
					}
				}
				
				functionTransaction();
			});
		};
		
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
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
				if (SelectIterator_intIndex < Search_objectResults.length) {
					functionSelect();
					
				} else if (SelectIterator_intIndex >= Search_objectResults.length) {
					functionCount();
					
				}
			}
		};
		
		var Select_strIdent = '';
		var Select_longTimestamp = 0;
		var Select_strTitle = '';
		var Select_intCount = 0;
		
		var functionSelect = function() {
			var objectRequest = Transaction_objectStore.index('strIdent').get(Search_objectResults[SelectIterator_intIndex].strIdent);
			
			objectRequest.onsuccess = function() {
				if (functionProgress.intNew === undefined) {
					functionProgress.intNew = 0;
					functionProgress.intExisting = 0;

				} else if (functionProgress.intNew === undefined) {
					functionProgress.intNew = 0;
					functionProgress.intExisting = 0;

				}

				functionProgress({
					'strProgress': (functionProgress.intNew + functionProgress.intExisting) + ' - ' + functionProgress.intNew + ' were new'
				});
				
				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					functionProgress.intNew += 1;

					Select_strIdent = Search_objectResults[SelectIterator_intIndex].strIdent;
					Select_longTimestamp = Search_objectResults[SelectIterator_intIndex].longTimestamp || new Date().getTime();
					Select_strTitle = Search_objectResults[SelectIterator_intIndex].strTitle || '';
					Select_intCount = Search_objectResults[SelectIterator_intIndex].intCount || 1;
					
					functionPut();
					
				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					functionProgress.intExisting += 1;

					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = Math.max(objectRequest.result.longTimestamp, Search_objectResults[SelectIterator_intIndex].longTimestamp) || new Date().getTime();
					Select_strTitle = objectRequest.result.strTitle || Search_objectResults[SelectIterator_intIndex].strTitle || '';
					Select_intCount = Math.max(objectRequest.result.intCount, Search_objectResults[SelectIterator_intIndex].intCount) || 1;
					
					functionPut();
					
				}
			};
		};
		
		var functionPut = function() {
			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});
			
			objectRequest.onsuccess = function() {
				functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();
			
			objectRequest.onsuccess = function() {
				{
					window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
				}
				
				{
					window.localStorage.setItem('extensions.YouRect.History.longTimestamp', String(new Date().getTime()));
				}
				
				functionCallback({});
			};
		};
		
		functionSearch();
	}
};
History.init();

var Youtube = {
	init: function() {
		{
			chrome.runtime.onConnect.addListener(function(objectPort) {
				if (objectPort.name === 'youtube') {
					objectPort.onMessage.addListener(function(objectData) {
						if (objectData.strMessage === 'youtubeSynchronize') {
							Youtube.synchronize(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'youtubeSynchronize',
									'objectArguments': objectArguments
								});
							}, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'youtubeSynchronize-progress',
									'objectArguments': objectArguments
								});
							});
						}

						if (objectData.strMessage === 'youtubeEnsure') {
							Youtube.ensure(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'youtubeEnsure',
									'objectArguments': objectArguments
								});
							});
						}

						if (objectData.strMessage === 'youtubeWatch') {
							Youtube.watch(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'youtubeWatch',
									'objectArguments': objectArguments
								});
							});
						}

						if (objectData.strMessage === 'youtubeLookup') {
							Youtube.lookup(objectData.objectArguments, function(objectArguments) {
								objectPort.postMessage({
									'strMessage': 'youtubeLookup',
									'objectArguments': objectArguments
								});
							});
						}
					});
				}
			});
		}
	},
	
	dispel: function() {
		
	},
	
	synchronize: function(objectArguments, functionCallback, functionProgress) {
		var History_strContinuation = 'https://www.youtube.com/feed/history';
		var History_objectResults = [];
		
		var functionHistory = function() {
			var objectAjax = new XMLHttpRequest();

			objectAjax.onreadystatechange = function () {
				if (objectAjax.readyState !== 4) {
					return;
				}

				{
					History_strContinuation = ''

					History_objectResults = [];
				}

				{
					var strMore = '';
					var strContent = '';

					try {
						var objectResponse = JSON.parse(objectAjax.responseText);

						strMore = objectResponse.load_more_widget_html;
						strContent = objectResponse.content_html;
					} catch (objectError) {
						strMore = objectAjax.responseText;
						strContent = objectAjax.responseText;
					}

					var strContinuation = strMore.split('href="/browse_ajax?action_continuation');

					if (strContinuation.length === 2) {
						History_strContinuation = 'https://www.youtube.com/browse_ajax?action_continuation' + strContinuation[1].split('"')[0];
					}

					var strIdentities = strContent.split('<a href="/watch?v=');

					for (var intFor1 = 1; intFor1 < strIdentities.length; intFor1 += 1) {
						if (strIdentities[intFor1].split('title="').length > 0) {
							var strIdent = strIdentities[intFor1].split('"')[0].split('&')[0];
							var strTitle = strIdentities[intFor1].split('title="')[1].split('"')[0];

							strTitle = strTitle.replace(new RegExp('&amp;', 'g'), '&');
							strTitle = strTitle.replace(new RegExp('&lt;', 'g'), '<');
							strTitle = strTitle.replace(new RegExp('&gt;', 'g'), '>');
							strTitle = strTitle.replace(new RegExp('&quot;', 'g'), '"');

							History_objectResults.push({
								'strIdent': strIdent,
								'longTimestamp': null,
								'strTitle': strTitle,
								'intCount': null
							});
						}
					}
				}

				functionTransaction();
			};

			objectAjax.open('GET', History_strContinuation);

			objectAjax.send();
		};
		
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
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
				if (SelectIterator_intIndex < History_objectResults.length) {
					functionSelect();
					
				} else if (SelectIterator_intIndex >= History_objectResults.length) {
					functionCount();
					
				}
			}
		};
		
		var Select_strIdent = '';
		var Select_longTimestamp = 0;
		var Select_strTitle = '';
		var Select_intCount = 0;
		
		var functionSelect = function() {
			var objectRequest = Transaction_objectStore.index('strIdent').get(History_objectResults[SelectIterator_intIndex].strIdent);
			
			objectRequest.onsuccess = function() {
				if (functionProgress.intNew === undefined) {
					functionProgress.intNew = 0;
					functionProgress.intExisting = 0;

				} else if (functionProgress.intNew === undefined) {
					functionProgress.intNew = 0;
					functionProgress.intExisting = 0;

				}

				functionProgress({
					'strProgress': (functionProgress.intNew + functionProgress.intExisting) + ' - ' + functionProgress.intNew + ' were new'
				});
				
				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					functionProgress.intNew += 1;
					
					Select_strIdent = History_objectResults[SelectIterator_intIndex].strIdent;
					Select_longTimestamp = History_objectResults[SelectIterator_intIndex].longTimestamp || new Date().getTime();
					Select_strTitle = History_objectResults[SelectIterator_intIndex].strTitle || '';
					Select_intCount = History_objectResults[SelectIterator_intIndex].intCount || 1;
					
					functionPut();
					
				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					functionProgress.intExisting += 1;
					
					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = History_objectResults[SelectIterator_intIndex].longTimestamp || objectRequest.result.longTimestamp || new Date().getTime();
					Select_strTitle = History_objectResults[SelectIterator_intIndex].strTitle || objectRequest.result.strTitle || '';
					Select_intCount = History_objectResults[SelectIterator_intIndex].intCount || objectRequest.result.intCount || 1;
					
					functionPut();
					
				}
				
				if (functionProgress.intExisting > objectArguments.intThreshold) {
					History_strContinuation = '';
				}
			};
		};
		
		var functionPut = function() {
			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});
			
			objectRequest.onsuccess = function() {
				functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();
			
			objectRequest.onsuccess = function() {
				{
					window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
				}

				{
					window.localStorage.setItem('extensions.YouRect.Youtube.longTimestamp', String(new Date().getTime()));
				}
				
				functionContinuation();
			};
		};
		
		var functionContinuation = function() {
			if (History_strContinuation === '') {
				functionCallback({});

			} else if (History_strContinuation !== '') {
				functionHistory();

			}
		};
		
		functionHistory();
	},
	
	ensure: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
		var Select_objectStore = null;
		
		var functionSelect = function() {
			{
				Select_objectStore = Transaction_objectStore.index('strIdent');
			}
			
			objectArguments.strIdentities.forEach(functionParallel);
		};
		
		var functionParallel = function(strIdent) {
			var objectRequest = Select_objectStore.get(strIdent);
			
			objectRequest.onsuccess = function() {
				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					Transaction_objectStore.put({
						'strIdent': strIdent,
						'longTimestamp': new Date().getTime(),
						'strTitle': '',
						'intCount': 1
					});
				}
			};
		};
		
		functionTransaction();
	},

	watch: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
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
			var objectRequest = Transaction_objectStore.index('strIdent').get(objectArguments.strIdent);
			
			objectRequest.onsuccess = function() {
				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					Select_strIdent = objectArguments.strIdent;
					Select_longTimestamp = objectArguments.longTimestamp || new Date().getTime();
					Select_strTitle = objectArguments.strTitle || '';
					Select_intCount = objectArguments.intCount || 1;
					
					functionPut();
					
				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = objectArguments.longTimestamp || objectRequest.result.longTimestamp || new Date().getTime();
					Select_strTitle = objectArguments.strTitle || objectRequest.result.strTitle || '';
					Select_intCount = objectRequest.result.intCount + 1 || 1;
					
					functionPut();
					
				}
			};
		};
		
		var functionPut = function() {
			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});
			
			objectRequest.onsuccess = function() {
				functionCount();
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();
			
			objectRequest.onsuccess = function() {
				{
					window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
				}
				
				functionBroadcast();
			};
		};

		var functionBroadcast = function() {
			{
				chrome.tabs.query({
					'url': '*://*.youtube.com/*'
				}, function(objectTabs) {
					for (var intFor1 = 0; intFor1 < objectTabs.length; intFor1 += 1) {
						chrome.tabs.sendMessage(objectTabs[intFor1].id, {
							'strMessage': 'youtubeUpdate'
						});
					}
				});
			}
			
			functionCallback({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});
		};
		
		functionTransaction();
	},
	
	lookup: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			{
				Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readonly').objectStore('storeDatabase');
				
				Transaction_objectStore.onerror = function() {
					functionCallback(null);
				};
			}
			
			functionSelect();
		};
		
		var Select_objectStore = null;
		
		var functionSelect = function() {
			{
				Select_objectStore = Transaction_objectStore.index('strIdent');
			}
			
			objectArguments.strIdentities.forEach(functionParallel);
		};
		
		var functionParallel = function(strIdent) {
			var objectRequest = Select_objectStore.get(strIdent);
			
			objectRequest.onsuccess = function() {
				if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					functionCallback({
						'strIdent': objectRequest.result.strIdent,
						'longTimestamp': objectRequest.result.longTimestamp,
						'strTitle': objectRequest.result.strTitle,
						'intCount': objectRequest.result.intCount
					});
				}
			};
		};
		
		functionTransaction();
	}
};
Youtube.init();

{
	chrome.browserAction.onClicked.addListener(function() {
		chrome.tabs.create({
			'url': 'content/index.html'
		});
	});
}

{
	chrome.webRequest.onCompleted.addListener(function(objectData) {
		chrome.tabs.sendMessage(objectData.tabId, {
			'strMessage': 'youtubeUpdate'
		});
	}, {
		'urls': [ '*://*.youtube.com/*' ]
	});
}

{
	chrome.webNavigation.onHistoryStateUpdated.addListener(function(objectData) {
		if (objectData.url.indexOf('youtube.com') !== -1) {
			chrome.tabs.sendMessage(objectData.tabId, {
				'strMessage': 'youtubeUpdate'
			});
		}
	});
}

{
	chrome.alarms.create('synchronize', {
		'periodInMinutes': 60
	});

	chrome.alarms.onAlarm.addListener(function(objectAlarm) {
		if (objectAlarm.name === 'synchronize') {
			History.synchronize({
				'longTimestamp': new Date().getTime() - (7 * 24 * 60 * 60 * 1000)
			}, function(objectArguments) {
				
			}, function(objectArguments) {
				
			});

			Youtube.synchronize({
				'intThreshold': 256
			}, function(objectArguments) {
				
			}, function(objectArguments) {
				
			});
		}
	});
}