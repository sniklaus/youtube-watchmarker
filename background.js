'use strict';

var Database = {
	objectRequest: null,

	init: function() {
		{
			var objectRequest = window.indexedDB.open('Database', 301);

			objectRequest.onerror = function() {
				console.log(objectRequest.error.name);
			};

			objectRequest.onupgradeneeded = function() {
				var objectStore = null;

				if (objectRequest.result.objectStoreNames.contains('storeDatabase') === false) {
					objectStore = objectRequest.result.createObjectStore('storeDatabase', {
						'keyPath': 'strIdent'
					});

				} else if (objectRequest.result.objectStoreNames.contains('storeDatabase') === true) {
					objectStore = objectRequest.transaction.objectStore('storeDatabase');

				}

				if (objectStore.indexNames.contains('strIdent') === false) {
					objectStore.createIndex('strIdent', 'strIdent', {
						'unique': true
					});
				}

				if (objectStore.indexNames.contains('longTimestamp') === false) {
					objectStore.createIndex('longTimestamp', 'longTimestamp', {
						'unique': false
					});
				}
			};

			objectRequest.onsuccess = function() {
				Database.objectDatabase = objectRequest.result;
			};
		}

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
	},

	dispel: function() {
		Database.objectDatabase = null;
	},

	save: function(objectArguments, functionCallback, functionProgress) {
		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readonly').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionSelect();
		};

		var Select_objectResults = [];

		var functionSelect = function() {
			var objectRequest = Transaction_objectStore.openCursor();

			objectRequest.onsuccess = function() {
				functionProgress({
					'strProgress': String(Select_objectResults.length)
				});

				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					chrome.downloads.download({
						'url' : URL.createObjectURL(new Blob([ btoa(unescape(encodeURIComponent(JSON.stringify(Select_objectResults)))) ], {
							'type': 'text/plain'
						})),
						'filename': new Date().getFullYear() + '.' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '.' + ('0' + new Date().getDate()).slice(-2) + '.database',
						'saveAs': true
					});

					return functionCallback({});

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

		return functionTransaction();
	},

	load: function(objectArguments, functionCallback, functionProgress) {
		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionSelectIterator(null);
		};

		var SelectIterator_intIndex = 0;

		var functionSelectIterator = function(intIncrement) {
			if (intIncrement === null) {
				SelectIterator_intIndex = 0;

			} else if (intIncrement !== null) {
				SelectIterator_intIndex += intIncrement;

			}

			if (SelectIterator_intIndex < objectArguments.objectResults.length) {
				return functionSelect();

			} else if (SelectIterator_intIndex >= objectArguments.objectResults.length) {
				return functionCount();

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

					return functionPut();

				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					functionProgress.intExisting += 1;

					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = Math.max(objectRequest.result.longTimestamp, objectArguments.objectResults[SelectIterator_intIndex].longTimestamp) || new Date().getTime();
					Select_strTitle = objectRequest.result.strTitle || objectArguments.objectResults[SelectIterator_intIndex].strTitle || '';
					Select_intCount = Math.max(objectRequest.result.intCount, objectArguments.objectResults[SelectIterator_intIndex].intCount) || 1;

					return functionPut();

				}
			};
		};
		
		var functionPut = function() {
			if (Select_strIdent.trim() === '') {
				return functionSelectIterator(1);

			} else if (Select_strTitle.trim() === '') {
				return functionSelectIterator(1);

			}

			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});

			objectRequest.onsuccess = function() {
				return functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();

			objectRequest.onsuccess = function() {
				window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));

				return functionCallback({});
			};
		};

		return functionTransaction();
	},
	
	reset: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionReset();
		};

		var functionReset = function() {
			var objectRequest = Transaction_objectStore.clear();

			objectRequest.onsuccess = function() {
				return functionCount();
			};
		};

		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();

			objectRequest.onsuccess = function() {
				window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));

				return functionCallback({});
			};
		};

		return functionTransaction();
	}
};
Database.init();

var History = {
	init: function() {
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
			}, function(objectResults) {
				for (var objectResult of objectResults) {
					if (objectResult.url.indexOf('https://www.youtube.com/watch?v=') !== 0) {
						continue;

					} else if (objectResult.title === null) {
						continue;

					} else if (objectResult.title.indexOf(' - YouTube') !== objectResult.title.length - 10) {
						continue;

					}

					Search_objectResults.push({
						'strIdent': objectResult.url.substr(32).substr(0, 11),
						'longTimestamp': objectResult.lastVisitTime,
						'strTitle': objectResult.title.slice(0, -10),
						'intCount': objectResult.visitCount
					});
				}

				return functionTransaction();
			});
		};

		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionSelectIterator(null);
		};

		var SelectIterator_intIndex = 0;

		var functionSelectIterator = function(intIncrement) {
			if (intIncrement === null) {
				SelectIterator_intIndex = 0;

			} else if (intIncrement !== null) {
				SelectIterator_intIndex += intIncrement;

			}

			if (SelectIterator_intIndex < Search_objectResults.length) {
				return functionSelect();

			} else if (SelectIterator_intIndex >= Search_objectResults.length) {
				return functionCount();

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

					return functionPut();

				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					functionProgress.intExisting += 1;

					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = Math.max(objectRequest.result.longTimestamp, Search_objectResults[SelectIterator_intIndex].longTimestamp) || new Date().getTime();
					Select_strTitle = objectRequest.result.strTitle || Search_objectResults[SelectIterator_intIndex].strTitle || '';
					Select_intCount = Math.max(objectRequest.result.intCount, Search_objectResults[SelectIterator_intIndex].intCount) || 1;

					return functionPut();

				}
			};
		};

		var functionPut = function() {
			if (Select_strIdent.trim() === '') {
				return functionSelectIterator(1);

			} else if (Select_strTitle.trim() === '') {
				return functionSelectIterator(1);

			}

			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});

			objectRequest.onsuccess = function() {
				return functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();

			objectRequest.onsuccess = function() {
				window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
				window.localStorage.setItem('extensions.YouRect.History.longTimestamp', String(new Date().getTime()));
				
				return functionCallback({});
			};
		};

		return functionSearch();
	}
};
History.init();

var Youtube = {
	init: function() {
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
	},

	dispel: function() {
		
	},

	synchronize: function(objectArguments, functionCallback, functionProgress) {
		var History_strIdent = '';
		var History_strPost = '';
		var History_strContinuation = 'https://www.youtube.com/feed/history';
		var History_objectResults = [];

		var functionHistory = function() {
			var objectAjax = new XMLHttpRequest();

			objectAjax.onreadystatechange = function() {
				if (objectAjax.readyState !== 4) {
					return;
				}

				History_strContinuation = '';
				History_objectResults = [];

				var strContent = '';

				try {
					var objectResponse = JSON.parse(objectAjax.responseText); // old

					if (objectResponse.content_html === undefined) {
						throw new Error();

					} else if (objectResponse.load_more_widget_html === undefined) {
						throw new Error();

					}

					strContent += objectResponse.content_html;
					strContent += objectResponse.load_more_widget_html;
				} catch (objectError) {
					strContent = objectAjax.responseText;
				}

				{
					var strExec = new RegExp('("ID_TOKEN")([ ]*)(:)([ ]*)(")([^"]+)(")', 'g').exec(strContent);

					if (strExec !== null) {
						History_strIdent = strExec[6];
					}

					var strExec = new RegExp('("XSRF_TOKEN")([ ]*)(:)([ ]*)(")([^"]+)(")', 'g').exec(strContent);

					if (strExec !== null) {
						History_strPost = 'session_token=' + strExec[6];
					}
				}

				{
					var strExec = new RegExp('("nextContinuationData")(.*?)("continuation")([ ]*)(:)([ ]*)(")([^"]+)(")(.*?)("clickTrackingParams")([ ]*)(:)([ ]*)(")([^"]+)(")', 'g').exec(strContent); // new

					if (strExec !== null) {
						History_strContinuation = 'https://www.youtube.com/browse_ajax?ctoken=' + strExec[8] + '&itct=' + strExec[16];
					}
				}

				{
					var strExec = new RegExp('(href="\\/browse_ajax\\?action_continuation)([^"]*)(")', 'g').exec(strContent); // old

					if (strExec !== null) {
						History_strContinuation = 'https://www.youtube.com/browse_ajax?action_continuation' + strExec[2];
					}
				}

				{
					var objectRegexp = new RegExp('("videoRenderer")(.*?)("videoId")([ ]*)(:)([ ]*)(")([^"]{11})(")(.*?)("title")(.*?)("simpleText")([ ]*)(:)([ ]*)(")([^"]*)(")', 'g'); // new

					while (true) {
						var strExec = objectRegexp.exec(strContent);

						if (strExec === null) {
							break;
						}

						var strIdent = strExec[8];
						var strTitle = strExec[18];

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

				{
					var objectRegexp = new RegExp('(<a)([ ]*)(href="\\/watch\\?v=)([^"]{11})([^"]*)(")([^>]*)(title=")([^"]*)(")', 'g'); // old

					while (true) {
						var strExec = objectRegexp.exec(strContent);

						if (strExec === null) {
							break;
						}

						var strIdent = strExec[4];
						var strTitle = strExec[9];

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

				return functionTransaction();
			};

			if (History_strPost === '') {
				objectAjax.open('GET', History_strContinuation);

			} else if (History_strPost !== '') {
				objectAjax.open('POST', History_strContinuation);

				objectAjax.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

			}

			if (History_strIdent !== '') {
				objectAjax.setRequestHeader('X-YouTube-Client-Name', '1');
				objectAjax.setRequestHeader('X-YouTube-Client-Version', '2.20170427');
				objectAjax.setRequestHeader('X-Youtube-Identity-Token', History_strIdent);
			}

			if (History_strPost === '') {
				objectAjax.send();

			} else if (History_strPost !== '') {
				objectAjax.send(History_strPost);

			}
		};

		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionSelectIterator(null);
		};

		var SelectIterator_intIndex = 0;

		var functionSelectIterator = function(intIncrement) {
			if (intIncrement === null) {
				SelectIterator_intIndex = 0;

			} else if (intIncrement !== null) {
				SelectIterator_intIndex += intIncrement;

			}

			if (SelectIterator_intIndex < History_objectResults.length) {
				return functionSelect();

			} else if (SelectIterator_intIndex >= History_objectResults.length) {
				return functionCount();

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

					return functionPut();

				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					functionProgress.intExisting += 1;

					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = History_objectResults[SelectIterator_intIndex].longTimestamp || objectRequest.result.longTimestamp || new Date().getTime();
					Select_strTitle = History_objectResults[SelectIterator_intIndex].strTitle || objectRequest.result.strTitle || '';
					Select_intCount = History_objectResults[SelectIterator_intIndex].intCount || objectRequest.result.intCount || 1;

					return functionPut();

				}

				if (functionProgress.intExisting > objectArguments.intThreshold) {
					History_strContinuation = '';
				}
			};
		};
		
		var functionPut = function() {
			if (Select_strIdent.trim() === '') {
				return functionSelectIterator(1);

			} else if (Select_strTitle.trim() === '') {
				return functionSelectIterator(1);

			}

			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});

			objectRequest.onsuccess = function() {
				return functionSelectIterator(1);
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();

			objectRequest.onsuccess = function() {
				window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
				window.localStorage.setItem('extensions.YouRect.Youtube.longTimestamp', String(new Date().getTime()));

				return functionContinuation();
			};
		};

		var functionContinuation = function() {
			if (History_strContinuation === '') {
				return functionCallback({});

			} else if (History_strContinuation !== '') {
				return functionHistory();

			}
		};

		return functionHistory();
	},
	
	ensure: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionSelect();
		};

		var Select_objectStore = null;

		var functionSelect = function() {
			Select_objectStore = Transaction_objectStore.index('strIdent');

			return objectArguments.objectVideos.forEach(functionParallel);
		};
		
		var functionParallel = function(objectVideo) {
			if (objectVideo.strIdent.trim() === '') {
				return;

			} else if (objectVideo.strTitle.trim() === '') {
				return;

			}

			var objectRequest = Select_objectStore.get(objectVideo.strIdent);

			objectRequest.onsuccess = function() {
				if ((objectRequest.result === undefined) || (objectRequest.result === null)) {
					Transaction_objectStore.put({
						'strIdent': objectVideo.strIdent,
						'longTimestamp': new Date().getTime(),
						'strTitle': objectVideo.strTitle,
						'intCount': 1
					});
				}
			};
		};

		return functionTransaction();
	},

	watch: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionSelect();
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

					return functionPut();

				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					Select_strIdent = objectRequest.result.strIdent;
					Select_longTimestamp = objectArguments.longTimestamp || objectRequest.result.longTimestamp || new Date().getTime();
					Select_strTitle = objectArguments.strTitle || objectRequest.result.strTitle || '';
					Select_intCount = objectRequest.result.intCount + 1 || 1;

					return functionPut();

				}
			};
		};

		var functionPut = function() {
			if (Select_strIdent.trim() === '') {
				return functionSelectIterator(1);

			} else if (Select_strTitle.trim() === '') {
				return functionSelectIterator(1);

			}

			var objectRequest = Transaction_objectStore.put({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});

			objectRequest.onsuccess = function() {
				return functionCount();
			};
		};

		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();

			objectRequest.onsuccess = function() {
				window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));

				return functionBroadcast();
			};
		};

		var functionBroadcast = function() {
			chrome.tabs.query({
				'url': '*://*.youtube.com/*'
			}, function(objectTabs) {
				for (var objectTab of objectTabs) {
					chrome.tabs.sendMessage(objectTab.id, {
						'strMessage': 'youtubeUpdate'
					});
				}
			});

			return functionCallback({
				'strIdent': Select_strIdent,
				'longTimestamp': Select_longTimestamp,
				'strTitle': Select_strTitle,
				'intCount': Select_intCount
			});
		};

		return functionTransaction();
	},

	lookup: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;

		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readonly').objectStore('storeDatabase');

			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};

			return functionSelect();
		};
		
		var Select_objectStore = null;
		
		var functionSelect = function() {
			Select_objectStore = Transaction_objectStore.index('strIdent');
			
			return objectArguments.objectVideos.forEach(functionParallel);
		};
		
		var functionParallel = function(objectVideo) {
			if (objectVideo.strIdent.trim() === '') {
				return;

			} else if (objectVideo.strTitle.trim() === '') {
				return;

			}

			var objectRequest = Select_objectStore.get(objectVideo.strIdent);
			
			objectRequest.onsuccess = function() {
				if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					return functionCallback({
						'strIdent': objectRequest.result.strIdent,
						'longTimestamp': objectRequest.result.longTimestamp,
						'strTitle': objectRequest.result.strTitle,
						'intCount': objectRequest.result.intCount
					});
				}
			};
		};
		
		return functionTransaction();
	}
};
Youtube.init();

var Search = {
	init: function() {
		chrome.runtime.onConnect.addListener(function(objectPort) {
			if (objectPort.name === 'search') {
				objectPort.onMessage.addListener(function(objectData) {
					if (objectData.strMessage === 'searchLookup') {
						Search.lookup(objectData.objectArguments, function(objectArguments) {
							objectPort.postMessage({
								'strMessage': 'searchLookup',
								'objectArguments': objectArguments
							});
						});

					} else if (objectData.strMessage === 'searchDelete') {
						Search.delete(objectData.objectArguments, function(objectArguments) {
							objectPort.postMessage({
								'strMessage': 'searchDelete',
								'objectArguments': objectArguments
							});
						});

					}
				});
			}
		});
	},
	
	dispel: function() {
		
	},
	
	lookup: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readonly').objectStore('storeDatabase');
			
			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};
			
			return functionSelect();
		};
		
		var Select_objectResults = [];
		
		var functionSelect = function() {
			var objectRequest = Transaction_objectStore.index('longTimestamp').openCursor(null, 'prev');
			
			objectRequest.onsuccess = function() {
				if ((objectRequest.result === undefined) || (objectRequest.result === null) || (Select_objectResults.length === 10)) {
					return functionCallback({
						'objectResults': Select_objectResults
					});
					
				} else if ((objectRequest.result !== undefined) && (objectRequest.result !== null)) {
					if (objectRequest.result.value.strTitle.toLowerCase().indexOf(objectArguments.strQuery) !== -1) {
						Select_objectResults.push({
							'strIdent': objectRequest.result.value.strIdent,
							'longTimestamp': objectRequest.result.value.longTimestamp,
							'strTitle': objectRequest.result.value.strTitle,
							'intCount': objectRequest.result.value.intCount
						});
					}
					
					objectRequest.result.continue();
					
				}
			};
		};
		
		return functionTransaction();
	},
	
	delete: function(objectArguments, functionCallback) {
		var Transaction_objectStore = null;
		
		var functionTransaction = function() {
			Transaction_objectStore = Database.objectDatabase.transaction([ 'storeDatabase' ], 'readwrite').objectStore('storeDatabase');
			
			Transaction_objectStore.onerror = function() {
				return functionCallback(null);
			};
			
			return functionReset();
		};
		
		var functionReset = function() {
			var objectRequest = Transaction_objectStore.delete(objectArguments.strIdent);
			
			objectRequest.onsuccess = function() {
				return functionCount();
			};
		};
		
		var functionCount = function() {
			var objectRequest = Transaction_objectStore.count();
			
			objectRequest.onsuccess = function() {
				window.localStorage.setItem('extensions.YouRect.Database.intSize', String(objectRequest.result));
				
				return functionCallback({});
			};
		};
		
		return functionTransaction();
	}
};
Search.init();

{
	if (window.localStorage.getItem('extensions.YouRect.Database.intSize') === null) {
		window.localStorage.setItem('extensions.YouRect.Database.intSize', String(0));
	}

	if (window.localStorage.getItem('extensions.YouRect.History.longTimestamp') === null) {
		window.localStorage.setItem('extensions.YouRect.History.longTimestamp', String(0));
	}

	if (window.localStorage.getItem('extensions.YouRect.Youtube.longTimestamp') === null) {
		window.localStorage.setItem('extensions.YouRect.Youtube.longTimestamp', String(0));
	}

	if (window.localStorage.getItem('extensions.YouRect.Visualization.boolHideprogress') === null) {
		window.localStorage.setItem('extensions.YouRect.Visualization.boolHideprogress', String(false));
	}
}

{
	chrome.browserAction.onClicked.addListener(function() {
		chrome.tabs.create({
			'url': 'content/index.html'
		});
	});
}

{
	chrome.tabs.onUpdated.addListener(function(intTab, objectData, objectTab) {
		if (objectTab.url.indexOf('https://www.youtube.com') === 0) {
			chrome.tabs.sendMessage(objectTab.id, {
				'strMessage': 'youtubeUpdate'
			});

			if (window.localStorage.getItem('extensions.YouRect.Visualization.boolHideprogress') === String(true)) {
				chrome.tabs.insertCSS(objectTab.id, {
					'code': 'ytd-thumbnail-overlay-resume-playback-renderer { display:none; }' // new
				});

				chrome.tabs.insertCSS(objectTab.id, {
					'code': '.resume-playback-background { display:none; } .resume-playback-progress-bar { display:none; }' // old
				});
			}
		}
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

	chrome.webRequest.onCompleted.addListener(function(objectData) {
		chrome.tabs.sendMessage(objectData.tabId, {
			'strMessage': 'youtubeImage',
			'strIdent': new RegExp('(\\/vi\\/)([^ ]*)(\\/)', 'g').exec(objectData.url)[2]
		});
	}, {
		'urls': [ '*://*.ytimg.com/vi/*/*' ]
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