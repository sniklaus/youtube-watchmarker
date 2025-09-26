'use strict';

importScripts('idb.js');

let funcStorageget = async function(strKey) {
    let objValue = await chrome.storage.local.get(strKey);

    if (objValue[strKey] === undefined) {
        return null;
    }

    return String(objValue[strKey]);
};

let funcStorageset = async function(strKey, objValue) {
     await chrome.storage.local.set({ [strKey]: String(objValue) });
};

let funcCookie = async function(strCookie) {
    let objCookie = await chrome.cookies.get({
        'url': 'https://www.youtube.com',
        'name': strCookie
    });

    if (objCookie === null) {
        return null;
    }

    return objCookie.value;
};

let funcYoufetch = async function(strLink, objPayload, objContext, strClicktrack) {
    let intTime = Math.round(new Date().getTime() / 1000.0);
    let strCookie = await funcCookie('SAPISID') || await funcCookie('__Secure-3PAPISID');
    let strOrigin = 'https://www.youtube.com';
    let strHash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(intTime + ' ' + strCookie + ' ' + strOrigin)); // https://stackoverflow.com/a/32065323
    let strAuth = 'SAPISIDHASH ' + intTime + '_' + Array.from(new Uint8Array(strHash)).map(function(intByte) { return intByte.toString(16).padStart(2, '0'); }).join('');

    objContext['client']['acceptHeader'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    objContext['client']['screenWidthPoints'] = 1629;
    objContext['client']['screenHeightPoints'] = 1312;
    objContext['client']['screenPixelDensity'] = 1;
    objContext['client']['screenDensityFloat'] = 1;
    objContext['client']['utcOffsetMinutes'] = -420;
    objContext['client']['userInterfaceTheme'] = 'USER_INTERFACE_THEME_LIGHT';
    objContext['client']['mainAppWebInfo'] = {
        'graftUrl': 'https://www.youtube.com/feed/history',
        'pwaInstallabilityStatus': 'PWA_INSTALLABILITY_STATUS_UNKNOWN',
        'webDisplayMode': 'WEB_DISPLAY_MODE_BROWSER',
        'isWebNativeShareAvailable': false
    };

    objContext['request']['internalExperimentFlags'] = [];
    objContext['request']['consistencyTokenJars'] = [];

    return await fetch(strLink, {
        'method': 'POST',
        'credentials': 'include',
        'headers': {
            'Authorization': strAuth,
            'Content-Type': 'application/json',
            'X-Origin': 'https://www.youtube.com',
            'X-Goog-AuthUser': '0',
            'X-Goog-Visitor-Id': objContext['client']['visitorData'],
            'X-Youtube-Bootstrap-Logged-In': true,
            'X-Youtube-Client-Name': 1,
            'X-Youtube-Client-Version': objContext['client']['clientVersion']
        },
        'body': JSON.stringify({
            'context': {
                'client': objContext['client'],
                'user': {
                    'lockedSafetyMode': false
                },
                'request': objContext['request'],
                'clickTracking': {
                    'clickTrackingParams': strClicktrack
                },
                'adSignalsInfo': {
                    'params': [{
                        'key': 'dt',
                        'value': String(new Date().getTime())
                    }, {
                        'key': 'flash',
                        'value': '0'
                    }, {
                        'key': 'frm',
                        'value': '0'
                    }, {
                        'key': 'u_tz',
                        'value': '-420'
                    }, {
                        'key': 'u_his',
                        'value': '3'
                    }, {
                        'key': 'u_h',
                        'value': '2160'
                    }, {
                        'key': 'u_w',
                        'value': '3840'
                    }, {
                        'key': 'u_ah',
                        'value': '2112'
                    }, {
                        'key': 'u_aw',
                        'value': '3840'
                    }, {
                        'key': 'u_cd',
                        'value': '24'
                    }, {
                        'key': 'bc',
                        'value': '31'
                    }, {
                        'key': 'bih',
                        'value': '1312'
                    }, {
                        'key': 'biw',
                        'value': '1629'
                    }, {
                        'key': 'brdim',
                        'value': '-20,-20,-20,-20,3840,0,1960,2152,1629,1312'
                    }, {
                        'key': 'vis',
                        'value': '1'
                    }, {
                        'key': 'wgl',
                        'value': 'true'
                    }, {
                        'key': 'ca_type',
                        'value': 'image'
                    }]
                }
            },
            ...objPayload
        })
    });
};

let funcHackyparse = function(strJson) {
    let intLength = 1;

    for (let intCount = 0; intLength < strJson.length; intLength += 1) {
        if (strJson[intLength - 1] === '{') {
            intCount += 1;

        } else if (strJson[intLength - 1] === '}') {
            intCount -= 1;

        }

        if (intCount === 0) {
            break;
        }
    }

    try {
        return JSON.parse(strJson.substr(0, intLength));
    } catch (objError) {
        // ...
    }

    return null;
};

let funcSendmessage = function(intTab, objMessage, intRetry) {
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

// ##########################################################

let Database = {
    objDatabase: null,

    init: async function() {
        Database.objDatabase = await idb.openDB('Database', 401, {
            'upgrade': function(objDatabase, intVerold, intVernew, objTransaction, objEvent) {
                let objStore = null;

                if (objDatabase.objectStoreNames.contains('storeDatabase') === true) {
                    objStore = objTransaction.objectStore('storeDatabase');

                } else if (objDatabase.objectStoreNames.contains('storeDatabase') === false) {
                    objStore = objDatabase.createObjectStore('storeDatabase', {
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
            }
        });

        chrome.runtime.onConnect.addListener(function(objPort) {
            if (objPort.name === 'database') {
                objPort.onMessage.addListener(async function(objData) {
                    if (objData.strMessage === 'databaseExport') {
                        objPort.postMessage({
                            'strMessage': 'databaseExport',
                            'objResponse': await Database.export(objData.objRequest, function(objResponse) {
                                objPort.postMessage({
                                    'strMessage': 'databaseExport-progress',
                                    'objResponse': objResponse
                                });
                            })
                        });

                    } else if (objData.strMessage === 'databaseImport') {
                        objPort.postMessage({
                            'strMessage': 'databaseImport',
                            'objResponse': await Database.import(objData.objRequest, function(objResponse) {
                                objPort.postMessage({
                                    'strMessage': 'databaseImport-progress',
                                    'objResponse': objResponse
                                });
                            })
                        });
                        ;

                    } else if (objData.strMessage === 'databaseReset') {
                        objPort.postMessage({
                            'strMessage': 'databaseReset',
                            'objResponse': await Database.reset(objData.objRequest)
                        });

                    }
                });
            }
        });
    },

    export: async function(objRequest, funcProgress) {
        let objVideos = [];
        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readonly').objectStore('storeDatabase');
        let objCursor = await objDatabase.openCursor();

        while (objCursor) {
            objVideos.push({
                'strIdent': objCursor.value.strIdent,
                'intTimestamp': objCursor.value.intTimestamp,
                'strTitle': objCursor.value.strTitle,
                'intCount': objCursor.value.intCount
            });

            funcProgress({
                'strProgress': 'collected ' + objVideos.length + ' videos'
            });

            objCursor = await objCursor.continue();
        }

        return {
            'objVideos': objVideos
        };
    },

    import: async function(objRequest, funcProgress) {
        let intNew = 0;
        let intExisting = 0;

        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase');

        for (let objVideo of objRequest.objVideos) {
            let strIdent = objVideo.strIdent;
            let intTimestamp = objVideo.intTimestamp;
            let strTitle = objVideo.strTitle;
            let intCount = objVideo.intCount;

            let objGet = await objDatabase.index('strIdent').get(strIdent);

            if ((objGet === undefined) || (objGet === null)) {
                intNew += 1;

                intTimestamp = intTimestamp || new Date().getTime();
                strTitle = strTitle || '';
                intCount = intCount || 1;

                if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                    continue;
                }

                await objDatabase.put({
                    'strIdent': strIdent,
                    'intTimestamp': intTimestamp,
                    'strTitle': strTitle,
                    'intCount': intCount
                });

            } else if ((objGet !== undefined) && (objGet !== null)) {
                intExisting += 1;

                intTimestamp = Math.max(objGet.intTimestamp, intTimestamp) || new Date().getTime();
                strTitle = objGet.strTitle || strTitle || '';
                intCount = Math.max(objGet.intCount, intCount) || 1;

                if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                    continue;
                }

                await objDatabase.put({
                    'strIdent': strIdent,
                    'intTimestamp': intTimestamp,
                    'strTitle': strTitle,
                    'intCount': intCount
                });

            }

            funcProgress({
                'strProgress': 'imported ' + (intNew + intExisting) + ' videos - ' + intNew + ' were new'
            });

        }

        await funcStorageset('extensions.Youwatch.Database.intSize', await objDatabase.count());

        return {};
    },

    reset: async function(objRequest) {
        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase');

        await objDatabase.clear();

        await funcStorageset('extensions.Youwatch.Database.intSize', await objDatabase.count());

        return {};
    }
};

let History = {
    init: function() {
        chrome.runtime.onConnect.addListener(function(objPort) {
            if (objPort.name === 'history') {
                objPort.onMessage.addListener(async function(objData) {
                    if (objData.strMessage === 'historySynchronize') {
                        objPort.postMessage({
                            'strMessage': 'historySynchronize',
                            'objResponse': await History.synchronize(objData.objRequest, function(objResponse) {
                                objPort.postMessage({
                                    'strMessage': 'historySynchronize-progress',
                                    'objResponse': objResponse
                                });
                            })
                        });
                    }
                });
            }
        });
    },

    synchronize: async function(objRequest, funcProgress) {
        let intNew = 0;
        let intExisting = 0;

        let objHistory = await chrome.history.search({
            'text': 'youtube.com',
            'startTime': objRequest.intTimestamp,
            'maxResults': 1000000
        });

        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase');

        for (let objEntry of objHistory) {
            if ((objEntry.url.indexOf('https://www.youtube.com/watch?v=') !== 0) && (objEntry.url.indexOf('https://www.youtube.com/shorts/') !== 0) && (objEntry.url.indexOf('https://m.youtube.com/watch?v=') !== 0)) {
                continue;

            } else if ((objEntry.title === undefined) || (objEntry.title === null)) {
                continue;

            }

            let strIdent = objEntry.url.split('&')[0].slice(-11);
            let intTimestamp = objEntry.lastVisitTime;
            let strTitle = objEntry.title;
            let intCount = objEntry.visitCount;

            if (strTitle.slice(-10) === ' - YouTube') {
                strTitle = strTitle.slice(0, -10);
            }

            let objGet = await objDatabase.index('strIdent').get(strIdent);

            if ((objGet === undefined) || (objGet === null)) {
                intNew += 1;

                intTimestamp = intTimestamp || new Date().getTime();
                strTitle = strTitle || '';
                intCount = intCount || 1;

                if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                    continue;
                }

                await objDatabase.put({
                    'strIdent': strIdent,
                    'intTimestamp': intTimestamp,
                    'strTitle': strTitle,
                    'intCount': intCount
                });

            } else if ((objGet !== undefined) && (objGet !== null)) {
                intExisting += 1;

                intTimestamp = Math.max(objGet.intTimestamp, intTimestamp) || new Date().getTime();
                strTitle = objGet.strTitle || strTitle || '';
                intCount = Math.max(objGet.intCount, intCount) || 1;

                if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                    continue;
                }

                await objDatabase.put({
                    'strIdent': strIdent,
                    'intTimestamp': intTimestamp,
                    'strTitle': strTitle,
                    'intCount': intCount
                });

            }

            funcProgress({
                'strProgress': 'imported ' + (intNew + intExisting) + ' videos - ' + intNew + ' were new'
            });
        }

        await funcStorageset('extensions.Youwatch.Database.intSize', await objDatabase.count());
        await funcStorageset('extensions.Youwatch.History.intTimestamp', new Date().getTime());

        return {};
    }
};

let Youtube = {
    strTitlecache: {},

    init: function() {
        chrome.runtime.onConnect.addListener(function(objPort) {
            if (objPort.name === 'youtube') {
                objPort.onMessage.addListener(async function(objData) {
                    if (objData.strMessage === 'youtubeSynchronize') {
                        objPort.postMessage({
                            'strMessage': 'youtubeSynchronize',
                            'objResponse': await Youtube.synchronize(objData.objRequest, function(objResponse) {
                                objPort.postMessage({
                                    'strMessage': 'youtubeSynchronize-progress',
                                    'objResponse': objResponse
                                });
                            })
                        });

                    } else if (objData.strMessage === 'youtubeLookup') {
                        objPort.postMessage({
                            'strMessage': 'youtubeLookup',
                            'objResponse': await Youtube.lookup(objData.objRequest)
                        });

                    } else if (objData.strMessage === 'youtubeMark') {
                        objPort.postMessage({
                            'strMessage': 'youtubeMark',
                            'objResponse': await Youtube.mark(objData.objRequest)
                        });

                    }
                });
            }
        });
    },

    synchronize: async function(objRequest, funcProgress) {
        let intNew = 0;
        let intExisting = 0;

        let objContext = null;
        let strClicktrack = null;
        let strContinuation = null;

        while (true) {
            let objFetch = null;

            if ((objContext === null) || (strClicktrack === null) || (strContinuation === null)) {
                objFetch = await fetch('https://www.youtube.com/feed/history', {
                    'method': 'GET',
                    'credentials': 'include'
                });

            } else if ((objContext !== null) && (strClicktrack !== null) && (strContinuation !== null)) {
                objFetch = await funcYoufetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', { 'continuation': strContinuation }, objContext, strClicktrack);

                strContinuation = null;

            }

            let strText = await objFetch.text();

            if (objContext === null) {
                objContext = funcHackyparse(strText.split('"INNERTUBE_CONTEXT":')[1]);
            }

            let strRegex = null;
            let objClicktrack = new RegExp('"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"', 'g');
            let objContinuation = new RegExp('"continuationCommand":[^"]*"token":[^"]*"([^"]*)"', 'g');
            let objVideo = new RegExp('"videoRenderer":[^"]*"videoId":[^"]*"([^"]{11})".*?"text"[^"]*"([^"]*)"', 'g');
            let strUnescaped = strText.split('\\"').join('\\u0022').split('\r').join('').split('\n').join('');

            if ((strRegex = objClicktrack.exec(strUnescaped)) !== null) {
                strClicktrack = strRegex[1];
            }

            if ((strRegex = objContinuation.exec(strUnescaped)) !== null) {
                strContinuation = strRegex[1];
            }

            let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase');

            while ((strRegex = objVideo.exec(strUnescaped)) !== null) {
                let strIdent = strRegex[1];
                let intTimestamp = null;
                let strTitle = strRegex[2];
                let intCount = null;

                strTitle = strTitle.split('\\u0022').join('"');
                strTitle = strTitle.split('\\u0026').join('&');
                strTitle = strTitle.split('\\u003C').join('<');
                strTitle = strTitle.split('\\u003C').join('=');
                strTitle = strTitle.split('\\u003E').join('>');
                strTitle = strTitle.split('\\u003E').join('>');

                let objGet = await objDatabase.index('strIdent').get(strIdent);

                if ((objGet === undefined) || (objGet === null)) {
                    intNew += 1;

                    intTimestamp = intTimestamp || new Date().getTime();
                    strTitle = strTitle || '';
                    intCount = intCount || 1;

                    if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                        continue;
                    }

                    await objDatabase.put({
                        'strIdent': strIdent,
                        'intTimestamp': intTimestamp,
                        'strTitle': strTitle,
                        'intCount': intCount
                    });

                } else if ((objGet !== undefined) && (objGet !== null)) {
                    intExisting += 1;

                    intTimestamp = objGet.intTimestamp || intTimestamp || new Date().getTime();
                    strTitle = objGet.strTitle || strTitle || '';
                    intCount = objGet.intCount || intCount || 1;

                    if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                        continue;
                    }

                    await objDatabase.put({
                        'strIdent': strIdent,
                        'intTimestamp': intTimestamp,
                        'strTitle': strTitle,
                        'intCount': intCount
                    });

                }

                funcProgress({
                    'strProgress': 'imported ' + (intNew + intExisting) + ' videos - ' + intNew + ' were new'
                });
            }

            await funcStorageset('extensions.Youwatch.Database.intSize', await objDatabase.count());
            await funcStorageset('extensions.Youwatch.Youtube.intTimestamp', new Date().getTime());

            if (intExisting > objRequest.intThreshold) {
                break;

            } else if (strContinuation === null) {
                break;

            }
        }

        return {};
    },

    lookup: async function(objRequest) {
        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readonly').objectStore('storeDatabase');

        let objGet = await objDatabase.index('strIdent').get(objRequest.strIdent);

        if ((objGet === undefined) || (objGet === null)) {
            return null;
        }

        return {
            'strIdent': objGet.strIdent,
            'intTimestamp': objGet.intTimestamp || new Date().getTime(),
            'strTitle': objGet.strTitle || '',
            'intCount': objGet.intCount || 1
        };
    },

    mark: async function(objRequest) {
        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase');

        let strIdent = objRequest.strIdent;
        let intTimestamp = objRequest.intTimestamp;
        let strTitle = objRequest.strTitle;
        let intCount = objRequest.intCount;

        let objGet = await objDatabase.index('strIdent').get(strIdent);

        if ((objGet !== undefined) && (objGet !== null) && (objRequest.boolEnsure === true)) {
            return null;
        }

        if ((objGet === undefined) || (objGet === null)) {
            intTimestamp = intTimestamp || new Date().getTime();
            strTitle = strTitle || '';
            intCount = intCount || 1;

            if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                return {
                    'strIdent': strIdent,
                    'intTimestamp': intTimestamp,
                    'strTitle': strTitle,
                    'intCount': intCount
                };
            }

            await objDatabase.put({
                'strIdent': strIdent,
                'intTimestamp': intTimestamp,
                'strTitle': strTitle,
                'intCount': intCount
            });

        } else if ((objGet !== undefined) && (objGet !== null)) {
            intTimestamp = objGet.intTimestamp || intTimestamp || new Date().getTime();
            strTitle = objGet.strTitle || strTitle || '';
            intCount = objGet.intCount || intCount || 1;

            if ((strIdent.trim() === '') || (strTitle.trim() === '')) {
                return {
                    'strIdent': strIdent,
                    'intTimestamp': intTimestamp,
                    'strTitle': strTitle,
                    'intCount': intCount
                };
            }

            await objDatabase.put({
                'strIdent': strIdent,
                'intTimestamp': intTimestamp,
                'strTitle': strTitle,
                'intCount': intCount
            });

        }

        await funcStorageset('extensions.Youwatch.Database.intSize', await objDatabase.count());

        return {
            'strIdent': strIdent,
            'intTimestamp': intTimestamp,
            'strTitle': strTitle,
            'intCount': intCount
        };
    }
};

let Search = {
    init: function() {
        chrome.runtime.onConnect.addListener(function(objPort) {
            if (objPort.name === 'search') {
                objPort.onMessage.addListener(async function(objData) {
                    if (objData.strMessage === 'searchLookup') {
                        objPort.postMessage({
                            'strMessage': 'searchLookup',
                            'objResponse': await Search.lookup(objData.objRequest)
                        });

                    } else if (objData.strMessage === 'searchDelete') {
                        objPort.postMessage({
                            'strMessage': 'searchDelete',
                            'objResponse': await Search.delete(objData.objRequest, function(objResponse) {
                                objPort.postMessage({
                                    'strMessage': 'searchDelete-progress',
                                    'objResponse': objResponse
                                });
                            })
                        });

                    }
                });
            }
        });
    },

    lookup: async function(objRequest) {
        let objVideos = [];
        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readonly').objectStore('storeDatabase');
        let objCursor = await objDatabase.index('intTimestamp').openCursor(null, 'prev');

        while (objCursor) {
            if (objVideos.length === objRequest.intLength) {
                break;
            }

            if ((objCursor.value.strIdent.toLowerCase().indexOf(objRequest.strQuery.toLowerCase()) !== -1) || (objCursor.value.strTitle.toLowerCase().indexOf(objRequest.strQuery.toLowerCase()) !== -1)) {
                if (objRequest.intSkip!== 0) {
                    objRequest.intSkip -= 1;

                } else if (objRequest.intSkip === 0) {
                    objVideos.push({
                        'strIdent': objCursor.value.strIdent,
                        'intTimestamp': objCursor.value.intTimestamp,
                        'strTitle': objCursor.value.strTitle,
                        'intCount': objCursor.value.intCount
                    });

                }
            }

            objCursor = await objCursor.continue();
        }

        return {
            'objVideos': objVideos
        };
    },

    delete: async function(objRequest, funcProgress) {
        let objDatabase = Database.objDatabase.transaction(['storeDatabase'], 'readwrite').objectStore('storeDatabase');

        funcProgress({
            'strProgress': '1/4 - deleting it from the database'
        });

        await objDatabase.delete(objRequest.strIdent);

        await funcStorageset('extensions.Youwatch.Database.intSize', await objDatabase.count());

        funcProgress({
            'strProgress': '2/4 - deleting it from the history in the browser'
        });

        let objHistory = await chrome.history.search({
            'text': objRequest.strIdent,
            'startTime': 0,
            'maxResults': 1000000
        });

        for (let objEntry of objHistory) {
            if ((objEntry.url.indexOf('https://www.youtube.com/watch?v=') !== 0) && (objEntry.url.indexOf('https://www.youtube.com/shorts/') !== 0) && (objEntry.url.indexOf('https://m.youtube.com/watch?v=') !== 0)) {
                continue;

            } else if ((objEntry.title === undefined) || (objEntry.title === null)) {
                continue;

            }

            chrome.history.deleteUrl({
                'url': objEntry.url
            });
        }

        funcProgress({
            'strProgress': '3/4 - locating it in the history on youtube'
        });

        let objLookup = null; // only deleting the first occurrence since going through the entire history would take too much time

        let objContext = null;
        let strClicktrack = null;
        let strContinuation = null;

        try {
            for (let intFetch = 0; intFetch < 16; intFetch += 1) {
                let objFetch = null;

                if ((objContext === null) || (strClicktrack === null) || (strContinuation === null)) {
                    objFetch = await fetch('https://www.youtube.com/feed/history', {
                        'method': 'GET',
                        'credentials': 'include'
                    });

                } else if ((objContext !== null) && (strClicktrack !== null) && (strContinuation !== null)) {
                    objFetch = await funcYoufetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', { 'continuation': strContinuation }, objContext, strClicktrack);

                    strContinuation = null;

                }

                let strText = await objFetch.text();

                if (objContext === null) {
                    objContext = funcHackyparse(strText.split('"INNERTUBE_CONTEXT":')[1]);
                }

                let strRegex = null;
                let objClicktrack = new RegExp('"continuationEndpoint":[^"]*"clickTrackingParams":[^"]*"([^"]*)"', 'g');
                let objContinuation = new RegExp('"continuationCommand":[^"]*"token":[^"]*"([^"]*)"', 'g');
                let objVideo = new RegExp('"videoRenderer":[^"]*"videoId":[^"]*"([^"]{11})".*?"topLevelButtons".*?"clickTrackingParams"[^"]*"([^"]*)".*?"feedbackToken"[^"]*"([^"]*)"', 'g');
                let strUnescaped = strText.split('\\"').join('\\u0022').split('\r').join('').split('\n').join('');

                if ((strRegex = objClicktrack.exec(strUnescaped)) !== null) {
                    strClicktrack = strRegex[1];
                }

                if ((strRegex = objContinuation.exec(strUnescaped)) !== null) {
                    strContinuation = strRegex[1];
                }

                while ((strRegex = objVideo.exec(strUnescaped)) !== null) {
                    let strIdent = strRegex[1];
                    let strClicktrack = strRegex[2];
                    let strFeedback = strRegex[3];

                    if (strIdent !== objRequest.strIdent) {
                        continue;
                    }

                    objLookup = {
                        'strIdent': strIdent,
                        'strClicktrack': strClicktrack,
                        'strFeedback': strFeedback
                    };
                }
            }
        } catch (objError) {
            // ...
        }

        if (objLookup === null) {
            funcProgress({
                'strProgress': '4/4 - did not find it in the history on youtube'
            });

        } else if (objLookup !== null) {
            funcProgress({
                'strProgress': '4/4 - deleting it from the history on youtube'
            });

            let intTime = Math.round(new Date().getTime() / 1000.0);
            let strCookie = await funcCookie('SAPISID') || await funcCookie('__Secure-3PAPISID');
            let strOrigin = 'https://www.youtube.com';
            let strHash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(intTime + ' ' + strCookie + ' ' + strOrigin)); // https://stackoverflow.com/a/32065323
            let strAuth = 'SAPISIDHASH ' + intTime + '_' + Array.from(new Uint8Array(strHash)).map(function(intByte) { return intByte.toString(16).padStart(2, '0'); }).join('');

            objContext['client']['acceptHeader'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            objContext['client']['screenWidthPoints'] = 1629;
            objContext['client']['screenHeightPoints'] = 1312;
            objContext['client']['screenPixelDensity'] = 1;
            objContext['client']['screenDensityFloat'] = 1;
            objContext['client']['utcOffsetMinutes'] = -420;
            objContext['client']['userInterfaceTheme'] = 'USER_INTERFACE_THEME_LIGHT';

            objContext['request']['internalExperimentFlags'] = [];
            objContext['request']['consistencyTokenJars'] = [];

            await funcYoufetch('https://www.youtube.com/youtubei/v1/feedback', { 'feedbackTokens': [objLookup.strFeedback], 'isFeedbackTokenUnencrypted': false, 'shouldMerge': false }, objContext, strClicktrack);

        }

        return {};
    }
};

// ##########################################################

(async function() {
    if (await funcStorageget('extensions.Youwatch.Database.intSize') === null) {
        await funcStorageset('extensions.Youwatch.Database.intSize', 0);
    }

    if (await funcStorageget('extensions.Youwatch.History.intTimestamp') === null) {
        await funcStorageset('extensions.Youwatch.History.intTimestamp', 0);
    }

    if (await funcStorageget('extensions.Youwatch.Youtube.intTimestamp') === null) {
        await funcStorageset('extensions.Youwatch.Youtube.intTimestamp', 0);
    }

    if (await funcStorageget('extensions.Youwatch.Condition.boolBrownav') === null) {
        await funcStorageset('extensions.Youwatch.Condition.boolBrownav', true);
    }

    if (await funcStorageget('extensions.Youwatch.Condition.boolBrowhist') === null) {
        await funcStorageset('extensions.Youwatch.Condition.boolBrowhist', true);
    }

    if (await funcStorageget('extensions.Youwatch.Condition.boolYoubadge') === null) {
        await funcStorageset('extensions.Youwatch.Condition.boolYoubadge', true);
    }

    if (await funcStorageget('extensions.Youwatch.Condition.boolYouhist') === null) {
        await funcStorageset('extensions.Youwatch.Condition.boolYouhist', true);
    }

    if (await funcStorageget('extensions.Youwatch.Visualization.boolFadeout') === null) {
        await funcStorageset('extensions.Youwatch.Visualization.boolFadeout', true);
    }

    if (await funcStorageget('extensions.Youwatch.Visualization.boolGrayout') === null) {
        await funcStorageset('extensions.Youwatch.Visualization.boolGrayout', true);
    }

    if (await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === null) {
        await funcStorageset('extensions.Youwatch.Visualization.boolShowbadge', true);
    }

    if (await funcStorageget('extensions.Youwatch.Visualization.boolShowdate') === null) {
        await funcStorageset('extensions.Youwatch.Visualization.boolShowdate', true);
    }

    if (await funcStorageget('extensions.Youwatch.Visualization.boolHideprogress') === null) {
        await funcStorageset('extensions.Youwatch.Visualization.boolHideprogress', true);
    }

    if ((await funcStorageget('extensions.Youwatch.Stylesheet.strFadeout') === null) || ((await funcStorageget('extensions.Youwatch.Stylesheet.strFadeout')).indexOf('do not modify') === -1)) {
        await funcStorageset('extensions.Youwatch.Stylesheet.strFadeout', '.youwatch-mark img.ytCoreImageHost, .youwatch-mark .ytp-videowall-still-image { opacity:0.3; }');
    }

    if ((await funcStorageget('extensions.Youwatch.Stylesheet.strGrayout') === null) || ((await funcStorageget('extensions.Youwatch.Stylesheet.strGrayout')).indexOf('do not modify') === -1)) {
        await funcStorageset('extensions.Youwatch.Stylesheet.strGrayout', '.youwatch-mark img.ytCoreImageHost, .youwatch-mark .ytp-videowall-still-image { filter:grayscale(1.0); }');
    }

    if ((await funcStorageget('extensions.Youwatch.Stylesheet.strShowbadge') === null) || ((await funcStorageget('extensions.Youwatch.Stylesheet.strShowbadge')).indexOf('do not modify') === -1)) {
        await funcStorageset('extensions.Youwatch.Stylesheet.strShowbadge', '.youwatch-mark::after { background-color:#000000; border-radius:2px; color:#FFFFFF; content:"WATCHED"; font-size:11px; left:4px; opacity:0.8; padding:3px 4px 3px 4px; position:absolute; top:4px; }');
    }

    if ((await funcStorageget('extensions.Youwatch.Stylesheet.strShowdate') === null) || ((await funcStorageget('extensions.Youwatch.Stylesheet.strShowdate')).indexOf('do not modify') === -1)) {
        await funcStorageset('extensions.Youwatch.Stylesheet.strShowdate', '.youwatch-mark::after { content:"WATCHED" attr(watchdate); white-space:nowrap; }');
    }

    if ((await funcStorageget('extensions.Youwatch.Stylesheet.strHideprogress') === null) || ((await funcStorageget('extensions.Youwatch.Stylesheet.strHideprogress')).indexOf('do not modify') === -1)) {
        await funcStorageset('extensions.Youwatch.Stylesheet.strHideprogress', 'yt-thumbnail-bottom-overlay-view-model, ytd-thumbnail-overlay-resume-playback-renderer { display:none !important; }');
    }

    await Database.init();
    await History.init();
    await Youtube.init();
    await Search.init();

    chrome.action.onClicked.addListener(function() {
        chrome.tabs.create({
            'url': 'content/index.html'
        });
    });

    chrome.runtime.onMessage.addListener(function(objRequest, objSender, funcResponse) {
        if (objRequest.strMessage === 'youtubeLookup') {
            if (objRequest.strTitle !== '') {
                Youtube.strTitlecache[objRequest.strIdent] = objRequest.strTitle;
            }

            Youtube.lookup({
                'strIdent': objRequest.strIdent,
                'strTitle': objRequest.strTitle
            }).then(funcResponse);

            return true; // indicate async response, i also tried using an async function with await but could not make it work

        } else if (objRequest.strMessage === 'youtubeMark') {
            if (objRequest.strTitle !== '') {
                Youtube.strTitlecache[objRequest.strIdent] = objRequest.strTitle;
            }

            Youtube.mark({
                'strIdent': objRequest.strIdent,
                'strTitle': objRequest.strTitle,
                'boolEnsure': objRequest.boolEnsure
            }).then(funcResponse);

            return true; // indicate async response, i also tried using an async function with await but could not make it work

        } else if (objRequest.strMessage === 'youtubeProgress') {
            if (objRequest.strTitle !== '') {
                Youtube.strTitlecache[objRequest.strIdent] = objRequest.strTitle;
            }

            funcStorageget('extensions.Youwatch.Condition.boolYoubadge')
                .then(function(strValue) {
                    if (strValue === String(true)) {
                        Youtube.mark({
                            'strIdent': objRequest.strIdent,
                            'strTitle': objRequest.strTitle,
                            'boolEnsure': objRequest.boolEnsure
                        }).then(funcResponse);
                    }
                })
            ;

            return true; // indicate async response, i also tried using an async function with await but could not make it work

        }
    });

    chrome.history.onVisited.addListener(async function(objEntry) {
        if ((objEntry.url.indexOf('https://www.youtube.com/watch?v=') !== 0) && (objEntry.url.indexOf('https://www.youtube.com/shorts/') !== 0) && (objEntry.url.indexOf('https://m.youtube.com/watch?v=') !== 0)) {
            return;

        } else if ((objEntry.title === undefined) || (objEntry.title === null)) {
            return;

        }

        if (await funcStorageget('extensions.Youwatch.Condition.boolBrownav') === String(true)) {
            let strIdent = objEntry.url.split('&')[0].slice(-11);
            let strTitle = objEntry.title;

            if (strTitle.slice(-10) === ' - YouTube') {
                strTitle = strTitle.slice(0, -10);
            }

            await Youtube.mark({
                'strIdent': strIdent,
                'strTitle': strTitle
            });

            chrome.tabs.query({
                'url': '*://*.youtube.com/*'
            }, function(objTabs) {
                for (let objTab of objTabs) {
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

    chrome.tabs.onUpdated.addListener(async function(intTab, objChange, objTab) {
        if (objTab.id < 0) {
            return;

        } else if ((objTab.url.indexOf('https://www.youtube.com') !== 0) && (objTab.url.indexOf('https://m.youtube.com') !== 0)) {
            return;

        }

        if (await funcStorageget('extensions.Youwatch.Visualization.boolFadeout') === String(true)) {
            chrome.scripting.insertCSS({
                target: { tabId: objTab.id },
                css: await funcStorageget('extensions.Youwatch.Stylesheet.strFadeout')
            });
        }

        if (await funcStorageget('extensions.Youwatch.Visualization.boolGrayout') === String(true)) {
            chrome.scripting.insertCSS({
                target: { tabId: objTab.id },
                css: await funcStorageget('extensions.Youwatch.Stylesheet.strGrayout')
            });
        }

        if (await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === String(true)) {
            chrome.scripting.insertCSS({
                target: { tabId: objTab.id },
                css: await funcStorageget('extensions.Youwatch.Stylesheet.strShowbadge')
            });
        }

        if ((await funcStorageget('extensions.Youwatch.Visualization.boolShowbadge') === String(true)) && (await funcStorageget('extensions.Youwatch.Visualization.boolShowdate') === String(true))) {
            chrome.scripting.insertCSS({
                target: { tabId: objTab.id },
                css: await funcStorageget('extensions.Youwatch.Stylesheet.strShowdate')
            });
        }

        if (await funcStorageget('extensions.Youwatch.Visualization.boolHideprogress') === String(true)) {
            chrome.scripting.insertCSS({
                target: { tabId: objTab.id },
                css: await funcStorageget('extensions.Youwatch.Stylesheet.strHideprogress')
            });
        }
    });

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [{
            id: 1,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [{
                    header: 'Origin',
                    operation: 'set',
                    value: 'https://www.youtube.com'
                }, {
                    header: 'Referer',
                    operation: 'set',
                    value: 'https://www.youtube.com/feed/history'
                }, {
                    header: 'Sec-Fetch-Mode',
                    operation: 'set',
                    value: 'same-origin'
                }]
            },
            condition: {
                urlFilter: '|https://www.youtube.com/youtubei/v1/*',
                resourceTypes: ['xmlhttprequest']
            }
        }],
    });

    chrome.alarms.create('synchronize', {
        'periodInMinutes': 60
    });

    chrome.alarms.onAlarm.addListener(async function(objAlarm) {
        if (objAlarm.name === 'synchronize') {
            if (await funcStorageget('extensions.Youwatch.Condition.boolBrowhist') === String(true)) {
                await History.synchronize({
                    'intTimestamp': new Date().getTime() - (7 * 24 * 60 * 60 * 1000)
                }, function(objResponse) {
                    // ...
                });

                console.debug('synchronized history');
            }

            if (await funcStorageget('extensions.Youwatch.Condition.boolYouhist') === String(true)) {
                await Youtube.synchronize({
                    'intThreshold': 512
                }, function(objResponse) {
                    // ...
                });

                console.debug('synchronized youtube');
            }
        }
    });
})();
