import { Database } from "./bg-database.js";
import { FirestoreDB } from "./bg-firestore.js";
import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
} from "./utils.js";

/**
 * Database provider factory that manages multiple database backends
 */
export class DatabaseProvider {
  constructor() {
    this.primaryDB = null;
    this.secondaryDB = null;
    this.isInitialized = false;
    this.useFirestore = false;
    this.syncEnabled = false;
  }

  /**
   * Initialize the database provider
   */
  async init(request, response) {
    console.log("DatabaseProvider.init called");
    
    if (this.isInitialized) {
      console.log("Database provider already initialized");
      response({});
      return;
    }

    try {
      await AsyncSeries.run(
        {
          loadConfig: this.loadConfiguration.bind(this),
          initPrimary: this.initializePrimaryDatabase.bind(this),
          initSecondary: this.initializeSecondaryDatabase.bind(this),
          setupMessaging: BackgroundUtils.messaging('database-provider', {
            'database-provider-export': this.export.bind(this),
            'database-provider-import': this.import.bind(this),
            'database-provider-reset': this.reset.bind(this),
            'database-provider-sync': this.syncDatabases.bind(this),
            'database-provider-switch': this.switchDatabase.bind(this),
            'database-provider-config': this.updateConfiguration.bind(this)
          }),
        },
        createResponseCallback(() => {
          this.isInitialized = true;
          console.log("Database provider initialization completed");
          return {};
        }, response)
      );
    } catch (error) {
      console.error("Failed to initialize database provider:", error);
      response(null);
    }
  }

  /**
   * Load configuration from storage
   */
  async loadConfiguration(args, callback) {
    try {
      const result = await chrome.storage.sync.get([
        'database_provider',
        'database_sync_enabled',
        'firestore_enabled'
      ]);

      this.useFirestore = result.database_provider === 'firestore' || result.firestore_enabled;
      this.syncEnabled = result.database_sync_enabled || false;

      console.log('Database provider configuration loaded:', {
        useFirestore: this.useFirestore,
        syncEnabled: this.syncEnabled
      });

      callback({});
    } catch (error) {
      console.error('Failed to load database provider configuration:', error);
      callback(null);
    }
  }

  /**
   * Initialize primary database
   */
  async initializePrimaryDatabase(args, callback) {
    try {
      if (this.useFirestore) {
        this.primaryDB = FirestoreDB;
        this.secondaryDB = Database;
      } else {
        this.primaryDB = Database;
        this.secondaryDB = FirestoreDB;
      }

      // Initialize primary database
      await new Promise((resolve, reject) => {
        this.primaryDB.init({}, (response) => {
          if (response !== null) {
            console.log('Primary database initialized:', this.useFirestore ? 'Firestore' : 'IndexedDB');
            resolve();
          } else {
            reject(new Error('Failed to initialize primary database'));
          }
        });
      });

      callback({});
    } catch (error) {
      console.error('Failed to initialize primary database:', error);
      callback(null);
    }
  }

  /**
   * Initialize secondary database (if sync enabled)
   */
  async initializeSecondaryDatabase(args, callback) {
    try {
      if (this.syncEnabled && this.secondaryDB) {
        await new Promise((resolve, reject) => {
          this.secondaryDB.init({}, (response) => {
            if (response !== null) {
              console.log('Secondary database initialized:', this.useFirestore ? 'IndexedDB' : 'Firestore');
              resolve();
            } else {
              console.warn('Failed to initialize secondary database, sync will be disabled');
              this.syncEnabled = false;
              resolve();
            }
          });
        });
      }

      callback({});
    } catch (error) {
      console.error('Failed to initialize secondary database:', error);
      this.syncEnabled = false;
      callback({});
    }
  }

  /**
   * Get the active database instance
   */
  getActiveDatabase() {
    return this.primaryDB;
  }

  /**
   * Get the secondary database instance
   */
  getSecondaryDatabase() {
    return this.secondaryDB;
  }

  /**
   * Export data from active database
   */
  async export(request, response, progress) {
    try {
      const activeDB = this.getActiveDatabase();
      if (!activeDB) {
        throw new Error('No active database available');
      }

      activeDB.export(request, response, progress);
    } catch (error) {
      console.error('Failed to export from database provider:', error);
      response(null);
    }
  }

  /**
   * Import data to active database
   */
  async import(request, response, progress) {
    try {
      const activeDB = this.getActiveDatabase();
      if (!activeDB) {
        throw new Error('No active database available');
      }

      // Import to primary database
      activeDB.import(request, (primaryResponse) => {
        if (primaryResponse && this.syncEnabled && this.secondaryDB) {
          // Also import to secondary database if sync is enabled
          this.secondaryDB.import(request, (secondaryResponse) => {
            console.log('Data imported to both databases');
            response(primaryResponse);
          }, progress);
        } else {
          response(primaryResponse);
        }
      }, progress);
    } catch (error) {
      console.error('Failed to import to database provider:', error);
      response(null);
    }
  }

  /**
   * Reset active database
   */
  async reset(request, response) {
    try {
      const activeDB = this.getActiveDatabase();
      if (!activeDB) {
        throw new Error('No active database available');
      }

      // Reset primary database
      activeDB.reset(request, (primaryResponse) => {
        if (primaryResponse && this.syncEnabled && this.secondaryDB) {
          // Also reset secondary database if sync is enabled
          this.secondaryDB.reset(request, (secondaryResponse) => {
            console.log('Both databases reset');
            response(primaryResponse);
          });
        } else {
          response(primaryResponse);
        }
      });
    } catch (error) {
      console.error('Failed to reset database provider:', error);
      response(null);
    }
  }

  /**
   * Sync data between databases
   */
  async syncDatabases(request, response, progress) {
    try {
      if (!this.syncEnabled || !this.secondaryDB) {
        response({ error: 'Sync not enabled or secondary database not available' });
        return;
      }

      console.log('Starting database synchronization...');
      
      // Get data from both databases
      const primaryData = await this.getAllDataFromDatabase(this.primaryDB);
      const secondaryData = await this.getAllDataFromDatabase(this.secondaryDB);

      let synced = 0;
      let conflicts = 0;

      // Sync primary to secondary
      for (const video of primaryData) {
        const secondaryVideo = secondaryData.find(v => v.strIdent === video.strIdent);
        
        if (!secondaryVideo) {
          // Video doesn't exist in secondary, add it
          await this.addVideoToDatabase(this.secondaryDB, video);
          synced++;
        } else {
          // Check for conflicts
          const primaryTime = video.intTimestamp || 0;
          const secondaryTime = secondaryVideo.intTimestamp || 0;
          
          if (primaryTime > secondaryTime) {
            // Primary is newer, update secondary
            await this.addVideoToDatabase(this.secondaryDB, video);
            synced++;
          } else if (secondaryTime > primaryTime) {
            // Secondary is newer, update primary
            await this.addVideoToDatabase(this.primaryDB, secondaryVideo);
            conflicts++;
          }
        }

        // Report progress
        if (progress && typeof progress === 'function') {
          progress({
            strProgress: `Synced ${synced} videos, resolved ${conflicts} conflicts`,
          });
        }
      }

      // Sync secondary to primary (for videos that only exist in secondary)
      for (const video of secondaryData) {
        const primaryVideo = primaryData.find(v => v.strIdent === video.strIdent);
        
        if (!primaryVideo) {
          // Video doesn't exist in primary, add it
          await this.addVideoToDatabase(this.primaryDB, video);
          synced++;
        }
      }

      console.log(`Database sync completed: ${synced} synced, ${conflicts} conflicts resolved`);
      response({ synced, conflicts });
    } catch (error) {
      console.error('Failed to sync databases:', error);
      response(null);
    }
  }

  /**
   * Switch active database
   */
  async switchDatabase(request, response) {
    try {
      const newProvider = request.provider; // 'indexeddb' or 'firestore'
      
      if (newProvider === 'firestore') {
        this.useFirestore = true;
        this.primaryDB = FirestoreDB;
        this.secondaryDB = Database;
      } else {
        this.useFirestore = false;
        this.primaryDB = Database;
        this.secondaryDB = FirestoreDB;
      }

      // Save configuration
      await chrome.storage.sync.set({
        database_provider: newProvider,
        firestore_enabled: this.useFirestore
      });

      console.log(`Switched to ${newProvider} database`);
      response({ success: true, provider: newProvider });
    } catch (error) {
      console.error('Failed to switch database:', error);
      response(null);
    }
  }

  /**
   * Update configuration
   */
  async updateConfiguration(request, response) {
    try {
      const { syncEnabled, provider } = request;
      
      if (syncEnabled !== undefined) {
        this.syncEnabled = syncEnabled;
      }
      
      if (provider) {
        this.useFirestore = provider === 'firestore';
        this.primaryDB = this.useFirestore ? FirestoreDB : Database;
        this.secondaryDB = this.useFirestore ? Database : FirestoreDB;
      }

      // Save configuration
      await chrome.storage.sync.set({
        database_sync_enabled: this.syncEnabled,
        database_provider: this.useFirestore ? 'firestore' : 'indexeddb',
        firestore_enabled: this.useFirestore
      });

      console.log('Database provider configuration updated');
      response({ success: true });
    } catch (error) {
      console.error('Failed to update configuration:', error);
      response(null);
    }
  }

  /**
   * Helper method to get all data from a database
   */
  async getAllDataFromDatabase(database) {
    return new Promise((resolve, reject) => {
      if (database === FirestoreDB) {
        // Firestore adapter
        database.getAllVideos()
          .then(videos => resolve(videos))
          .catch(error => reject(error));
      } else {
        // IndexedDB adapter
        const store = database.getObjectStore('readonly');
        const query = store.getAll();
        
        query.onsuccess = () => resolve(query.result || []);
        query.onerror = () => reject(query.error);
      }
    });
  }

  /**
   * Helper method to add a video to a database
   */
  async addVideoToDatabase(database, video) {
    return new Promise((resolve, reject) => {
      if (database === FirestoreDB) {
        // Firestore adapter
        database.addVideo(video)
          .then(success => resolve(success))
          .catch(error => reject(error));
      } else {
        // IndexedDB adapter
        const store = database.getObjectStore('readwrite');
        const query = store.put(video);
        
        query.onsuccess = () => resolve(true);
        query.onerror = () => reject(query.error);
      }
    });
  }

  /**
   * Get database status information
   */
  async getStatus() {
    return {
      primaryDatabase: this.useFirestore ? 'Firestore' : 'IndexedDB',
      secondaryDatabase: this.useFirestore ? 'IndexedDB' : 'Firestore',
      syncEnabled: this.syncEnabled,
      isInitialized: this.isInitialized
    };
  }
}

// Create singleton instance
const databaseProvider = new DatabaseProvider();

// Export the provider instance
export const DatabaseProviderInstance = databaseProvider;

// Make DatabaseProvider available globally
globalThis.DatabaseProvider = DatabaseProviderInstance; 