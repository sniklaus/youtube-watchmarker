import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
} from "./utils.js";
import { databaseProviderFactory } from "./database-provider-factory.js";

/**
 * Sync manager for automatic synchronization between databases
 */
export class SyncManager {
  constructor() {
    this.isInitialized = false;
    this.syncInterval = null;
    this.syncIntervalMinutes = 60; // Default 1 hour
    this.isManualSyncInProgress = false;
    this.lastSyncTimestamp = 0;
    this.autoSyncEnabled = false;
  }

  /**
   * Initialize the sync manager
   */
  async init(request, response) {
    if (this.isInitialized) {
      response({});
      return;
    }

    try {
      await AsyncSeries.run(
        {
          loadConfig: this.loadConfiguration.bind(this),
          setupMessaging: BackgroundUtils.messaging('sync-manager', {
            'sync-manager-start': this.startAutoSync.bind(this),
            'sync-manager-stop': this.stopAutoSync.bind(this),
            'sync-manager-sync-now': this.syncNow.bind(this),
            'sync-manager-config': this.updateConfiguration.bind(this),
            'sync-manager-status': this.getStatus.bind(this)
          }),
          startAutoSync: this.conditionalStartAutoSync.bind(this),
        },
        createResponseCallback(() => {
          this.isInitialized = true;
          
          // Set up storage change listener
          chrome.storage.onChanged.addListener(this.onStorageChanged.bind(this));
          
          return {};
        }, response)
      );
    } catch (error) {
      console.error("Failed to initialize sync manager:", error);
      response(null);
    }
  }

  /**
   * Load configuration from storage
   */
  async loadConfiguration(args, callback) {
    try {
      const result = await chrome.storage.sync.get([
        'auto_sync_enabled',
        'sync_interval_minutes',
        'sync_last_timestamp'
      ]);

      this.autoSyncEnabled = result.auto_sync_enabled || false;
      this.syncIntervalMinutes = result.sync_interval_minutes || 60;
      this.lastSyncTimestamp = result.sync_last_timestamp || 0;

      callback({});
    } catch (error) {
      console.error('Failed to load sync manager configuration:', error);
      callback(null);
    }
  }

  /**
   * Start auto sync if enabled
   */
  async conditionalStartAutoSync(args, callback) {
    if (this.autoSyncEnabled) {
      await this.startAutoSyncInternal();
    }
    callback({});
  }

  /**
   * Start automatic synchronization
   */
  async startAutoSync(request, response) {
    try {
      this.autoSyncEnabled = true;
      
      // Save configuration
      await chrome.storage.sync.set({ auto_sync_enabled: true });
      
      await this.startAutoSyncInternal();
      
      response({ success: true });
    } catch (error) {
      console.error("Failed to start auto sync:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Internal method to start auto sync
   */
  async startAutoSyncInternal() {
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Set up new interval
    const intervalMs = this.syncIntervalMinutes * 60 * 1000;
    this.syncInterval = setInterval(() => {
      this.performAutoSync();
    }, intervalMs);
  }

  /**
   * Stop automatic synchronization
   */
  async stopAutoSync(request, response) {
    try {
      this.autoSyncEnabled = false;
      
      // Save configuration
      await chrome.storage.sync.set({ auto_sync_enabled: false });
      
      // Clear interval
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
      
      response({ success: true });
    } catch (error) {
      console.error("Failed to stop auto sync:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Perform synchronization now
   */
  async syncNow(request, response) {
    try {
      if (this.isManualSyncInProgress) {
        response({ success: false, error: "Sync already in progress" });
        return;
      }

      this.isManualSyncInProgress = true;
      
      const result = await this.performSync();
      
      response({ success: true, result });
    } catch (error) {
      console.error("Failed to perform manual sync:", error);
      response({ success: false, error: error.message });
    } finally {
      this.isManualSyncInProgress = false;
    }
  }

  /**
   * Update sync configuration
   */
  async updateConfiguration(request, response) {
    try {
      const { autoSyncEnabled, syncIntervalMinutes } = request;
      
      if (autoSyncEnabled !== undefined) {
        this.autoSyncEnabled = autoSyncEnabled;
      }
      
      if (syncIntervalMinutes !== undefined && syncIntervalMinutes > 0) {
        this.syncIntervalMinutes = syncIntervalMinutes;
      }

      // Save configuration
      await chrome.storage.sync.set({
        sync_auto_enabled: this.autoSyncEnabled,
        sync_interval_minutes: this.syncIntervalMinutes
      });

      // Restart auto sync if enabled
      if (this.autoSyncEnabled) {
        await this.startAutoSyncInternal();
      } else {
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
          this.syncInterval = null;
        }
      }

      response({ success: true });
    } catch (error) {
      console.error("Failed to update sync configuration:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Get sync status
   */
  async getStatus(request, response) {
    try {
      const status = {
        isInitialized: this.isInitialized,
        autoSyncEnabled: this.autoSyncEnabled,
        syncIntervalMinutes: this.syncIntervalMinutes,
        lastSyncTimestamp: this.lastSyncTimestamp,
        isManualSyncInProgress: this.isManualSyncInProgress,
        nextSyncTime: this.autoSyncEnabled && this.syncInterval ? 
          new Date(Date.now() + (this.syncIntervalMinutes * 60 * 1000)).toISOString() : null
      };
      
      response({ success: true, status });
    } catch (error) {
      console.error("Failed to get sync status:", error);
      response({ success: false, error: error.message });
    }
  }

  /**
   * Perform automatic synchronization
   */
  async performAutoSync() {
    try {
      if (this.isManualSyncInProgress) {
        console.log("Skipping auto sync - manual sync in progress");
        return;
      }

      await this.performSync();
    } catch (error) {
      console.error("Auto sync failed:", error);
    }
  }

  /**
   * Perform the actual synchronization
   */
  async performSync() {
    try {
      // Check if database provider factory is available
      if (!databaseProviderFactory) {
        throw new Error("Database provider factory not available");
      }

      // Check if auto-sync is enabled
      const settings = await chrome.storage.sync.get(['auto_sync_enabled']);
      if (!settings.auto_sync_enabled) {
        console.log("Auto-sync is disabled, skipping sync");
        return { success: true, synced: 0, conflicts: 0, message: "Auto-sync disabled" };
      }

      // Get available providers
      const availableProviders = await databaseProviderFactory.getAvailableProviders();
      const indexedDBProvider = availableProviders.find(p => p.id === 'indexeddb');
      const supabaseProvider = availableProviders.find(p => p.id === 'supabase');
      
      // Check if both providers are available
      if (!indexedDBProvider || !indexedDBProvider.isAvailable) {
        throw new Error("IndexedDB provider not available");
      }
      
      if (!supabaseProvider || !supabaseProvider.isAvailable) {
        console.log("Supabase provider not configured, skipping auto-sync");
        return { success: true, synced: 0, conflicts: 0, message: "Supabase not configured" };
      }

      console.log("Starting automatic sync between IndexedDB and Supabase...");
      
      // Perform bidirectional sync between IndexedDB and Supabase
      const syncResult = await databaseProviderFactory.syncProviders('indexeddb', 'supabase');
      
      if (syncResult) {
        // Update last sync timestamp
        this.lastSyncTimestamp = Date.now();
        await chrome.storage.sync.set({ sync_last_timestamp: this.lastSyncTimestamp });
        
        console.log("Auto-sync completed successfully");
        return { success: true, synced: 1, conflicts: 0, message: "Sync completed successfully" };
      } else {
        throw new Error("Sync operation returned false");
      }
    } catch (error) {
      console.error("Auto-sync failed:", error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    try {
      const result = await chrome.storage.sync.get([
        'sync_last_timestamp',
        'sync_success_count',
        'sync_error_count'
      ]);

      return {
        lastSyncTimestamp: result.sync_last_timestamp || 0,
        successCount: result.sync_success_count || 0,
        errorCount: result.sync_error_count || 0
      };
    } catch (error) {
      console.error("Failed to get sync stats:", error);
      return null;
    }
  }

  /**
   * Update sync statistics
   */
  async updateSyncStats(success) {
    try {
      const stats = await this.getSyncStats();
      if (stats) {
        if (success) {
          stats.successCount++;
        } else {
          stats.errorCount++;
        }
        
        await chrome.storage.sync.set({
          sync_success_count: stats.successCount,
          sync_error_count: stats.errorCount
        });
      }
    } catch (error) {
      console.error("Failed to update sync stats:", error);
    }
  }

  /**
   * Check if sync is needed based on last sync time
   */
  shouldSync() {
    if (!this.autoSyncEnabled) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTimestamp;
    const syncIntervalMs = this.syncIntervalMinutes * 60 * 1000;

    return timeSinceLastSync >= syncIntervalMs;
  }

  /**
   * Schedule next sync
   */
  scheduleNextSync() {
    if (this.autoSyncEnabled && !this.syncInterval) {
      this.startAutoSyncInternal();
    }
  }

  /**
   * Handle Chrome storage changes
   */
  onStorageChanged(changes, namespace) {
    if (namespace === 'sync') {
      // React to relevant storage changes
      if (changes.auto_sync_enabled) {
        const newValue = changes.auto_sync_enabled.newValue;
        if (newValue !== this.autoSyncEnabled) {
          if (newValue) {
            this.startAutoSync({}, () => {});
          } else {
            this.stopAutoSync({}, () => {});
          }
        }
      }
      
      if (changes.sync_interval_minutes) {
        const newInterval = changes.sync_interval_minutes.newValue;
        if (newInterval && newInterval !== this.syncIntervalMinutes) {
          this.syncIntervalMinutes = newInterval;
          if (this.autoSyncEnabled) {
            this.startAutoSyncInternal();
          }
        }
      }
    }
  }

  /**
   * Get all sync-related storage keys (Chrome 130+)
   * Useful for debugging and comprehensive sync operations
   * @returns {Promise<string[]>} Array of sync-related storage keys
   */
  async getSyncRelatedKeys() {
    try {
      const allKeys = await chrome.storage.sync.getKeys();
      // Filter keys that are sync-related
      return allKeys.filter(key => 
        key.startsWith('sync_') || 
        key.includes('Timestamp') || 
        key.includes('_enabled') ||
        key.includes('supabase_')
      );
    } catch (error) {
      console.error('Failed to get sync-related keys:', error);
      return [];
    }
  }

  /**
   * Get comprehensive sync status including all relevant keys
   * @returns {Promise<Object>} Comprehensive sync status
   */
  async getComprehensiveSyncStatus() {
    try {
      const syncKeys = await this.getSyncRelatedKeys();
      const syncData = await chrome.storage.sync.get(syncKeys);
      
      return {
        keys: syncKeys,
        data: syncData,
        autoSyncEnabled: this.autoSyncEnabled,
        syncIntervalMinutes: this.syncIntervalMinutes,
        lastSyncTimestamp: this.lastSyncTimestamp,
        lastSyncDate: new Date(this.lastSyncTimestamp).toISOString()
      };
    } catch (error) {
      console.error('Failed to get comprehensive sync status:', error);
      return {
        keys: [],
        data: {},
        autoSyncEnabled: false,
        syncIntervalMinutes: 60,
        lastSyncTimestamp: 0,
        lastSyncDate: null
      };
    }
  }
}

// Create singleton instance
const syncManager = new SyncManager();

// Export the sync manager instance
export const SyncManagerInstance = syncManager;

// Make SyncManager available globally
globalThis.SyncManager = SyncManagerInstance;

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  SyncManagerInstance.onStorageChanged(changes, namespace);
}); 