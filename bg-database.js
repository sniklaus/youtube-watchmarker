import {
  Node,
  createResponseCallback,
  setStorageSync,
  bgObject,
} from "./utils.js";

export const Database = {
  objDatabase: null,

  init: function (objRequest, funcResponse) {
    console.log("Database.init called");
    Node.series(
      {
        objOpen: function (objArgs, funcCallback) {
          let objOpen = window.indexedDB.open("Database", 401);

          objOpen.onupgradeneeded = function () {
            let objStore = null;

            if (
              objOpen.result.objectStoreNames.contains("storeDatabase") === true
            ) {
              objStore = objOpen.transaction.objectStore("storeDatabase");
            } else if (
              objOpen.result.objectStoreNames.contains("storeDatabase") ===
              false
            ) {
              objStore = objOpen.result.createObjectStore("storeDatabase", {
                keyPath: "strIdent",
              });
            }

            if (objStore.indexNames.contains("strIdent") === false) {
              objStore.createIndex("strIdent", "strIdent", {
                unique: true,
              });
            }

            if (objStore.indexNames.contains("intTimestamp") === false) {
              objStore.createIndex("intTimestamp", "intTimestamp", {
                unique: false,
              });
            }

            if (objStore.indexNames.contains("longTimestamp") === true) {
              objStore.deleteIndex("longTimestamp"); // legacy
            }
          };

          objOpen.onerror = function () {
            Database.objDatabase = null;

            return funcCallback(null);
          };

          objOpen.onsuccess = function () {
            Database.objDatabase = objOpen.result;

            return funcCallback({});
          };
        },
        objLegacy: function (objArgs, funcCallback) {
          let objStore = Database.objDatabase
            .transaction(["storeDatabase"], "readwrite")
            .objectStore("storeDatabase");

          let objQuery = objStore.openCursor();

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback({});
            }

            if (objQuery.result.value.intTimestamp === undefined) {
              objStore.put({
                strIdent: objQuery.result.value.strIdent,
                intTimestamp: objQuery.result.value.longTimestamp,
                strTitle: objQuery.result.value.strTitle,
                intCount: objQuery.result.value.intCount,
              });
            }

            objQuery.result.continue();
          };
        },
        objMessaging: bgObject.messaging('database', {
          'databaseExport': Database.export,
          'databaseImport': Database.import,
          'databaseReset': Database.reset
        }),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  export: function (objRequest, funcResponse, funcProgress) {
    Node.series(
      {
        objDatabase: bgObject.database(),
        objGet: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase.openCursor();

          objQuery.results = [];

          objQuery.onsuccess = function () {
            if (objQuery.result === undefined || objQuery.result === null) {
              return funcCallback(objQuery.results);
            }

            funcProgress({
              strProgress: "collected " + objQuery.results.length + " videos",
            });

            objQuery.results.push({
              strIdent: objQuery.result.value.strIdent,
              intTimestamp: objQuery.result.value.intTimestamp,
              strTitle: objQuery.result.value.strTitle,
              intCount: objQuery.result.value.intCount,
            });

            objQuery.result.continue();
          };
        },
        objDownload: function (objArgs, funcCallback) {
          chrome.downloads.download({
            url: URL.createObjectURL(
              new Blob(
                [
                  btoa(
                    unescape(
                      encodeURIComponent(JSON.stringify(objArgs.objGet)),
                    ),
                  ),
                ],
                {
                  type: "application/octet-stream",
                },
              ),
            ),
            filename:
              new Date().getFullYear() +
              "." +
              ("0" + (new Date().getMonth() + 1)).slice(-2) +
              "." +
              ("0" + new Date().getDate()).slice(-2) +
              ".database",
            saveAs: true,
          });

          return funcCallback({});
        },
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  import: function (objRequest, funcResponse, funcProgress) {
    Node.series(
      {
        objVideos: function (objArgs, funcCallback) {
          return funcCallback(objRequest.objVideos);
        },
        objDatabase: bgObject.database(),
        objVideo: bgObject.video(),
        objGet: bgObject.get(funcProgress),
        objPut: bgObject.put(),
        "objVideo-Next": bgObject.videoNext(),
        objCount: bgObject.count(),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },

  reset: function (objRequest, funcResponse) {
    Node.series(
      {
        objDatabase: bgObject.database(),
        objClear: function (objArgs, funcCallback) {
          let objQuery = objArgs.objDatabase.clear();

          objQuery.onsuccess = function () {
            return funcCallback({});
          };
        },
        objCount: bgObject.count(),
      },
      createResponseCallback(() => { }, funcResponse),
    );
  },
};