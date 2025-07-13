import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
} from "./utils.js";
import { databaseProviderFactory } from "./database-provider-factory.js";
import { credentialStorage } from "./credential-storage.js";
import { supabaseDatabaseProvider } from "./supabase-database-provider.js";

/**
 * Database management class for YouTube watch history
 */
export class DatabaseManager {
  constructor() {
    this.database = null;
    this.DB_NAME = "Database";
    this.DB_VERSION = 401;
    this.STORE_NAME = "storeDatabase";
    this.isInitialized = false;
    this.syncManager = new SyncManager();
    this.providerFactory = databaseProviderFactory;
  }

  /**
   * Initialize the database
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async init(request, response) {
    console.log("DatabaseManager.init called");
    
    if (this.isInitialized) {
      console.log("Database already initialized");
      response({});
      return;
    }
    
    try {
      await AsyncSeries.run(
        {
          openDatabase: this.openDatabase.bind(this),
          initProviderFactory: async (args, callback) => {
            // Initialize provider factory with this database manager
            this.providerFactory.setDatabaseManager(this);
            await this.providerFactory.init();
            callback({});
          },
          initSync: async (args, callback) => {
            await this.syncManager.init();
            callback({});
          },
          setupMessaging: BackgroundUtils.messaging('database', {
            'database-export': this.export.bind(this),
            'database-import': this.import.bind(this),
            'database-reset': this.reset.bind(this),
            'database-sync-enable': this.enableSync.bind(this),
            'database-sync-disable': this.disableSync.bind(this),
            'database-sync-now': this.syncNow.bind(this),
            'database-sync-status': this.getSyncStatus.bind(this),
            'database-provider-switch': this.switchProvider.bind(this),
            'database-provider-status': this.getProviderStatus.bind(this),
            'database-provider-list': this.getAvailableProviders.bind(this),
            'database-provider-migrate': this.migrateData.bind(this),
            'supabase-configure': this.configureSupabase.bind(this),
            'supabase-test': this.testSupabase.bind(this),
            'supabase-clear': this.clearSupabase.bind(this)
          }),
        },
        createResponseCallback(() => {
          this.isInitialized = true;
          console.log("Database initialization completed");
          return {};
        }, response)
      );
    } catch (error) {
      console.error("Failed to initialize database:", error);
      response(null);
    }
  }

  /**
   * Opens the IndexedDB database
   * @param {Object} args - Arguments object
   * @param {Function} callback - Callback function
   */
  openDatabase(args, callback) {
    const openRequest = indexedDB.open(this.DB_NAME, this.DB_VERSION);

    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      let store = null;

      if (db.objectStoreNames.contains(this.STORE_NAME)) {
        store = openRequest.transaction.objectStore(this.STORE_NAME);
      } else {
        store = db.createObjectStore(this.STORE_NAME, {
          keyPath: "strIdent",
        });
      }

      // Create indexes if they don't exist
      if (!store.indexNames.contains("strIdent")) {
        store.createIndex("strIdent", "strIdent", { unique: true });
      }

      if (!store.indexNames.contains("intTimestamp")) {
        store.createIndex("intTimestamp", "intTimestamp", { unique: false });
      }

      // Remove legacy index if it exists
      if (store.indexNames.contains("longTimestamp")) {
        store.deleteIndex("longTimestamp");
      }
    };

    openRequest.onerror = () => {
      console.error("Failed to open database:", openRequest.error);
      this.database = null;
      callback(null);
    };

    openRequest.onsuccess = () => {
      this.database = openRequest.result;
      console.log("Database opened successfully");
      callback({});
    };
  }

  /**
   * Get object store for database operations
   * @param {string} mode - Transaction mode
   * @returns {Object} Object store
   */
  getObjectStore(mode = 'readwrite') {
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    const transaction = this.database.transaction([this.STORE_NAME], mode);
    return transaction.objectStore(this.STORE_NAME);
  }

  /**
   * Export database data
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async export(request, response) {
    try {
      const provider = this.providerFactory.getCurrentProvider();
      if (!provider) {
        response({ success: false, error: 'No database provider available' });
        return;
      }

      const data = await provider.getAllVideos();
      const exportData = {
        version: this.DB_VERSION,
        timestamp: Date.now(),
        provider: this.providerFactory.getCurrentProviderType(),
        data: data
      };

      response({ success: true, data: exportData });
    } catch (error) {
      console.error("Failed to export data:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Import database data
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async import(request, response) {
    try {
      const { data } = request;
      if (!data || !data.data) {
        response({ success: false, error: 'Invalid import data' });
        return;
      }

      const provider = this.providerFactory.getCurrentProvider();
      if (!provider) {
        response({ success: false, error: 'No database provider available' });
        return;
      }

      await provider.importVideos(data.data);
      response({ success: true, message: `Imported ${data.data.length} videos` });
    } catch (error) {
      console.error("Failed to import data:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Reset database
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async reset(request, response) {
    try {
      const provider = this.providerFactory.getCurrentProvider();
      if (!provider) {
        response({ success: false, error: 'No database provider available' });
        return;
      }

      await provider.clearAllVideos();
      response({ success: true, message: 'Database reset successfully' });
    } catch (error) {
      console.error("Failed to reset database:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Enable sync
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async enableSync(request, response) {
    try {
      const { provider, interval } = request;
      await this.syncManager.enableSync(provider, interval);
      response({ success: true, message: 'Sync enabled' });
    } catch (error) {
      console.error("Failed to enable sync:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Disable sync
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async disableSync(request, response) {
    try {
      await this.syncManager.disableSync();
      response({ success: true, message: 'Sync disabled' });
    } catch (error) {
      console.error("Failed to disable sync:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Sync now
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async syncNow(request, response) {
    try {
      await this.syncManager.syncNow();
      response({ success: true, message: 'Sync completed' });
    } catch (error) {
      console.error("Failed to sync now:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Get sync status
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async getSyncStatus(request, response) {
    try {
      const status = await this.syncManager.getStatus();
      response({ success: true, data: status });
    } catch (error) {
      console.error("Failed to get sync status:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Switch database provider
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async switchProvider(request, response) {
    try {
      const { provider } = request;
      
      if (!provider || !['indexeddb', 'supabase'].includes(provider)) {
        response({ success: false, error: 'Invalid provider type' });
        return;
      }

      let success = false;
      if (provider === 'indexeddb') {
        success = await this.providerFactory.switchToIndexedDB();
      } else if (provider === 'supabase') {
        success = await this.providerFactory.switchToSupabase();
      }

      if (success) {
        response({ success: true, message: `Successfully switched to ${provider}` });
      } else {
        response({ success: false, error: `Failed to switch to ${provider}` });
      }
    } catch (error) {
      console.error("Failed to switch provider:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Get provider status
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async getProviderStatus(request, response) {
    try {
      const status = this.providerFactory.getProviderStatus();
      response({ success: true, data: status });
    } catch (error) {
      console.error("Failed to get provider status:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Get available providers
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async getAvailableProviders(request, response) {
    try {
      const providers = await this.providerFactory.getAvailableProviders();
      response({ success: true, data: providers });
    } catch (error) {
      console.error("Failed to get available providers:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Migrate data between providers
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async migrateData(request, response) {
    try {
      const { from, to } = request;
      
      if (!from || !to) {
        response({ success: false, error: 'Missing source or target provider' });
        return;
      }

      await this.providerFactory.migrateData(from, to);
      response({ success: true, message: `Successfully migrated data from ${from} to ${to}` });
    } catch (error) {
      console.error("Failed to migrate data:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Configure Supabase credentials
   * @param {Object} request - Request object with credentials
   * @param {Function} response - Response callback
   */
  async configureSupabase(request, response) {
    try {
      const { credentials } = request;
      
      if (!credentials) {
        response({ success: false, error: 'Missing credentials' });
        return;
      }

      // Store credentials
      await credentialStorage.storeCredentials(credentials);
      
      response({ success: true, message: 'Supabase credentials configured successfully' });
    } catch (error) {
      console.error("Failed to configure Supabase:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Test Supabase connection
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async testSupabase(request, response) {
    try {
      const connectionTest = await credentialStorage.testConnection();
      
      if (connectionTest) {
        response({ success: true, message: 'Supabase connection test successful' });
      } else {
        response({ success: false, error: 'Supabase connection test failed' });
      }
    } catch (error) {
      console.error("Failed to test Supabase connection:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Clear Supabase data
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async clearSupabase(request, response) {
    try {
      if (supabaseDatabaseProvider.isConnected) {
        await supabaseDatabaseProvider.clearAllVideos();
        response({ success: true, message: 'Supabase data cleared successfully' });
      } else {
        response({ success: false, error: 'Supabase provider not connected' });
      }
    } catch (error) {
      console.error("Failed to clear Supabase data:", error);
      response({ success: false, error: error.message });
    }
  }
}

/**
 * Sync Manager for handling data synchronization
 */
export class SyncManager {
  constructor() {
    this.isEnabled = false;
    this.syncProvider = null;
    this.syncInterval = null;
    this.intervalId = null;
    this.lastSyncTimestamp = 0;
    this.syncInProgress = false;
  }

  /**
   * Initialize sync manager
   */
  async init() {
    try {
      // Load sync settings from storage
      const result = await chrome.storage.local.get([
        'sync_enabled',
        'sync_provider',
        'sync_interval',
        'last_sync_timestamp'
      ]);

      this.isEnabled = result.sync_enabled || false;
      this.syncProvider = result.sync_provider || null;
      this.syncInterval = result.sync_interval || 300000; // 5 minutes default
      this.lastSyncTimestamp = result.last_sync_timestamp || 0;

      if (this.isEnabled && this.syncProvider) {
        this.startSyncInterval();
      }

      console.log('Sync manager initialized');
    } catch (error) {
      console.error('Failed to initialize sync manager:', error);
    }
  }

  /**
   * Enable sync with specified provider
   * @param {string} provider - Sync provider
   * @param {number} interval - Sync interval in milliseconds
   */
  async enableSync(provider, interval = 300000) {
    try {
      this.isEnabled = true;
      this.syncProvider = provider;
      this.syncInterval = interval;

      // Save settings
      await chrome.storage.local.set({
        sync_enabled: this.isEnabled,
        sync_provider: this.syncProvider,
        sync_interval: this.syncInterval
      });

      this.startSyncInterval();
      console.log(`Sync enabled with provider: ${provider}`);
    } catch (error) {
      console.error('Failed to enable sync:', error);
      throw error;
    }
  }

  /**
   * Disable sync
   */
  async disableSync() {
    try {
      this.isEnabled = false;
      this.syncProvider = null;
      this.stopSyncInterval();

      // Save settings
      await chrome.storage.local.set({
        sync_enabled: false,
        sync_provider: null
      });

      console.log('Sync disabled');
    } catch (error) {
      console.error('Failed to disable sync:', error);
      throw error;
    }
  }

  /**
   * Start sync interval
   */
  startSyncInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.syncNow().catch(error => {
        console.error('Scheduled sync failed:', error);
      });
    }, this.syncInterval);
  }

  /**
   * Stop sync interval
   */
  stopSyncInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform sync now
   */
  async syncNow() {
    if (!this.isEnabled || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    
    try {
      // Get current data
      const provider = databaseProviderFactory.getCurrentProvider();
      if (!provider) {
        throw new Error('No database provider available');
      }

      const data = await provider.getAllVideos();
      
      // Sync to remote storage
      await this.syncToRemote(data);
      
      // Sync from remote storage
      const remoteData = await this.syncFromRemote();
      if (remoteData && remoteData.length > 0) {
        await provider.importVideos(remoteData);
      }

      this.lastSyncTimestamp = Date.now();
      await chrome.storage.local.set({
        last_sync_timestamp: this.lastSyncTimestamp
      });

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync data to remote storage
   * @param {Array} data - Database data to sync
   */
  async syncToRemote(data) {
    if (!this.isEnabled || !this.syncProvider) return;

    try {
      switch (this.syncProvider) {
        case 'chrome':
          await this.syncToChrome(data);
          break;
        case 'supabase':
          await this.syncToSupabase(data);
          break;
        case 'googledrive':
          await this.syncToGoogleDrive(data);
          break;
        case 'custom':
          await this.syncToCustomBackend(data);
          break;
        default:
          console.warn('Unknown sync provider:', this.syncProvider);
      }
      
      this.lastSyncTimestamp = Date.now();
      await chrome.storage.local.set({
        last_sync_timestamp: this.lastSyncTimestamp
      });
    } catch (error) {
      console.error('Sync to remote failed:', error);
      throw error;
    }
  }

  /**
   * Sync data from remote storage
   * @returns {Array} Synced data
   */
  async syncFromRemote() {
    if (!this.isEnabled || !this.syncProvider) return [];

    try {
      switch (this.syncProvider) {
        case 'chrome':
          return await this.syncFromChrome();
        case 'supabase':
          return await this.syncFromSupabase();
        case 'googledrive':
          return await this.syncFromGoogleDrive();
        case 'custom':
          return await this.syncFromCustomBackend();
        default:
          console.warn('Unknown sync provider:', this.syncProvider);
          return [];
      }
    } catch (error) {
      console.error('Sync from remote failed:', error);
      throw error;
    }
  }

  /**
   * Chrome sync implementation
   */
  async syncToChrome(data) {
    try {
      const syncData = {
        timestamp: Date.now(),
        data: data
      };
      
      await chrome.storage.sync.set({
        youtube_watchmarker_data: syncData
      });
      
      console.log(`Synced ${data.length} videos to Chrome storage`);
    } catch (error) {
      console.error('Chrome sync to remote failed:', error);
      throw error;
    }
  }

  async syncFromChrome() {
    try {
      const result = await chrome.storage.sync.get(['youtube_watchmarker_data']);
      const syncData = result.youtube_watchmarker_data;
      
      if (!syncData || !syncData.data) {
        return [];
      }
      
      console.log(`Retrieved ${syncData.data.length} videos from Chrome storage`);
      return syncData.data;
    } catch (error) {
      console.error('Chrome sync from remote failed:', error);
      throw error;
    }
  }

  /**
   * Supabase sync implementation
   */
  async syncToSupabase(data) {
    try {
      if (!supabaseDatabaseProvider.isConnected) {
        await supabaseDatabaseProvider.init();
      }
      
      if (!supabaseDatabaseProvider.isConnected) {
        throw new Error('Supabase provider not connected');
      }
      
      // Import data to Supabase
      await supabaseDatabaseProvider.importVideos(data);
      console.log(`Synced ${data.length} videos to Supabase`);
    } catch (error) {
      console.error('Supabase sync to remote failed:', error);
      throw error;
    }
  }

  async syncFromSupabase() {
    try {
      if (!supabaseDatabaseProvider.isConnected) {
        await supabaseDatabaseProvider.init();
      }
      
      if (!supabaseDatabaseProvider.isConnected) {
        throw new Error('Supabase provider not connected');
      }
      
      // Get all videos from Supabase
      const videos = await supabaseDatabaseProvider.getAllVideos();
      console.log(`Retrieved ${videos.length} videos from Supabase`);
      return videos;
    } catch (error) {
      console.error('Supabase sync from remote failed:', error);
      throw error;
    }
  }

  /**
   * Google Drive sync implementation (placeholder)
   */
  async syncToGoogleDrive(data) {
    // TODO: Implement Google Drive sync
    console.log('Google Drive sync not implemented yet');
  }

  async syncFromGoogleDrive() {
    // TODO: Implement Google Drive sync
    console.log('Google Drive sync not implemented yet');
    return [];
  }

  /**
   * Custom backend sync implementation (placeholder)
   */
  async syncToCustomBackend(data) {
    // TODO: Implement custom backend sync
    console.log('Custom backend sync not implemented yet');
  }

  async syncFromCustomBackend() {
    // TODO: Implement custom backend sync
    console.log('Custom backend sync not implemented yet');
    return [];
  }

  /**
   * Get sync status
   * @returns {Object} Sync status
   */
  async getStatus() {
    return {
      isEnabled: this.isEnabled,
      provider: this.syncProvider,
      interval: this.syncInterval,
      lastSyncTimestamp: this.lastSyncTimestamp,
      syncInProgress: this.syncInProgress
    };
  }
}

// Global instances
export const Database = new DatabaseManager();
export const syncManager = new SyncManager();

// Make Database available globally
globalThis.Database = Database;