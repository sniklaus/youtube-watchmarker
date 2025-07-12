import {
  AsyncSeries,
  createResponseCallback,
  BackgroundUtils,
} from "./utils.js";

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
    console.log("SyncManager.init called");
    
    if (this.isInitialized) {
      console.log("Sync manager already initialized");
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
          console.log("Sync manager initialization completed");
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
        'sync_auto_enabled',
        'sync_interval_minutes',
        'sync_last_timestamp'
      ]);

      this.autoSyncEnabled = result.sync_auto_enabled || false;
      this.syncIntervalMinutes = result.sync_interval_minutes || 60;
      this.lastSyncTimestamp = result.sync_last_timestamp || 0;

      console.log('Sync manager configuration loaded:', {
        autoSyncEnabled: this.autoSyncEnabled,
        syncIntervalMinutes: this.syncIntervalMinutes,
        lastSyncTimestamp: new Date(this.lastSyncTimestamp).toISOString()
      });

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
      await chrome.storage.sync.set({ sync_auto_enabled: true });
      
      await this.startAutoSyncInternal();
      
      console.log("Auto sync started");
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

    console.log(`Auto sync scheduled every ${this.syncIntervalMinutes} minutes`);
  }

  /**
   * Stop automatic synchronization
   */
  async stopAutoSync(request, response) {
    try {
      this.autoSyncEnabled = false;
      
      // Save configuration
      await chrome.storage.sync.set({ sync_auto_enabled: false });
      
      // Clear interval
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
      
      console.log("Auto sync stopped");
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
      
      console.log("Manual sync completed:", result);
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

      console.log("Sync configuration updated");
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

      console.log("Starting automatic sync...");
      await this.performSync();
      console.log("Automatic sync completed");
    } catch (error) {
      console.error("Auto sync failed:", error);
    }
  }

  /**
   * Perform the actual synchronization
   */
  async performSync() {
    return new Promise((resolve, reject) => {
      // Check if database provider is available
      const DatabaseProvider = globalThis.DatabaseProvider;
      if (!DatabaseProvider) {
        reject(new Error("Database provider not available"));
        return;
      }

      // Perform sync through database provider
      DatabaseProvider.syncDatabases({}, (response) => {
        if (response && !response.error) {
          // Update last sync timestamp
          this.lastSyncTimestamp = Date.now();
          chrome.storage.sync.set({ sync_last_timestamp: this.lastSyncTimestamp });
          
          resolve(response);
        } else {
          reject(new Error(response?.error || "Sync failed"));
        }
      }, (progress) => {
        console.log("Sync progress:", progress);
      });
    });
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
      if (changes.database_sync_enabled) {
        const newValue = changes.database_sync_enabled.newValue;
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