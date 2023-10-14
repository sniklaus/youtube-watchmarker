'use strict';

var funcBrowser = function() {
    if (typeof(browser) !== 'undefined') {
        return 'firefox';
    }

    if (typeof(chrome) !== 'undefined') {
        return 'chrome';
    }

    return null;
}

var funcHackyparse = function(strJson) {
    for (var intLength = 1; intLength < strJson.length; intLength += 1) {
        if (strJson[intLength - 1] !== '}') {
            continue;
        }

        try {
            return JSON.parse(strJson.substr(0, intLength));
        } catch (objError) {
            // ...
        }
    }

    return null;
}

var funcSendmessage = function(intTab, objMessage, intRetry) {
    if (intRetry === 0) {
        return;

    } else if (intRetry === undefined) {
        intRetry = 100;

    }

    chrome.tabs.sendMessage(intTab, objMessage, {}, function(objResponse) {
        if ((chrome.runtime.lastError !== undefined) && (chrome.runtime.lastError !== null)) {
            setTimeout(funcSendmessage, 100, intTab, objMessage, intRetry - 1);
        }
    });
};

var Node = {
    series: function(objFunctions, funcCallback) {
        var strFunctions = Object.keys(objFunctions);

        var objWorkspace = {};

        var funcNext = function(objArguments, objOverwrite) {
            if (objArguments === null) {
                return funcCallback(null);
            }

            objWorkspace[strFunctions[0]] = objArguments;

            strFunctions.shift();

            if (objOverwrite !== undefined) {
                if (typeof(objOverwrite) === 'string') {
                    strFunctions = Object.keys(objFunctions);

                    while (true) {
                        if (strFunctions.length === 0) {
                            break;

                        } else if (strFunctions[0] === objOverwrite) {
                            break;

                        }

                        strFunctions.shift();
                    };

                } else if (typeof(objOverwrite) === 'object') {
                    strFunctions = objOverwrite;

                }
            }

            if (strFunctions.length === 0) {
                return funcCallback(objWorkspace);
            }

            objFunctions[strFunctions[0]](objWorkspace, funcNext);
        };

        objFunctions[strFunctions[0]](objWorkspace, funcNext);
    }
};

// ##########################################################

var Database = {
    objDatabase: null,

    init: function(objRequest, funcResponse) {
        Node.series({
            'objOpen': function(objArguments, funcCallback) {
                var objOpen = window.indexedDB.open('Database', 401);

                objOpen.onupgradeneeded = function() {
                    var objStore = null;

                    if (objOpen.result.objectStoreNames.contains('storeDatabase') === true) {
                        objStore = objOpen.transaction.objectStore('storeDatabase');

                    } else if (objOpen.result.objectStoreNames.contains('storeDatabase') === false) {
                        objStore = objOpen.result.createObjectStore('storeDatabase', {
                            'keyPath': 'strIdent'
                        });

                    }

                    if (objStore.indexNames.contains('strIdent') === false) {
                        objStore.createIndex('strIdent', 'strIdent', {
                            'unique': true
                        });
                    }

                    if (objStore.indexNames.contains('intTimestamp') === false) {
                        objStore.createIndex('intTimestamp', 'intTimestamp', {
                            'unique': false
                        });
                    }

                    if (objStore.indexNames.contains('longTimestamp') === true) {
                        objStore.deleteIndex('longTimestamp'); // legacy
                    }
                };

                objOpen.onerror = function() {
                    Database.objDatabase = null;

                    return funcCallback(null);
                };

                objOpen.onsuccess = function() {
                    Database.objDatabase = objOpen.result;

                    return funcCallback({});
                };
            },
            'objLegacy': function(objArguments, funcCallback) {
                var objStore = Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase');

                var objQuery = objStore.openCursor();

                objQuery.onsuccess = function() {
                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        return funcCallback({});
                    }

                    if (objQuery.result.value.intTimestamp === undefined) {
                        objStore.put({
                            'strIdent': objQuery.result.value.strIdent,
                            'intTimestamp': objQuery.result.value.longTimestamp,
                            'strTitle': objQuery.result.value.strTitle,
                            'intCount': objQuery.result.value.intCount
                        });
                    }

                    objQuery.result.continue();
                };
            },
            'objMessaging': function(objArguments, funcCallback) {
                chrome.runtime.onConnect.addListener(function(objPort) {
                    if (objPort.name === 'database') {
                        objPort.onMessage.addListener(function(objData) {
                            if (objData.strMessage === 'databaseExport') {
                                Database.export(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'databaseExport',
                                        'objResponse': objResponse
                                    });
                                }, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'databaseExport-progress',
                                        'objResponse': objResponse
                                    });
                                });

                            } else if (objData.strMessage === 'databaseImport') {
                                Database.import(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'databaseImport',
                                        'objResponse': objResponse
                                    });
                                }, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'databaseImport-progress',
                                        'objResponse': objResponse
                                    });
                                });

                            } else if (objData.strMessage === 'databaseReset') {
                                Database.reset(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'databaseReset',
                                        'objResponse': objResponse
                                    });
                                });

                            }
                        });
                    }
                });

                return funcCallback({});
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    },

    export: function(objRequest, funcResponse, funcProgress) {
        Node.series({
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readonly').objectStore('storeDatabase'));
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.openCursor();

                objQuery.results = [];

                objQuery.onsuccess = function() {
                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        return funcCallback(objQuery.results);
                    }

                    funcProgress({
                        'strProgress': 'collected ' + objQuery.results.length + ' videos'
                    });

                    objQuery.results.push({
                        'strIdent': objQuery.result.value.strIdent,
                        'intTimestamp': objQuery.result.value.intTimestamp,
                        'strTitle': objQuery.result.value.strTitle,
                        'intCount': objQuery.result.value.intCount
                    });

                    objQuery.result.continue();
                };
            },
            'objDownload': function(objArguments, funcCallback) {
                chrome.downloads.download({
                    'url' : URL.createObjectURL(new Blob([btoa(unescape(encodeURIComponent(JSON.stringify(objArguments.objGet))))], {
                        'type': 'application/octet-stream'
                    })),
                    'filename': new Date().getFullYear() + '.' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '.' + ('0' + new Date().getDate()).slice(-2) + '.database',
                    'saveAs': true
                });

                return funcCallback({});
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    },

    import: function(objRequest, funcResponse, funcProgress) {
        Node.series({
            'objVideos': function(objArguments, funcCallback) {
                return funcCallback(objRequest.objVideos);
            },
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase'));
            },
            'objVideo': function(objArguments, funcCallback) {
                if (objArguments.hasOwnProperty('intVideo') === false) {
                    objArguments.intVideo = 0;
                }

                if (objArguments.intVideo >= objArguments.objVideos.length) {
                    return funcCallback({}, 'objVideo-Next');
                }

                return funcCallback(objArguments.objVideos[objArguments.intVideo]);
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.index('strIdent').get(objArguments.objVideo.strIdent);

                objQuery.onsuccess = function() {
                    if (objArguments.intNew === undefined) {
                        objArguments.intNew = 0;
                        objArguments.intExisting = 0;
                    }

                    funcProgress({
                        'strProgress': 'imported ' + (objArguments.intNew + objArguments.intExisting) + ' videos - ' + objArguments.intNew + ' were new'
                    });

                    if (objArguments.objVideo.intTimestamp === undefined) {
                        objArguments.objVideo.intTimestamp = objArguments.objVideo.longTimestamp; // legacy
                    }

                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        objArguments.intNew += 1;

                        return funcCallback({
                            'strIdent': objArguments.objVideo.strIdent,
                            'intTimestamp': objArguments.objVideo.intTimestamp || new Date().getTime(),
                            'strTitle': objArguments.objVideo.strTitle || '',
                            'intCount': objArguments.objVideo.intCount || 1
                        });

                    } else if ((objQuery.result !== undefined) && (objQuery.result !== null)) {
                        objArguments.intExisting += 1;

                        return funcCallback({
                            'strIdent': objQuery.result.strIdent,
                            'intTimestamp': Math.max(objQuery.result.intTimestamp, objArguments.objVideo.intTimestamp) || new Date().getTime(),
                            'strTitle': objQuery.result.strTitle || objArguments.objVideo.strTitle || '',
                            'intCount': Math.max(objQuery.result.intCount, objArguments.objVideo.intCount) || 1
                        });

                    }
                };
            },
            'objPut': function(objArguments, funcCallback) {
                if (objArguments.objGet.strIdent.trim() === '') {
                    return funcCallback({});

                } else if (objArguments.objGet.strTitle.trim() === '') {
                    return funcCallback({});

                }

                var objQuery = objArguments.objDatabase.put(objArguments.objGet);

                objQuery.onsuccess = function() {
                    return funcCallback({});
                };
            },
            'objVideo-Next': function(objArguments, funcCallback) {
                objArguments.intVideo += 1;

                if (objArguments.intVideo < objArguments.objVideos.length) {
                    return funcCallback({}, 'objVideo');
                }

                objArguments.intVideo = 0;

                return funcCallback({});
            },
            'objCount': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.count();

                objQuery.onsuccess = function() {
                    window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(objQuery.result));

                    return funcCallback({});
                };
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    },

    reset: function(objRequest, funcResponse) {
        Node.series({
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase'));
            },
            'objClear': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.clear();

                objQuery.onsuccess = function() {
                    return funcCallback({});
                };
            },
            'objCount': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.count();

                objQuery.onsuccess = function() {
                    window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(objQuery.result));

                    return funcCallback({});
                };
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    }
};

var History = {
    init: function(objRequest, funcResponse) {
        Node.series({
            'objMessaging': function(objArguments, funcCallback) {
                chrome.runtime.onConnect.addListener(function(objPort) {
                    if (objPort.name === 'history') {
                        objPort.onMessage.addListener(function(objData) {
                            if (objData.strMessage === 'historySynchronize') {
                                History.synchronize(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'historySynchronize',
                                        'objResponse': objResponse
                                    });
                                }, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'historySynchronize-progress',
                                        'objResponse': objResponse
                                    });
                                });
                            }
                        });
                    }
                });

                return funcCallback({});
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    },

    synchronize: function(objRequest, funcResponse, funcProgress) {
        Node.series({
            'objVideos': function(objArguments, funcCallback) {
                chrome.history.search({
                    'text': 'https://www.youtube.com/',
                    'startTime': objRequest.intTimestamp,
                    'maxResults': 1000000
                }, function(objResults) {
                    var objVideos = [];

                    for (var objResult of objResults) {
                        if ((objResult.url.indexOf('https://www.youtube.com/watch?v=') !== 0) && (objResult.url.indexOf('https://www.youtube.com/shorts/') !== 0)) {
                            continue;

                        } else if ((objResult.title === undefined) || (objResult.title === null)) {
                            continue;

                        }

                        if (objResult.title.slice(-10) === ' - YouTube') {
                            objResult.title = objResult.title.slice(0, -10)
                        }

                        objVideos.push({
                            'strIdent': objResult.url.split('&')[0].slice(-11),
                            'intTimestamp': objResult.lastVisitTime,
                            'strTitle': objResult.title,
                            'intCount': objResult.visitCount
                        });
                    }

                    return funcCallback(objVideos);
                });
            },
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase'));
            },
            'objVideo': function(objArguments, funcCallback) {
                if (objArguments.hasOwnProperty('intVideo') === false) {
                    objArguments.intVideo = 0;
                }

                if (objArguments.intVideo >= objArguments.objVideos.length) {
                    return funcCallback({}, 'objVideo-Next');
                }

                return funcCallback(objArguments.objVideos[objArguments.intVideo]);
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.index('strIdent').get(objArguments.objVideo.strIdent);

                objQuery.onsuccess = function() {
                    if (objArguments.intNew === undefined) {
                        objArguments.intNew = 0;
                        objArguments.intExisting = 0;
                    }

                    funcProgress({
                        'strProgress': 'imported ' + (objArguments.intNew + objArguments.intExisting) + ' videos - ' + objArguments.intNew + ' were new'
                    });

                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        objArguments.intNew += 1;

                        return funcCallback({
                            'strIdent': objArguments.objVideo.strIdent,
                            'intTimestamp': objArguments.objVideo.intTimestamp || new Date().getTime(),
                            'strTitle': objArguments.objVideo.strTitle || '',
                            'intCount': objArguments.objVideo.intCount || 1
                        });

                    } else if ((objQuery.result !== undefined) && (objQuery.result !== null)) {
                        objArguments.intExisting += 1;

                        return funcCallback({
                            'strIdent': objQuery.result.strIdent,
                            'intTimestamp': Math.max(objQuery.result.intTimestamp, objArguments.objVideo.intTimestamp) || new Date().getTime(),
                            'strTitle': objQuery.result.strTitle || objArguments.objVideo.strTitle || '',
                            'intCount': Math.max(objQuery.result.intCount, objArguments.objVideo.intCount) || 1
                        });

                    }
                };
            },
            'objPut': function(objArguments, funcCallback) {
                if (objArguments.objGet.strIdent.trim() === '') {
                    return funcCallback({});

                } else if (objArguments.objGet.strTitle.trim() === '') {
                    return funcCallback({});

                }

                var objQuery = objArguments.objDatabase.put(objArguments.objGet);

                objQuery.onsuccess = function() {
                    return funcCallback({});
                };
            },
            'objVideo-Next': function(objArguments, funcCallback) {
                objArguments.intVideo += 1;

                if (objArguments.intVideo < objArguments.objVideos.length) {
                    return funcCallback({}, 'objVideo');
                }

                objArguments.intVideo = 0;

                return funcCallback({});
            },
            'objCount': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.count();

                objQuery.onsuccess = function() {
                    window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(objQuery.result));

                    return funcCallback({});
                };
            },
            'objTime': function(objArguments, funcCallback) {
                window.localStorage.setItem('extensions.Youwatch.History.intTimestamp', String(new Date().getTime()));

                return funcCallback({});
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    }
};

var Youtube = {
    init: function(objRequest, funcResponse) {
        Node.series({
            'objMessaging': function(objArguments, funcCallback) {
                chrome.runtime.onConnect.addListener(function(objPort) {
                    if (objPort.name === 'youtube') {
                        objPort.onMessage.addListener(function(objData) {
                            if (objData.strMessage === 'youtubeSynchronize') {
                                Youtube.synchronize(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'youtubeSynchronize',
                                        'objResponse': objResponse
                                    });
                                }, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'youtubeSynchronize-progress',
                                        'objResponse': objResponse
                                    });
                                });

                            } else if (objData.strMessage === 'youtubeLookup') {
                                Youtube.lookup(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'youtubeLookup',
                                        'objResponse': objResponse
                                    });
                                });

                            } else if (objData.strMessage === 'youtubeEnsure') {
                                Youtube.ensure(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'youtubeEnsure',
                                        'objResponse': objResponse
                                    });
                                });

                            } else if (objData.strMessage === 'youtubeMark') {
                                Youtube.mark(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'youtubeMark',
                                        'objResponse': objResponse
                                    });
                                });

                            }
                        });
                    }
                });

                return funcCallback({});
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    },

    synchronize: function(objRequest, funcResponse, funcProgress) {
        Node.series({
            'objCookies': function(objArguments, funcCallback) {
                var strCookies = ['SAPISID', '__Secure-3PAPISID'];
                var objCookies = {};

                var funcCookie = function() {
                    if (strCookies.length === 0) {
                        return funcCallback(objCookies);
                    }

                    var strCookie = strCookies.shift();

                    chrome.cookies.get({
                        'url': 'https://www.youtube.com',
                        'name': strCookie
                    }, function(objCookie) {
                        if (objCookie === null) {
                            objCookies[strCookie] = null;

                        } else if (objCookie !== null) {
                            objCookies[strCookie] = objCookie.value;

                        }

                        funcCookie();
                    });
                };

                funcCookie();
            },
            'objContauth': function(objArguments, funcCallback) {
                var intTime = Math.round(new Date().getTime() / 1000.0);
                var strCookie = objArguments.objCookies['SAPISID'] || objArguments.objCookies['__Secure-3PAPISID'];
                var strOrigin = 'https://www.youtube.com';

                // https://stackoverflow.com/a/32065323

                crypto.subtle.digest('SHA-1', new TextEncoder().encode(intTime + ' ' + strCookie + ' ' + strOrigin)).then(function(strHash) {
                    return funcCallback({
                        'strAuth': 'SAPISIDHASH ' + intTime + '_' + Array.from(new Uint8Array(strHash)).map(function(intByte) { return intByte.toString(16).padStart(2, '0') }).join('')
                    });
                });
            },
            'objVideos': function(objArguments, funcCallback) {
                if (objArguments.strContinuation === undefined) {
                    objArguments.strContinuation = null;
                    objArguments.strClicktrack = null;
                    objArguments.objYtcfg = null;
                    objArguments.objYtctx = null;
                }

                var objAjax = new XMLHttpRequest();

                objAjax.onload = function() {
                    if (objArguments.objYtcfg === null) {
                        objArguments.objYtcfg = funcHackyparse(objAjax.responseText.split('ytcfg.set(').find(function(strData) { return strData.indexOf('INNERTUBE_API_KEY') !== -1; }).slice(0, -2));
                    }

                    if (objArguments.objYtctx === null) {
                        objArguments.objYtctx = funcHackyparse(objAjax.responseText.split('"INNERTUBE_CONTEXT":')[1]);
                    }

                    var strRegex = null;
                    var objContinuation = new RegExp('"continuationCommand":[^"]*"token":[^"]*"([^"]*)"', 'g');
                    var objClicktrack = new RegExp('"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"', 'g');
                    var objVideo = new RegExp('"videoRenderer":[^"]*"videoId":[^"]*"([^"]{11})".*?"text"[^"]*"([^"]*)"', 'g');
                    var strUnescaped = objAjax.responseText.split('\\"').join('\\u0022').split('\r').join('').split('\n').join('');

                    if ((strRegex = objContinuation.exec(strUnescaped)) !== null) {
                        objArguments.strContinuation = strRegex[1];
                    }

                    if ((strRegex = objClicktrack.exec(strUnescaped)) !== null) {
                        objArguments.strClicktrack = strRegex[1];
                    }

                    var objVideos = [];

                    while ((strRegex = objVideo.exec(strUnescaped)) !== null) {
                        var strIdent = strRegex[1];
                        var strTitle = strRegex[2];

                        strTitle = strTitle.split('\\u0022').join('"');
                        strTitle = strTitle.split('\\u0026').join('&');
                        strTitle = strTitle.split('\\u003C').join('<');
                        strTitle = strTitle.split('\\u003C').join('=');
                        strTitle = strTitle.split('\\u003E').join('>');
                        strTitle = strTitle.split('\\u003E').join('>');

                        objVideos.push({
                            'strIdent': strIdent,
                            'intTimestamp': null,
                            'strTitle': strTitle,
                            'intCount': null
                        });
                    }

                    return funcCallback(objVideos);
                };

                if ((objArguments.strContinuation === null) || (objArguments.strClicktrack === null) || (objArguments.objYtcfg === null) || (objArguments.objYtctx === null)) {
                    objAjax.open('GET', 'https://www.youtube.com/feed/history');

                    objAjax.send();

                } else if ((objArguments.strContinuation !== null) && (objArguments.strClicktrack !== null) && (objArguments.objYtcfg !== null) && (objArguments.objYtctx !== null)) {
                    objAjax.open('POST', 'https://www.youtube.com/youtubei/v1/browse?key=' + objArguments.objYtcfg['INNERTUBE_API_KEY']);

                    objAjax.setRequestHeader('Authorization', objArguments.objContauth.strAuth);
                    objAjax.setRequestHeader('Content-Type', 'application/json');
                    objAjax.setRequestHeader('X-Origin', 'https://www.youtube.com');
                    objAjax.setRequestHeader('X-Goog-AuthUser', '0');
                    objAjax.setRequestHeader('X-Goog-PageId', objArguments.objYtcfg['DELEGATED_SESSION_ID']);
                    objAjax.setRequestHeader('X-Goog-Visitor-Id', objArguments.objYtctx['client']['visitorData']);

                    objArguments.objYtctx['client']['screenWidthPoints'] = 1024;
                    objArguments.objYtctx['client']['screenHeightPoints'] = 768;
                    objArguments.objYtctx['client']['screenPixelDensity'] = 1;
                    objArguments.objYtctx['client']['utcOffsetMinutes'] = -420;
                    objArguments.objYtctx['client']['userInterfaceTheme'] = 'USER_INTERFACE_THEME_LIGHT';

                    objArguments.objYtctx['request']['internalExperimentFlags'] = [];
                    objArguments.objYtctx['request']['consistencyTokenJars'] = [];

                    objAjax.send(JSON.stringify({
                        'context': {
                            'client': objArguments.objYtctx['client'],
                            'request': objArguments.objYtctx['request'],
                            'user': {},
                            'clickTracking': {
                                'clickTrackingParams': objArguments.strClicktrack
                            }
                        },
                        'continuation': objArguments.strContinuation
                    }));

                }

                if (objArguments.strContinuation !== null) {
                    objArguments.strContinuation = null;
                }
            },
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase'));
            },
            'objVideo': function(objArguments, funcCallback) {
                if (objArguments.hasOwnProperty('intVideo') === false) {
                    objArguments.intVideo = 0;
                }

                if (objArguments.intVideo >= objArguments.objVideos.length) {
                    return funcCallback({}, 'objVideo-Next');
                }

                return funcCallback(objArguments.objVideos[objArguments.intVideo]);
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.index('strIdent').get(objArguments.objVideo.strIdent);

                objQuery.onsuccess = function() {
                    if (objArguments.intNew === undefined) {
                        objArguments.intNew = 0;
                        objArguments.intExisting = 0;
                    }

                    funcProgress({
                        'strProgress': 'imported ' + (objArguments.intNew + objArguments.intExisting) + ' videos - ' + objArguments.intNew + ' were new'
                    });

                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        objArguments.intNew += 1;

                        return funcCallback({
                            'strIdent': objArguments.objVideo.strIdent,
                            'intTimestamp': objArguments.objVideo.intTimestamp || new Date().getTime(),
                            'strTitle': objArguments.objVideo.strTitle || '',
                            'intCount': objArguments.objVideo.intCount || 1
                        });

                    } else if ((objQuery.result !== undefined) && (objQuery.result !== null)) {
                        objArguments.intExisting += 1;

                        return funcCallback({
                            'strIdent': objQuery.result.strIdent,
                            'intTimestamp': objArguments.objVideo.intTimestamp || objQuery.result.intTimestamp || new Date().getTime(),
                            'strTitle': objArguments.objVideo.strTitle || objQuery.result.strTitle || '',
                            'intCount': objArguments.objVideo.intCount || objQuery.result.intCount || 1
                        });

                    }
                };
            },
            'objPut': function(objArguments, funcCallback) {
                if (objArguments.objGet.strIdent.trim() === '') {
                    return funcCallback({});

                } else if (objArguments.objGet.strTitle.trim() === '') {
                    return funcCallback({});

                }

                var objQuery = objArguments.objDatabase.put(objArguments.objGet);

                objQuery.onsuccess = function() {
                    return funcCallback({});
                };
            },
            'objVideo-Next': function(objArguments, funcCallback) {
                objArguments.intVideo += 1;

                if (objArguments.intVideo < objArguments.objVideos.length) {
                    return funcCallback({}, 'objVideo');
                }

                objArguments.intVideo = 0;

                return funcCallback({});
            },
            'objCount': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.count();

                objQuery.onsuccess = function() {
                    window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(objQuery.result));

                    return funcCallback({});
                };
            },
            'objTime': function(objArguments, funcCallback) {
                window.localStorage.setItem('extensions.Youwatch.Youtube.intTimestamp', String(new Date().getTime()));

                return funcCallback({});
            },
            'objContinuation': function(objArguments, funcCallback) {
                if (objArguments.intExisting < objRequest.intThreshold) {
                    if (objArguments.strContinuation !== null) {
                        return funcCallback({}, 'objContauth');
                    }
                }

                return funcCallback({});
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    },

    lookup: function(objRequest, funcResponse) {
        Node.series({
            'objVideo': function(objArguments, funcCallback) {
                return funcCallback(objRequest);
            },
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readonly').objectStore('storeDatabase'));
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.index('strIdent').get(objArguments.objVideo.strIdent);

                objQuery.onsuccess = function() {
                    if ((objQuery.result !== undefined) && (objQuery.result !== null)) {
                        return funcCallback({
                            'strIdent': objQuery.result.strIdent,
                            'intTimestamp': objQuery.result.intTimestamp || new Date().getTime(),
                            'strTitle': objQuery.result.strTitle || '',
                            'intCount': objQuery.result.intCount || 1
                        });
                    }

                    return funcCallback(null);
                };
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse(objArguments.objGet);

            }
        });
    },

    ensure: function(objRequest, funcResponse) {
        Node.series({
            'objVideo': function(objArguments, funcCallback) {
                return funcCallback(objRequest);
            },
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase'));
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.index('strIdent').get(objArguments.objVideo.strIdent);

                objQuery.onsuccess = function() {
                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        return funcCallback({
                            'strIdent': objArguments.objVideo.strIdent,
                            'intTimestamp': objArguments.objVideo.intTimestamp || new Date().getTime(),
                            'strTitle': objArguments.objVideo.strTitle || '',
                            'intCount': objArguments.objVideo.intCount || 1
                        });
                    }

                    return funcCallback(null);
                };
            },
            'objPut': function(objArguments, funcCallback) {
                if (objArguments.objGet.strIdent.trim() === '') {
                    return funcCallback({});

                } else if (objArguments.objGet.strTitle.trim() === '') {
                    return funcCallback({});

                }

                var objQuery = objArguments.objDatabase.put(objArguments.objGet);

                objQuery.onsuccess = function() {
                    return funcCallback({});
                };
            },
            'objCount': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.count();

                objQuery.onsuccess = function() {
                    window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(objQuery.result));

                    return funcCallback({});
                };
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse(objArguments.objGet);

            }
        });
    },

    mark: function(objRequest, funcResponse) {
        Node.series({
            'objVideo': function(objArguments, funcCallback) {
                return funcCallback(objRequest);
            },
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase'));
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.index('strIdent').get(objArguments.objVideo.strIdent);

                objQuery.onsuccess = function() {
                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        return funcCallback({
                            'strIdent': objArguments.objVideo.strIdent,
                            'intTimestamp': objArguments.objVideo.intTimestamp || new Date().getTime(),
                            'strTitle': objArguments.objVideo.strTitle || '',
                            'intCount': objArguments.objVideo.intCount || 1
                        });

                    } else if ((objQuery.result !== undefined) && (objQuery.result !== null)) {
                        return funcCallback({
                            'strIdent': objQuery.result.strIdent,
                            'intTimestamp': objArguments.objVideo.intTimestamp || objQuery.result.intTimestamp || new Date().getTime(),
                            'strTitle': objArguments.objVideo.strTitle || objQuery.result.strTitle || '',
                            'intCount': objQuery.result.intCount + 1 || 1
                        });

                    }
                };
            },
            'objPut': function(objArguments, funcCallback) {
                if (objArguments.objGet.strIdent.trim() === '') {
                    return funcCallback({});

                } else if (objArguments.objGet.strTitle.trim() === '') {
                    return funcCallback({});

                }

                var objQuery = objArguments.objDatabase.put(objArguments.objGet);

                objQuery.onsuccess = function() {
                    return funcCallback({});
                };
            },
            'objCount': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.count();

                objQuery.onsuccess = function() {
                    window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(objQuery.result));

                    return funcCallback({});
                };
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse(objArguments.objGet);

            }
        });
    }
};

var Search = {
    init: function(objRequest, funcResponse) {
        Node.series({
            'objMessaging': function(objArguments, funcCallback) {
                chrome.runtime.onConnect.addListener(function(objPort) {
                    if (objPort.name === 'search') {
                        objPort.onMessage.addListener(function(objData) {
                            if (objData.strMessage === 'searchLookup') {
                                Search.lookup(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'searchLookup',
                                        'objResponse': objResponse
                                    });
                                });

                            } else if (objData.strMessage === 'searchDelete') {
                                Search.delete(objData.objRequest, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'searchDelete',
                                        'objResponse': objResponse
                                    });
                                }, function(objResponse) {
                                    objPort.postMessage({
                                        'strMessage': 'searchDelete-progress',
                                        'objResponse': objResponse
                                    });
                                });

                            }
                        });
                    }
                });

                return funcCallback({});
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    },

    lookup: function(objRequest, funcResponse) {
        Node.series({
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readonly').objectStore('storeDatabase'));
            },
            'objGet': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.index('intTimestamp').openCursor(null, 'prev');

                objQuery.skip = objRequest.intSkip;
                objQuery.results = [];

                objQuery.onsuccess = function() {
                    if ((objQuery.result === undefined) || (objQuery.result === null)) {
                        return funcCallback(objQuery.results);
                    }

                    if (objQuery.results.length === objRequest.intLength) {
                        return funcCallback(objQuery.results);
                    }

                    if ((objQuery.result.value.strIdent.toLowerCase().indexOf(objRequest.strQuery.toLowerCase()) !== -1) || (objQuery.result.value.strTitle.toLowerCase().indexOf(objRequest.strQuery.toLowerCase()) !== -1)) {
                        if (objQuery.skip !== 0) {
                            objQuery.skip -= 1;

                        } else if (objQuery.skip === 0) {
                            objQuery.results.push({
                                'strIdent': objQuery.result.value.strIdent,
                                'intTimestamp': objQuery.result.value.intTimestamp,
                                'strTitle': objQuery.result.value.strTitle,
                                'intCount': objQuery.result.value.intCount
                            });

                        }
                    }

                    objQuery.result.continue();
                };
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({
                    'objVideos': objArguments.objGet
                });

            }
        });
    },

    delete: function(objRequest, funcResponse, funcProgress) {
        Node.series({
            'objDatabase': function(objArguments, funcCallback) {
                return funcCallback(Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase'));
            },
            'objDelete': function(objArguments, funcCallback) {
                funcProgress({
                    'strProgress': '1/4 - deleting it from the database'
                });

                var objQuery = objArguments.objDatabase.delete(objRequest.strIdent);

                objQuery.onsuccess = function() {
                    return funcCallback({});
                };
            },
            'objCount': function(objArguments, funcCallback) {
                var objQuery = objArguments.objDatabase.count();

                objQuery.onsuccess = function() {
                    window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(objQuery.result));

                    return funcCallback({});
                };
            },
            'objHistory': function(objArguments, funcCallback) {
                funcProgress({
                    'strProgress': '2/4 - deleting it from the history in the browser'
                });

                chrome.history.search({
                    'text': objRequest.strIdent,
                    'startTime': 0,
                    'maxResults': 1000000
                }, function(objResults) {
                    for (var objResult of objResults) {
                        if ((objResult.url.indexOf('https://www.youtube.com/watch?v=') !== 0) && (objResult.url.indexOf('https://www.youtube.com/shorts/') !== 0)) {
                            continue;

                        } else if ((objResult.title === undefined) || (objResult.title === null)) {
                            continue;

                        }

                        chrome.history.deleteUrl({
                            'url': objResult.url
                        });
                    }

                    return funcCallback({});
                });
            },
            'objCookies': function(objArguments, funcCallback) {
                var strCookies = ['SAPISID', '__Secure-3PAPISID'];
                var objCookies = {};

                var funcCookie = function() {
                    if (strCookies.length === 0) {
                        return funcCallback(objCookies);
                    }

                    var strCookie = strCookies.shift();

                    chrome.cookies.get({
                        'url': 'https://www.youtube.com',
                        'name': strCookie
                    }, function(objCookie) {
                        if (objCookie === null) {
                            objCookies[strCookie] = null;

                        } else if (objCookie !== null) {
                            objCookies[strCookie] = objCookie.value;

                        }

                        funcCookie();
                    });
                };

                funcCookie();
            },
            'objContauth': function(objArguments, funcCallback) {
                var intTime = Math.round(new Date().getTime() / 1000.0);
                var strCookie = objArguments.objCookies['SAPISID'] || objArguments.objCookies['__Secure-3PAPISID'];
                var strOrigin = 'https://www.youtube.com';

                // https://stackoverflow.com/a/32065323

                crypto.subtle.digest('SHA-1', new TextEncoder().encode(intTime + ' ' + strCookie + ' ' + strOrigin)).then(function(strHash) {
                    return funcCallback({
                        'strAuth': 'SAPISIDHASH ' + intTime + '_' + Array.from(new Uint8Array(strHash)).map(function(intByte) { return intByte.toString(16).padStart(2, '0') }).join('')
                    });
                });
            },
            'objYoulookup': function(objArguments, funcCallback) {
                funcProgress({
                    'strProgress': '3/4 - locating it in the history on youtube'
                });

                if ((objArguments.intRetry = (objArguments.intRetry || 10) - 1) === 0) {
                    return funcCallback(null);
                }

                if (objArguments.strContinuation === undefined) {
                    objArguments.strContinuation = null;
                    objArguments.strClicktrack = null;
                    objArguments.objYtcfg = null;
                    objArguments.objYtctx = null;
                }

                var objAjax = new XMLHttpRequest();

                objAjax.onload = function() {
                    if (objArguments.objYtcfg === null) {
                        objArguments.objYtcfg = funcHackyparse(objAjax.responseText.split('ytcfg.set(').find(function(strData) { return strData.indexOf('INNERTUBE_API_KEY') !== -1; }).slice(0, -2));
                    }

                    if (objArguments.objYtctx === null) {
                        objArguments.objYtctx = funcHackyparse(objAjax.responseText.split('"INNERTUBE_CONTEXT":')[1]);
                    }

                    var strRegex = null;
                    var objContinuation = new RegExp('"continuationCommand":[^"]*"token":[^"]*"([^"]*)"', 'g');
                    var objClicktrack = new RegExp('"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"', 'g');
                    var objVideo = new RegExp('"videoRenderer":[^"]*"videoId":[^"]*"([^"]{11})".*?"topLevelButtons".*?"clickTrackingParams"[^"]*"([^"]*)".*?"feedbackToken"[^"]*"([^"]*)"', 'g');
                    var strUnescaped = objAjax.responseText.split('\\"').join('\\u0022').split('\r').join('').split('\n').join('');

                    if ((strRegex = objContinuation.exec(strUnescaped)) !== null) {
                        objArguments.strContinuation = strRegex[1];
                    }

                    if ((strRegex = objClicktrack.exec(strUnescaped)) !== null) {
                        objArguments.strClicktrack = strRegex[1];
                    }

                    while ((strRegex = objVideo.exec(strUnescaped)) !== null) {
                        var strIdent = strRegex[1];
                        var strClicktrack = strRegex[2];
                        var strFeedback = strRegex[3];

                        if (strIdent !== objRequest.strIdent) {
                            continue;
                        }

                        return funcCallback({
                            'strIdent': strIdent,
                            'strClicktrack': strClicktrack,
                            'strFeedback': strFeedback
                        });
                    }

                    return funcCallback({}, 'objContauth');
                };

                if ((objArguments.strContinuation === null) || (objArguments.strClicktrack === null) || (objArguments.objYtcfg === null) || (objArguments.objYtctx === null)) {
                    objAjax.open('GET', 'https://www.youtube.com/feed/history');

                    objAjax.send();

                } else if ((objArguments.strContinuation !== null) && (objArguments.strClicktrack !== null) && (objArguments.objYtcfg !== null) && (objArguments.objYtctx !== null)) {
                    objAjax.open('POST', 'https://www.youtube.com/youtubei/v1/browse?key=' + objArguments.objYtcfg['INNERTUBE_API_KEY']);

                    objAjax.setRequestHeader('Authorization', objArguments.objContauth.strAuth);
                    objAjax.setRequestHeader('Content-Type', 'application/json');
                    objAjax.setRequestHeader('X-Origin', 'https://www.youtube.com');
                    objAjax.setRequestHeader('X-Goog-AuthUser', '0');
                    objAjax.setRequestHeader('X-Goog-PageId', objArguments.objYtcfg['DELEGATED_SESSION_ID']);
                    objAjax.setRequestHeader('X-Goog-Visitor-Id', objArguments.objYtctx['client']['visitorData']);

                    objArguments.objYtctx['client']['screenWidthPoints'] = 1024;
                    objArguments.objYtctx['client']['screenHeightPoints'] = 768;
                    objArguments.objYtctx['client']['screenPixelDensity'] = 1;
                    objArguments.objYtctx['client']['utcOffsetMinutes'] = -420;
                    objArguments.objYtctx['client']['userInterfaceTheme'] = 'USER_INTERFACE_THEME_LIGHT';

                    objArguments.objYtctx['request']['internalExperimentFlags'] = [];
                    objArguments.objYtctx['request']['consistencyTokenJars'] = [];

                    objAjax.send(JSON.stringify({
                        'context': {
                            'client': objArguments.objYtctx['client'],
                            'request': objArguments.objYtctx['request'],
                            'user': {},
                            'clickTracking': {
                                'clickTrackingParams': objArguments.strClicktrack
                            }
                        },
                        'continuation': objArguments.strContinuation
                    }));

                }

                if (objArguments.strContinuation !== null) {
                    objArguments.strContinuation = null;
                }
            },
            'objFeedauth': function(objArguments, funcCallback) {
                var intTime = Math.round(new Date().getTime() / 1000.0);
                var strCookie = objArguments.objCookies['SAPISID'] || objArguments.objCookies['__Secure-3PAPISID'];
                var strOrigin = 'https://www.youtube.com';

                // https://stackoverflow.com/a/32065323

                crypto.subtle.digest('SHA-1', new TextEncoder().encode(intTime + ' ' + strCookie + ' ' + strOrigin)).then(function(strHash) {
                    return funcCallback({
                        'strAuth': 'SAPISIDHASH ' + intTime + '_' + Array.from(new Uint8Array(strHash)).map(function(intByte) { return intByte.toString(16).padStart(2, '0') }).join('')
                    });
                });
            },
            'objYoudelete': function(objArguments, funcCallback) {
                funcProgress({
                    'strProgress': '4/4 - deleting it from the history on youtube'
                });

                var objAjax = new XMLHttpRequest();

                objAjax.onload = function() {
                    funcResponse({});
                };

                objAjax.open('POST', 'https://www.youtube.com/youtubei/v1/feedback?key=' + objArguments.objYtcfg['INNERTUBE_API_KEY']);

                objAjax.setRequestHeader('Authorization', objArguments.objFeedauth.strAuth);
                objAjax.setRequestHeader('Content-Type', 'application/json');
                objAjax.setRequestHeader('X-Origin', 'https://www.youtube.com');
                objAjax.setRequestHeader('X-Goog-AuthUser', '0');
                objAjax.setRequestHeader('X-Goog-PageId', objArguments.objYtcfg['DELEGATED_SESSION_ID']);
                objAjax.setRequestHeader('X-Goog-Visitor-Id', objArguments.objYtctx['client']['visitorData']);

                objArguments.objYtctx['client']['screenWidthPoints'] = 1024;
                objArguments.objYtctx['client']['screenHeightPoints'] = 768;
                objArguments.objYtctx['client']['screenPixelDensity'] = 1;
                objArguments.objYtctx['client']['utcOffsetMinutes'] = -420;
                objArguments.objYtctx['client']['userInterfaceTheme'] = 'USER_INTERFACE_THEME_LIGHT';

                objArguments.objYtctx['request']['internalExperimentFlags'] = [];
                objArguments.objYtctx['request']['consistencyTokenJars'] = [];

                objAjax.send(JSON.stringify({
                    'context': {
                        'client': objArguments.objYtctx['client'],
                        'request': objArguments.objYtctx['request'],
                        'user': {},
                        'clickTracking': {
                            'clickTrackingParams': objArguments.objYoulookup.strClicktrack
                        }
                    },
                    'feedbackTokens': [objArguments.objYoulookup.strFeedback],
                    'isFeedbackTokenUnencrypted': false,
                    'shouldMerge': false
                }));
            }
        }, function(objArguments) {
            if (objArguments === null) {
                funcResponse(null);

            } else if (objArguments !== null) {
                funcResponse({});

            }
        });
    }
};

// ##########################################################

Node.series({
    'objSettings': function(objArguments, funcCallback) {
        if (window.localStorage.getItem('extensions.Youwatch.Database.intSize') === null) {
            window.localStorage.setItem('extensions.Youwatch.Database.intSize', String(0));
        }

        if (window.localStorage.getItem('extensions.Youwatch.History.intTimestamp') === null) {
            window.localStorage.setItem('extensions.Youwatch.History.intTimestamp', String(0));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Youtube.intTimestamp') === null) {
            window.localStorage.setItem('extensions.Youwatch.Youtube.intTimestamp', String(0));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === null) {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolBrownav', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === null) {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolBrowhist', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === null) {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYoubadge', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === null) {
            window.localStorage.setItem('extensions.Youwatch.Condition.boolYouhist', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === null) {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolFadeout', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === null) {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolGrayout', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === null) {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolShowbadge', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === null) {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolShowdate', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === null) {
            window.localStorage.setItem('extensions.Youwatch.Visualization.boolHideprogress', String(true));
        }

        if (window.localStorage.getItem('extensions.Youwatch.Stylesheet.strFadeout') === null) {
            window.localStorage.setItem('extensions.Youwatch.Stylesheet.strFadeout', '.youwatch-mark yt-img-shadow img { opacity:0.3; }' + ' ' + '.youwatch-mark yt-image img { opacity:0.3; }');
        }

        if (window.localStorage.getItem('extensions.Youwatch.Stylesheet.strGrayout') === null) {
            window.localStorage.setItem('extensions.Youwatch.Stylesheet.strGrayout', '.youwatch-mark yt-img-shadow img { filter:grayscale(1.0); }' + ' ' + '.youwatch-mark yt-image img { filter:grayscale(1.0); }');
        }

        if (window.localStorage.getItem('extensions.Youwatch.Stylesheet.strShowbadge') === null) {
            window.localStorage.setItem('extensions.Youwatch.Stylesheet.strShowbadge', '.youwatch-mark:last-child:after { background-color:#000000; border-radius:2px; color:#FFFFFF; content:"WATCHED"; font-size:11px; left:4px; opacity:0.8; padding:3px 4px 3px 4px; position:absolute; top:4px; }');
        }

        if (window.localStorage.getItem('extensions.Youwatch.Stylesheet.strShowdate') === null) {
            window.localStorage.setItem('extensions.Youwatch.Stylesheet.strShowdate', '.youwatch-mark:last-child:after { content:"WATCHED" attr(watchdate); white-space:nowrap; }');
        }

        if (window.localStorage.getItem('extensions.Youwatch.Stylesheet.strHideprogress') === null) {
            window.localStorage.setItem('extensions.Youwatch.Stylesheet.strHideprogress', 'ytd-thumbnail-overlay-resume-playback-renderer { display:none !important; }');
        }

        return funcCallback({});
    },
    'objDatabase': function(objArguments, funcCallback) {
        Database.init({}, function(objResponse) {
            if (objResponse === null) {
                funcCallback(null);

            } else if (objResponse !== null) {
                funcCallback({});

            }
        });
    },
    'objHistory': function(objArguments, funcCallback) {
        History.init({}, function(objResponse) {
            if (objResponse === null) {
                funcCallback(null);

            } else if (objResponse !== null) {
                funcCallback({});

            }
        });
    },
    'objYoutube': function(objArguments, funcCallback) {
        Youtube.init({}, function(objResponse) {
            if (objResponse === null) {
                funcCallback(null);

            } else if (objResponse !== null) {
                funcCallback({});

            }
        });
    },
    'objSearch': function(objArguments, funcCallback) {
        Search.init({}, function(objResponse) {
            if (objResponse === null) {
                funcCallback(null);

            } else if (objResponse !== null) {
                funcCallback({});

            }
        });
    },
    'objAction': function(objArguments, funcCallback) {
        chrome.browserAction.onClicked.addListener(function() {
            chrome.tabs.create({
                'url': 'content/index.html'
            });
        });

        return funcCallback({});
    },
    'objMessage': function(objArguments, funcCallback) {
        chrome.runtime.onMessage.addListener(function(objRequest, objSender, funcResponse) {
            if (objRequest.strMessage === 'youtubeLookup') {
                Youtube.lookup({
                    'strIdent': objRequest.strIdent
                }, function(objResponse) {
                    console.debug('lookup video', objRequest, objResponse);

                    funcResponse(objResponse);
                });

                return true; // indicate asynchronous response

            } else if (objRequest.strMessage === 'youtubeEnsure') {
                if (window.localStorage.getItem('extensions.Youwatch.Condition.boolYoubadge') === String(true)) {
                    Youtube.ensure({
                        'strIdent': objRequest.strIdent,
                        'strTitle': objRequest.strTitle
                    }, function(objResponse) {
                        console.debug('ensure video', objRequest, objResponse);

                        funcResponse(objResponse);
                    });

                    return true; // indicate asynchronous response
                }

            }

            funcResponse(null);
        });

        return funcCallback({});
    },
    'objTabhook': function(objArguments, funcCallback) {
        chrome.tabs.onUpdated.addListener(function(intTab, objChange, objTab) {
            if (objTab.id < 0) {
                return;

            } else if (objTab.url.indexOf('https://www.youtube.com') !== 0) {
                return;

            }

            if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolFadeout') === String(true)) {
                chrome.tabs.insertCSS(objTab.id, {
                    'code': window.localStorage.getItem('extensions.Youwatch.Stylesheet.strFadeout')
                });
            }

            if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolGrayout') === String(true)) {
                chrome.tabs.insertCSS(objTab.id, {
                    'code': window.localStorage.getItem('extensions.Youwatch.Stylesheet.strGrayout')
                });
            }

            if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true)) {
                chrome.tabs.insertCSS(objTab.id, {
                    'code': window.localStorage.getItem('extensions.Youwatch.Stylesheet.strShowbadge')
                });
            }

            if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowdate') === String(true)) {
                chrome.tabs.insertCSS(objTab.id, {
                    'code': window.localStorage.getItem('extensions.Youwatch.Stylesheet.strShowdate')
                });
            }

            if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true)) {
                chrome.tabs.insertCSS(objTab.id, {
                    'code': window.localStorage.getItem('extensions.Youwatch.Stylesheet.strHideprogress')
                });
            }

            if (window.localStorage.getItem('extensions.Youwatch.Condition.boolBrownav') === String(true)) {
                if ((objTab.url.indexOf('https://www.youtube.com/watch?v=') !== 0) && (objTab.url.indexOf('https://www.youtube.com/shorts/') !== 0)) {
                    return;

                } else if ((objChange.title === undefined) || (objChange.title === null)) {
                    return;

                }

                if (objChange.title.slice(-10) === ' - YouTube') {
                    objChange.title = objChange.title.slice(0, -10)
                }

                var strIdent = objTab.url.split('&')[0].slice(-11);
                var strTitle = objChange.title;

                Youtube.mark({
                    'strIdent': strIdent,
                    'strTitle': strTitle
                }, function(objResponse) {
                    console.debug('mark video');
                });

                chrome.tabs.query({
                    'url': '*://www.youtube.com/*'
                }, function(objTabs) {
                    for (var objTab of objTabs) {
                        funcSendmessage(objTab.id, {
                            'strMessage': 'youtubeMark',
                            'strIdent': strIdent,
                            'intTimestamp': 0,
                            'strTitle': strTitle,
                            'intCount': 0
                        });
                    }
                });
            }
        });

        return funcCallback({});
    },
    'objReqhook': function(objArguments, funcCallback) {
        if (funcBrowser() === 'firefox') {
            chrome.webRequest.onBeforeSendHeaders.addListener(function(objData) {
                var objHeaders = [];

                for (var objHeader of objData.requestHeaders) {
                    if (objHeader.name === 'Referer') {
                        continue;

                    } else if (objHeader.name === 'Origin') {
                        continue;

                    }

                    objHeaders.push(objHeader);
                }

                objHeaders.push({
                    'name': 'Referer',
                    'value': 'https://www.youtube.com/feed/history'
                });

                objHeaders.push({
                    'name': 'Origin',
                    'value': 'https://www.youtube.com'
                });

                objData.requestHeaders.splice(0);
                objData.requestHeaders.push(...objHeaders);

                return {
                    'requestHeaders': objData.requestHeaders
                };
            },{
                'urls': ['*://www.youtube.com/youtubei/v1/*']
            }, [
                'requestHeaders',
                'blocking'
            ]);

        } else if (funcBrowser() === 'chrome') {
            chrome.webRequest.onBeforeSendHeaders.addListener(function(objData) {
                var objHeaders = [];

                for (var objHeader of objData.requestHeaders) {
                    if (objHeader.name === 'Referer') {
                        continue;

                    } else if (objHeader.name === 'Origin') {
                        continue;

                    }

                    objHeaders.push(objHeader);
                }

                objHeaders.push({
                    'name': 'Referer',
                    'value': 'https://www.youtube.com/feed/history'
                });

                objHeaders.push({
                    'name': 'Origin',
                    'value': 'https://www.youtube.com'
                });

                objData.requestHeaders.splice(0);
                objData.requestHeaders.push(...objHeaders);

                return {
                    'requestHeaders': objData.requestHeaders
                };
            },{
                'urls': ['*://www.youtube.com/youtubei/v1/*']
            }, [
                'requestHeaders',
                'blocking',
                'extraHeaders'
            ]);

        }

        return funcCallback({});
    },
    'objSynchronize': function(objArguments, funcCallback) {
        chrome.alarms.create('synchronize', {
            'periodInMinutes': 60
        });

        chrome.alarms.onAlarm.addListener(function(objAlarm) {
            if (objAlarm.name === 'synchronize') {
                if (window.localStorage.getItem('extensions.Youwatch.Condition.boolBrowhist') === String(true)) {
                    History.synchronize({
                        'intTimestamp': new Date().getTime() - (7 * 24 * 60 * 60 * 1000)
                    }, function(objResponse) {
                        console.debug('synchronized history');
                    }, function(objResponse) {
                        // ...
                    });
                }

                if (window.localStorage.getItem('extensions.Youwatch.Condition.boolYouhist') === String(true)) {
                    Youtube.synchronize({
                        'intThreshold': 512
                    }, function(objResponse) {
                        console.debug('synchronized youtube');
                    }, function(objResponse) {
                        // ...
                    });
                }
            }
        });

        return funcCallback({});
    }
}, function(objArguments) {
    if (objArguments === null) {
        console.debug('error initializing commons');

    } else if (objArguments !== null) {
        console.debug('initialized commons succesfully');

    }
});
