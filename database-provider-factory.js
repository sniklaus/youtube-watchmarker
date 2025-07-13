/**
 * Database Provider Factory
 * Manages switching between different database providers (IndexedDB, Supabase)
 */

import { supabaseDatabaseProvider } from './supabase-database-provider.js';
import { credentialStorage } from './credential-storage.js';

/**
 * IndexedDB Provider Wrapper
 * Wraps the existing IndexedDB functionality to match the provider interface
 */
class IndexedDBProvider {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.isInitialized = false;
    this.isConnected = false;
  }

  async init() {
    if (!this.databaseManager) {
      throw new Error('Database manager not set');
    }
    
    // If database is already open, we're good
    if (this.databaseManager.database) {
      this.isInitialized = true;
      this.isConnected = true;
      return true;
    }
    
    // If database manager exists but database isn't open yet, 
    // that's okay - it will be opened during database initialization
    // We just mark as initialized and will connect when database opens
    this.isInitialized = true;
    this.isConnected = false;
    return true;
  }

  async testConnection() {
    // Update connection status based on current database state
    this.isConnected = this.databaseManager && this.databaseManager.database !== null;
    return this.isConnected;
  }

  /**
   * Update connection status based on database state
   */
  updateConnectionStatus() {
    // More thorough connection checking
    const isDbOpen = this.databaseManager?.database !== null;
    const isDbInitialized = this.databaseManager?.isInitialized === true;
    
    // We're connected if database is open AND initialized
    this.isConnected = isDbOpen && isDbInitialized;
    
    // Log status for debugging
    if (!this.isConnected) {
      console.debug('IndexedDB connection status:', {
        isDbOpen,
        isDbInitialized,
        databaseExists: !!this.databaseManager?.database,
        managerInitialized: !!this.databaseManager?.isInitialized
      });
    }
  }

  async getVideo(videoId) {
    // Update connection status
    this.updateConnectionStatus();
    
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.databaseManager.database.transaction([this.databaseManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.databaseManager.STORE_NAME);
      const request = store.get(videoId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get video'));
      };
    });
  }

  async putVideo(video) {
    // Update connection status
    this.updateConnectionStatus();
    
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.databaseManager.database.transaction([this.databaseManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.databaseManager.STORE_NAME);
      
      // Check if video exists
      const getRequest = store.get(video.strIdent);
      
      getRequest.onsuccess = () => {
        const existingVideo = getRequest.result;
        let videoToStore = video;
        
        if (existingVideo) {
          // Merge with existing data, keeping the latest timestamp
          videoToStore = {
            ...existingVideo,
            ...video,
            intTimestamp: Math.max(existingVideo.intTimestamp || 0, video.intTimestamp || 0),
            intCount: Math.max(existingVideo.intCount || 1, video.intCount || 1)
          };
        }
        
        const putRequest = store.put(videoToStore);
        
        putRequest.onsuccess = () => {
          resolve(true);
        };
        
        putRequest.onerror = () => {
          reject(new Error('Failed to put video'));
        };
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to check existing video'));
      };
    });
  }

  async getAllVideos() {
    // Update connection status
    this.updateConnectionStatus();
    
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.databaseManager.database.transaction([this.databaseManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.databaseManager.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get all videos'));
      };
    });
  }

  async getVideoCount() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.databaseManager.database.transaction([this.databaseManager.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.databaseManager.STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result || 0);
      };

      request.onerror = () => {
        reject(new Error('Failed to get video count'));
      };
    });
  }

  async clearAllVideos() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.databaseManager.database.transaction([this.databaseManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.databaseManager.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('Failed to clear all videos'));
      };
    });
  }

  async importVideos(videos) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    if (!videos || videos.length === 0) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.databaseManager.database.transaction([this.databaseManager.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.databaseManager.STORE_NAME);
      
      let processed = 0;
      const total = videos.length;
      
      const processNext = () => {
        if (processed >= total) {
          resolve(true);
          return;
        }
        
        const video = videos[processed];
        
        // Check if video exists
        const getRequest = store.get(video.strIdent);
        
        getRequest.onsuccess = () => {
          const existingVideo = getRequest.result;
          let videoToStore = video;
          
          if (existingVideo) {
            // Merge with existing data, keeping the latest timestamp
            videoToStore = {
              ...existingVideo,
              ...video,
              intTimestamp: Math.max(existingVideo.intTimestamp || 0, video.intTimestamp || 0),
              intCount: Math.max(existingVideo.intCount || 1, video.intCount || 1)
            };
          }
          
          const putRequest = store.put(videoToStore);
          
          putRequest.onsuccess = () => {
            processed++;
            processNext();
          };
          
          putRequest.onerror = () => {
            reject(new Error(`Failed to import video ${processed + 1}`));
          };
        };
        
        getRequest.onerror = () => {
          reject(new Error(`Failed to check existing video ${processed + 1}`));
        };
      };
      
      processNext();
    });
  }

  async searchVideos(query, limit = 100) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const allVideos = await this.getAllVideos();
    const filteredVideos = allVideos.filter(video => 
      video.strTitle && video.strTitle.toLowerCase().includes(query.toLowerCase())
    );
    
    return filteredVideos.slice(0, limit);
  }

  async getVideosByDateRange(startTimestamp, endTimestamp) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const allVideos = await this.getAllVideos();
    return allVideos.filter(video => 
      video.intTimestamp >= startTimestamp && video.intTimestamp <= endTimestamp
    );
  }

  async getStatistics() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const allVideos = await this.getAllVideos();
    
    if (allVideos.length === 0) {
      return {
        totalVideos: 0,
        oldestTimestamp: 0,
        newestTimestamp: 0,
        totalViews: 0,
        avgViewsPerVideo: 0
      };
    }

    const timestamps = allVideos.map(v => v.intTimestamp).filter(t => t);
    const totalViews = allVideos.reduce((sum, v) => sum + (v.intCount || 1), 0);

    return {
      totalVideos: allVideos.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps),
      totalViews,
      avgViewsPerVideo: totalViews / allVideos.length
    };
  }

  async close() {
    this.isConnected = false;
    return true;
  }

  getProviderInfo() {
    return {
      name: 'IndexedDB',
      type: 'local',
      isConnected: this.isConnected,
      isInitialized: this.isInitialized
    };
  }
}

/**
 * Database Provider Factory
 * Manages different database providers and switching between them
 */
export class DatabaseProviderFactory {
  constructor() {
    this.currentProvider = null;
    this.providerType = null;
    this.indexedDBProvider = null;
    this.databaseManager = null;
  }

  /**
   * Set the database manager instance
   * @param {Object} databaseManager - Database manager instance
   */
  setDatabaseManager(databaseManager) {
    this.databaseManager = databaseManager;
    this.indexedDBProvider = new IndexedDBProvider(databaseManager);
  }

  /**
   * Get the current active provider
   * @returns {Object} Current provider instance
   */
  getCurrentProvider() {
    return this.currentProvider;
  }

  /**
   * Get the current provider type
   * @returns {string} Provider type ('indexeddb' or 'supabase')
   */
  getCurrentProviderType() {
    return this.providerType;
  }

  /**
   * Switch to IndexedDB provider
   * @param {boolean} savePreference - Whether to save this as user preference (default: true)
   * @returns {Promise<boolean>} Success status
   */
  async switchToIndexedDB(savePreference = true) {
    try {
      console.log('Switching to IndexedDB provider...');
      
      // Close current provider if different
      if (this.currentProvider && this.providerType !== 'indexeddb') {
        await this.currentProvider.close();
      }

      // Initialize IndexedDB provider
      const success = await this.indexedDBProvider.init();
      if (!success) {
        throw new Error('Failed to initialize IndexedDB provider');
      }

      this.currentProvider = this.indexedDBProvider;
      this.providerType = 'indexeddb';

      // Store provider preference only if requested
      if (savePreference) {
        await chrome.storage.local.set({ 
          database_provider: 'indexeddb' 
        });
      }

      console.log('Successfully switched to IndexedDB provider');
      return true;
    } catch (error) {
      console.error('Failed to switch to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Switch to Supabase provider
   * @returns {Promise<boolean>} Success status
   */
  async switchToSupabase() {
    try {
      console.log('Switching to Supabase provider...');
      
      // Check if credentials are available
      const hasCredentials = await credentialStorage.hasCredentials();
      if (!hasCredentials) {
        throw new Error('No Supabase credentials found. Please configure Supabase credentials first using the "Save Configuration" button.');
      }

      // Close current provider if different
      if (this.currentProvider && this.providerType !== 'supabase') {
        await this.currentProvider.close();
      }

      // Initialize Supabase provider
      const success = await supabaseDatabaseProvider.init();
      if (!success) {
        throw new Error('Failed to initialize Supabase provider. Please check your credentials and try again.');
      }

      // Test the connection
      const connectionTest = await supabaseDatabaseProvider.testConnection();
      if (!connectionTest) {
        throw new Error('Supabase connection test failed. Please verify your credentials.');
      }

      this.currentProvider = supabaseDatabaseProvider;
      this.providerType = 'supabase';

      // Store provider preference
      await chrome.storage.local.set({ 
        database_provider: 'supabase' 
      });

      console.log('Successfully switched to Supabase provider');
      return true;
    } catch (error) {
      console.error('Failed to switch to Supabase:', error);
      
      // If we failed to switch, make sure we fall back to IndexedDB
      if (this.providerType !== 'indexeddb') {
        console.log('Falling back to IndexedDB provider');
        await this.switchToIndexedDB(false); // Don't save preference when falling back
      }
      
      throw error; // Re-throw to let the caller handle the error message
    }
  }

  /**
   * Initialize the factory and set up the default provider
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    try {
      // Load saved provider preference
      const result = await chrome.storage.local.get(['database_provider']);
      const savedProvider = result.database_provider || 'indexeddb';

      console.log(`Initializing database factory with provider: ${savedProvider}`);

      // Try to initialize the saved provider
      if (savedProvider === 'supabase') {
        try {
          const success = await this.switchToSupabase();
          if (success) {
            return true;
          }
        } catch (error) {
          console.log('Supabase initialization failed, falling back to IndexedDB');
        }
        
        // Fall back to IndexedDB if Supabase fails, but don't save preference
        return await this.switchToIndexedDB(false);
      }

      // Default to IndexedDB (save preference since this is the default)
      return await this.switchToIndexedDB(true);
    } catch (error) {
      console.error('Failed to initialize database factory:', error);
      
      // Emergency fallback to IndexedDB
      try {
        return await this.switchToIndexedDB(false); // Don't save preference during emergency fallback
      } catch (fallbackError) {
        console.error('Emergency fallback failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Get available providers
   * @returns {Array} List of available providers
   */
  async getAvailableProviders() {
    const providers = [
      {
        id: 'indexeddb',
        name: 'Local Storage (IndexedDB)',
        description: 'Store data locally in your browser',
        isAvailable: true,
        isRemote: false
      }
    ];

    // Check if Supabase is available
    const hasSupabaseCredentials = await credentialStorage.hasCredentials();
    providers.push({
      id: 'supabase',
      name: 'Supabase (PostgreSQL)',
      description: 'Store data in Supabase cloud database',
      isAvailable: hasSupabaseCredentials,
      isRemote: true
    });

    return providers;
  }

  /**
   * Get current provider status
   * @returns {Object} Provider status information
   */
  getProviderStatus() {
    if (!this.currentProvider) {
      return {
        type: null,
        isConnected: false,
        isInitialized: false,
        info: null
      };
    }

    return {
      type: this.providerType,
      isConnected: this.currentProvider.isConnected,
      isInitialized: this.currentProvider.isInitialized,
      info: this.currentProvider.getProviderInfo()
    };
  }

  /**
   * Migrate data from one provider to another
   * @param {string} sourceProvider - Source provider type
   * @param {string} targetProvider - Target provider type
   * @returns {Promise<boolean>} Success status
   */
  async migrateData(sourceProvider, targetProvider) {
    try {
      if (sourceProvider === targetProvider) {
        console.log('Source and target providers are the same, no migration needed');
        return true;
      }

      console.log(`Migrating data from ${sourceProvider} to ${targetProvider}...`);

      // Get source provider instance
      let sourceProviderInstance;
      if (sourceProvider === 'indexeddb') {
        sourceProviderInstance = this.indexedDBProvider;
        await sourceProviderInstance.init();
      } else if (sourceProvider === 'supabase') {
        sourceProviderInstance = supabaseDatabaseProvider;
        await sourceProviderInstance.init();
      } else {
        throw new Error(`Unknown source provider: ${sourceProvider}`);
      }

      // Get target provider instance
      let targetProviderInstance;
      if (targetProvider === 'indexeddb') {
        targetProviderInstance = this.indexedDBProvider;
        await targetProviderInstance.init();
      } else if (targetProvider === 'supabase') {
        targetProviderInstance = supabaseDatabaseProvider;
        await targetProviderInstance.init();
      } else {
        throw new Error(`Unknown target provider: ${targetProvider}`);
      }

      // Get all data from source
      const sourceData = await sourceProviderInstance.getAllVideos();
      console.log(`Found ${sourceData.length} videos to migrate`);

      if (sourceData.length === 0) {
        console.log('No data to migrate');
        return true;
      }

      // Import data to target
      await targetProviderInstance.importVideos(sourceData);

      console.log(`Successfully migrated ${sourceData.length} videos from ${sourceProvider} to ${targetProvider}`);
      return true;
    } catch (error) {
      console.error('Data migration failed:', error);
      throw error;
    }
  }

  /**
   * Sync data between two providers (bidirectional merge)
   * @param {string} provider1 - First provider type
   * @param {string} provider2 - Second provider type
   * @returns {Promise<boolean>} Success status
   */
  async syncProviders(provider1, provider2) {
    try {
      if (provider1 === provider2) {
        console.log('Providers are the same, no sync needed');
        return true;
      }

      console.log(`Syncing data between ${provider1} and ${provider2}...`);

      // Get both providers
      const providers = {};
      
      for (const providerType of [provider1, provider2]) {
        if (providerType === 'indexeddb') {
          providers[providerType] = this.indexedDBProvider;
          await providers[providerType].init();
        } else if (providerType === 'supabase') {
          providers[providerType] = supabaseDatabaseProvider;
          await providers[providerType].init();
        } else {
          throw new Error(`Unknown provider: ${providerType}`);
        }
      }

      // Get all data from both providers
      const data1 = await providers[provider1].getAllVideos();
      const data2 = await providers[provider2].getAllVideos();

      console.log(`${provider1} has ${data1.length} videos, ${provider2} has ${data2.length} videos`);

      // Merge data (keep the most recent timestamp for each video)
      const mergedData = this.mergeVideoData(data1, data2);
      console.log(`Merged data contains ${mergedData.length} unique videos`);

      // Update both providers with merged data
      await providers[provider1].importVideos(mergedData);
      await providers[provider2].importVideos(mergedData);

      console.log(`Successfully synced data between ${provider1} and ${provider2}`);
      return true;
    } catch (error) {
      console.error('Data sync failed:', error);
      throw error;
    }
  }

  /**
   * Merge video data from two sources
   * @param {Array} data1 - First data set
   * @param {Array} data2 - Second data set
   * @returns {Array} Merged data
   */
  mergeVideoData(data1, data2) {
    const merged = new Map();

    // Add all videos from data1
    data1.forEach(video => {
      merged.set(video.strIdent, video);
    });

    // Merge with data2, keeping the most recent timestamp
    data2.forEach(video => {
      const existing = merged.get(video.strIdent);
      if (!existing) {
        merged.set(video.strIdent, video);
      } else {
        // Keep the video with the most recent timestamp
        const mergedVideo = {
          ...existing,
          ...video,
          intTimestamp: Math.max(existing.intTimestamp || 0, video.intTimestamp || 0),
          intCount: Math.max(existing.intCount || 1, video.intCount || 1),
          strTitle: video.strTitle || existing.strTitle // Prefer non-null title
        };
        merged.set(video.strIdent, mergedVideo);
      }
    });

    return Array.from(merged.values());
  }
}

// Create singleton instance
export const databaseProviderFactory = new DatabaseProviderFactory(); 