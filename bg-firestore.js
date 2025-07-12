import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
} from "./utils.js";

/**
 * Firestore configuration and connection management
 */
export class FirestoreConfig {
  constructor() {
    this.isEnabled = false;
    this.isInitialized = false;
    this.firebaseConfig = null;
    this.firestore = null;
    this.auth = null;
  }

  /**
   * Load Firestore configuration from storage
   */
  async loadConfig() {
    try {
      const result = await chrome.storage.sync.get([
        'firestore_enabled',
        'firestore_config',
        'firestore_project_id',
        'firestore_api_key',
        'firestore_auth_domain',
        'firestore_collection_name'
      ]);

      this.isEnabled = result.firestore_enabled || false;
      this.firebaseConfig = result.firestore_config || null;
      
      // If no config but individual settings exist, construct config
      if (!this.firebaseConfig && result.firestore_project_id) {
        this.firebaseConfig = {
          projectId: result.firestore_project_id,
          apiKey: result.firestore_api_key,
          authDomain: result.firestore_auth_domain || `${result.firestore_project_id}.firebaseapp.com`,
        };
      }

      console.log('Firestore config loaded:', { 
        enabled: this.isEnabled, 
        hasConfig: !!this.firebaseConfig 
      });
      
      return this.isEnabled && this.firebaseConfig;
    } catch (error) {
      console.error('Failed to load Firestore config:', error);
      return false;
    }
  }

  /**
   * Save Firestore configuration to storage
   */
  async saveConfig(config) {
    try {
      await chrome.storage.sync.set({
        firestore_enabled: config.enabled,
        firestore_config: config.firebaseConfig,
        firestore_project_id: config.firebaseConfig?.projectId,
        firestore_api_key: config.firebaseConfig?.apiKey,
        firestore_auth_domain: config.firebaseConfig?.authDomain,
        firestore_collection_name: config.collectionName || 'watchmarker_videos'
      });
      
      this.isEnabled = config.enabled;
      this.firebaseConfig = config.firebaseConfig;
      
      console.log('Firestore config saved');
      return true;
    } catch (error) {
      console.error('Failed to save Firestore config:', error);
      return false;
    }
  }

  /**
   * Initialize Firebase and Firestore
   */
  async initialize() {
    if (this.isInitialized || !this.isEnabled || !this.firebaseConfig) {
      return this.isInitialized;
    }

    try {
      // Dynamic import of Firebase SDK
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const { getAuth, signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

      // Initialize Firebase
      const app = initializeApp(this.firebaseConfig);
      this.firestore = getFirestore(app);
      this.auth = getAuth(app);

      // Connect to emulator if in development
      if (this.firebaseConfig.useEmulator) {
        connectFirestoreEmulator(this.firestore, 'localhost', 8080);
      }

      // Sign in anonymously for basic access
      await signInAnonymously(this.auth);

      this.isInitialized = true;
      console.log('Firestore initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firestore:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Get Firestore instance
   */
  getFirestore() {
    return this.firestore;
  }

  /**
   * Get collection name for videos
   */
  getCollectionName() {
    return 'watchmarker_videos';
  }
}

/**
 * Firestore database adapter that implements the same interface as DatabaseManager
 */
export class FirestoreAdapter {
  constructor() {
    this.config = new FirestoreConfig();
    this.isInitialized = false;
    this.collectionName = 'watchmarker_videos';
  }

  /**
   * Initialize the Firestore adapter
   */
  async init(request, response) {
    console.log("FirestoreAdapter.init called");
    
    if (this.isInitialized) {
      console.log("Firestore adapter already initialized");
      response({});
      return;
    }

    try {
      // Load configuration
      const hasConfig = await this.config.loadConfig();
      
      if (!hasConfig) {
        console.log("Firestore not configured or disabled");
        response({});
        return;
      }

      // Initialize Firebase/Firestore
      await this.config.initialize();

      await AsyncSeries.run(
        {
          setupMessaging: BackgroundUtils.messaging('firestore', {
            'firestore-export': this.export.bind(this),
            'firestore-import': this.import.bind(this),
            'firestore-reset': this.reset.bind(this),
            'firestore-sync': this.syncWithLocal.bind(this)
          }),
        },
        createResponseCallback(() => {
          this.isInitialized = true;
          console.log("Firestore adapter initialization completed");
          return {};
        }, response)
      );
    } catch (error) {
      console.error("Failed to initialize Firestore adapter:", error);
      response(null);
    }
  }

  /**
   * Get a document reference for a video
   */
  getDocumentRef(videoId) {
    const firestore = this.config.getFirestore();
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }
    
    // Import collection and doc functions dynamically
    return import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
      .then(({ collection, doc }) => {
        const collectionRef = collection(firestore, this.collectionName);
        return doc(collectionRef, videoId);
      });
  }

  /**
   * Add or update a video document
   */
  async addVideo(videoData) {
    try {
      const docRef = await this.getDocumentRef(videoData.strIdent);
      const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      await setDoc(docRef, {
        strIdent: videoData.strIdent,
        intTimestamp: videoData.intTimestamp,
        strTitle: videoData.strTitle || '',
        intCount: videoData.intCount || 1,
        updatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('Failed to add video to Firestore:', error);
      return false;
    }
  }

  /**
   * Get a video document
   */
  async getVideo(videoId) {
    try {
      const docRef = await this.getDocumentRef(videoId);
      const { getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get video from Firestore:', error);
      return null;
    }
  }

  /**
   * Get all videos from Firestore
   */
  async getAllVideos() {
    try {
      const firestore = this.config.getFirestore();
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const collectionRef = collection(firestore, this.collectionName);
      const querySnapshot = await getDocs(collectionRef);
      
      const videos = [];
      querySnapshot.forEach((doc) => {
        videos.push(doc.data());
      });
      
      return videos;
    } catch (error) {
      console.error('Failed to get all videos from Firestore:', error);
      return [];
    }
  }

  /**
   * Delete all videos from Firestore
   */
  async clearAllVideos() {
    try {
      const firestore = this.config.getFirestore();
      const { collection, getDocs, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      
      const collectionRef = collection(firestore, this.collectionName);
      const querySnapshot = await getDocs(collectionRef);
      
      const batch = writeBatch(firestore);
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Failed to clear Firestore collection:', error);
      return false;
    }
  }

  /**
   * Export data from Firestore
   */
  async export(request, response, progress) {
    try {
      const videos = await this.getAllVideos();
      
      // Create download file
      const dataString = JSON.stringify(videos);
      const blob = new Blob([dataString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `youwatch-firestore-${timestamp}.database`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true,
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError);
          response(null);
        } else {
          console.log("Firestore database exported successfully");
          response({});
        }
      });
    } catch (error) {
      console.error('Failed to export Firestore data:', error);
      response(null);
    }
  }

  /**
   * Import data to Firestore
   */
  async import(request, response, progress) {
    try {
      const videos = request.objVideos || [];
      let imported = 0;
      let errors = 0;

      for (const video of videos) {
        try {
          const success = await this.addVideo(video);
          if (success) {
            imported++;
          } else {
            errors++;
          }
          
          // Report progress
          if (progress && typeof progress === 'function') {
            progress({
              strProgress: `Imported ${imported} videos to Firestore (${errors} errors)`,
            });
          }
        } catch (error) {
          errors++;
          console.error('Error importing video:', error);
        }
      }

      console.log(`Firestore import completed: ${imported} imported, ${errors} errors`);
      response({ imported, errors });
    } catch (error) {
      console.error('Failed to import data to Firestore:', error);
      response(null);
    }
  }

  /**
   * Reset Firestore collection
   */
  async reset(request, response) {
    try {
      const success = await this.clearAllVideos();
      if (success) {
        console.log("Firestore collection reset successfully");
        response({});
      } else {
        response(null);
      }
    } catch (error) {
      console.error('Failed to reset Firestore collection:', error);
      response(null);
    }
  }

  /**
   * Sync Firestore data with local IndexedDB
   */
  async syncWithLocal(request, response, progress) {
    try {
      // Get all videos from Firestore
      const firestoreVideos = await this.getAllVideos();
      
      // Get local database instance
      const Database = globalThis.Database;
      if (!Database || !Database.database) {
        throw new Error("Local database not available");
      }

      const store = Database.getObjectStore();
      let synced = 0;
      let conflicts = 0;

      for (const video of firestoreVideos) {
        try {
          // Check if video exists locally
          const localQuery = store.index("strIdent").get(video.strIdent);
          
          await new Promise((resolve, reject) => {
            localQuery.onsuccess = async () => {
              try {
                const localVideo = localQuery.result;
                
                if (!localVideo) {
                  // Video doesn't exist locally, add it
                  const putQuery = store.put(video);
                  putQuery.onsuccess = () => {
                    synced++;
                    resolve();
                  };
                  putQuery.onerror = () => reject(putQuery.error);
                } else {
                  // Video exists, check timestamps for conflict resolution
                  const firestoreTime = video.intTimestamp || 0;
                  const localTime = localVideo.intTimestamp || 0;
                  
                  if (firestoreTime > localTime) {
                    // Firestore version is newer, update local
                    const putQuery = store.put(video);
                    putQuery.onsuccess = () => {
                      synced++;
                      resolve();
                    };
                    putQuery.onerror = () => reject(putQuery.error);
                  } else if (localTime > firestoreTime) {
                    // Local version is newer, update Firestore
                    await this.addVideo(localVideo);
                    conflicts++;
                    resolve();
                  } else {
                    // Same timestamp, no sync needed
                    resolve();
                  }
                }
              } catch (error) {
                reject(error);
              }
            };
            
            localQuery.onerror = () => reject(localQuery.error);
          });

          // Report progress
          if (progress && typeof progress === 'function') {
            progress({
              strProgress: `Synced ${synced} videos, resolved ${conflicts} conflicts`,
            });
          }
        } catch (error) {
          console.error('Error syncing video:', error);
        }
      }

      console.log(`Firestore sync completed: ${synced} synced, ${conflicts} conflicts resolved`);
      response({ synced, conflicts });
    } catch (error) {
      console.error('Failed to sync with Firestore:', error);
      response(null);
    }
  }
}

// Create singleton instance
const firestoreAdapter = new FirestoreAdapter();

// Export the adapter instance
export const FirestoreDB = firestoreAdapter;

// Make FirestoreDB available globally
globalThis.FirestoreDB = FirestoreDB; 