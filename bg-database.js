import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
} from "./utils.js";
import { databaseProviderFactory } from "./database-provider-factory.js";
import { credentialStorage } from "./credential-storage.js";
import { supabaseDatabaseProvider } from "./supabase-database-provider.js";
import { SyncManagerInstance } from "./bg-sync-manager.js";
import { DATABASE, ERRORS } from "./constants.js";

/**
 * Database management class for YouTube watch history
 */
export class DatabaseManager {
  constructor() {
    this.database = null;
    this.DB_NAME = DATABASE.NAME;
    this.DB_VERSION = DATABASE.VERSION;
    this.STORE_NAME = DATABASE.STORE_NAME;
    this.isInitialized = false;
    this.syncManager = SyncManagerInstance;
    this.providerFactory = databaseProviderFactory;
  }

  /**
   * Initialize the database
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async init(request, response) {
    if (this.isInitialized) {
      response({});
      return;
    }
    
    try {
      await AsyncSeries.run(
        {
          openDatabase: this.openDatabase.bind(this),
          notifyProviders: async (args, callback) => {
            // Notify providers that database is ready
            this.notifyProvidersReady();
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
            'supabase-clear': this.clearSupabase.bind(this),
            'supabase-get-credentials': this.getSupabaseCredentials.bind(this),
            'supabase-get-status': this.getSupabaseStatus.bind(this),
            'supabase-check-table': this.checkSupabaseTable.bind(this)
          }),
        },
        createResponseCallback(() => {
          this.isInitialized = true;
          return {};
        }, response)
      );
    } catch (error) {
      console.error("Failed to initialize database:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
      response(null);
    }
  }

  /**
   * Notify providers that database is ready
   */
  notifyProvidersReady() {
    if (this.providerFactory && this.providerFactory.getCurrentProvider()) {
      const currentProvider = this.providerFactory.getCurrentProvider();
      if (currentProvider.updateConnectionStatus) {
        currentProvider.updateConnectionStatus();
      }
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
          keyPath: DATABASE.INDEXES.IDENT,
        });
      }

      // Create indexes if they don't exist
      if (!store.indexNames.contains(DATABASE.INDEXES.IDENT)) {
        store.createIndex(DATABASE.INDEXES.IDENT, DATABASE.INDEXES.IDENT, { unique: true });
      }

      if (!store.indexNames.contains(DATABASE.INDEXES.TIMESTAMP)) {
        store.createIndex(DATABASE.INDEXES.TIMESTAMP, DATABASE.INDEXES.TIMESTAMP, { unique: false });
      }

      // Remove old timestamp index if it exists (renamed to intTimestamp)
      if (store.indexNames.contains("longTimestamp")) {
        store.deleteIndex("longTimestamp");
      }
    };

    openRequest.onerror = () => {
              console.error("Failed to open database:", JSON.stringify({
          error: openRequest.error?.message || 'Unknown database error',
          errorName: openRequest.error?.name || 'DatabaseError'
        }, null, 2));
      this.database = null;
      callback(null);
    };

    openRequest.onsuccess = () => {
      this.database = openRequest.result;
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
      throw new Error(ERRORS.DATABASE_NOT_AVAILABLE);
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
        response({ success: false, error: ERRORS.PROVIDER_NOT_FOUND });
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
      console.error("Failed to export data:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
        response({ success: false, error: ERRORS.INVALID_REQUEST });
        return;
      }

      const provider = this.providerFactory.getCurrentProvider();
      if (!provider) {
        response({ success: false, error: ERRORS.PROVIDER_NOT_FOUND });
        return;
      }

      await provider.importVideos(data.data);
      response({ success: true, message: `Imported ${data.data.length} videos` });
    } catch (error) {
      console.error("Failed to import data:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
        response({ success: false, error: ERRORS.PROVIDER_NOT_FOUND });
        return;
      }

      await provider.clearAllVideos();
      response({ success: true, message: 'Database reset successfully' });
    } catch (error) {
      console.error("Failed to reset database:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      console.error("Failed to enable sync:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      console.error("Failed to disable sync:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      console.error("Failed to sync:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      console.error("Failed to get sync status:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      const success = await this.providerFactory.switchProvider(provider);
      
      if (success) {
        response({ success: true, message: `Switched to ${provider} provider` });
      } else {
        response({ success: false, error: 'Failed to switch provider' });
      }
    } catch (error) {
      console.error("Failed to switch provider:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      response({ success: true, status: status });
    } catch (error) {
      console.error("Failed to get provider status:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      const providers = this.providerFactory.getAvailableProviders();
      response({ success: true, data: providers });
    } catch (error) {
      console.error("Failed to get available providers:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      const { fromProvider, toProvider } = request;
      const success = await this.providerFactory.migrateData(fromProvider, toProvider);
      
      if (success) {
        response({ success: true, message: `Migrated data from ${fromProvider} to ${toProvider}` });
      } else {
        response({ success: false, error: 'Migration failed' });
      }
    } catch (error) {
      console.error("Failed to migrate data:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
      response({ success: false, error: error.message });
    }
  }

  /**
   * Configure Supabase
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async configureSupabase(request, response) {
    try {
      const { url, apiKey } = request;
      await credentialStorage.storeCredentials({
        supabaseUrl: url,
        apiKey: apiKey
      });
      response({ success: true, message: 'Supabase configured successfully' });
    } catch (error) {
      console.error("Failed to configure Supabase:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
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
      const result = await supabaseDatabaseProvider.testConnection();
      if (result) {
        response({ success: true, message: 'Supabase connection successful' });
      } else {
        response({ success: false, error: ERRORS.CONNECTION_FAILED });
      }
    } catch (error) {
      console.error("Failed to test Supabase:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
      response({ success: false, error: error.message });
    }
  }

  /**
   * Check Supabase table existence
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async checkSupabaseTable(request, response) {
    try {
      const exists = await supabaseDatabaseProvider.checkTableExists();
      response({ success: true, tableExists: exists });
    } catch (error) {
      console.error("Failed to check Supabase table:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
      response({ success: false, error: error.message });
    }
  }

  /**
   * Clear Supabase credentials
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async clearSupabase(request, response) {
    try {
      await credentialStorage.clearSupabaseCredentials();
      response({ success: true, message: 'Supabase credentials cleared' });
    } catch (error) {
      console.error("Failed to clear Supabase credentials:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
      response({ success: false, error: error.message });
    }
  }

  /**
   * Get Supabase credentials
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async getSupabaseCredentials(request, response) {
    try {
      const credentials = await credentialStorage.getMaskedCredentials();
      response({ success: true, credentials: credentials });
    } catch (error) {
      console.error("Failed to get Supabase credentials:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
      response({ success: false, error: error.message });
    }
  }

  /**
   * Get Supabase status
   * @param {Object} request - Request object
   * @param {Function} response - Response callback
   */
  async getSupabaseStatus(request, response) {
    try {
      const hasCredentials = await credentialStorage.hasSupabaseCredentials();
      const isConfigured = hasCredentials;
      let isConnected = false;
      
      if (isConfigured) {
        try {
          isConnected = await supabaseDatabaseProvider.testConnection();
        } catch (error) {
          console.warn("Supabase connection test failed:", error);
        }
      }
      
      response({ 
        success: true, 
        data: { 
          configured: isConfigured, 
          connected: isConnected,
          hasCredentials: hasCredentials
        } 
      });
    } catch (error) {
      console.error("Failed to get Supabase status:", JSON.stringify({
        error: error.message,
        errorName: error.name,
        errorStack: error.stack
      }, null, 2));
      response({ success: false, error: error.message });
    }
  }
}

// Global instances
export const Database = new DatabaseManager();