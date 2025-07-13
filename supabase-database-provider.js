/**
 * Supabase Database Provider for YouTube Watch History
 * Implements PostgreSQL storage using Supabase PostgREST API
 * Uses pure HTTP requests to avoid service worker restrictions
 */

import { credentialStorage } from './credential-storage.js';

/**
 * Supabase Database Provider
 * Provides PostgreSQL storage for YouTube watch history data via PostgREST API
 */
export class SupabaseDatabaseProvider {
  constructor() {
    this.isInitialized = false;
    this.isConnected = false;
    this.tableName = 'youtube_watch_history';
    this.credentials = null;
    this.baseUrl = null;
    this.apiKey = null;
    this.jwtToken = null;
  }

  /**
   * Ensure timestamp is a valid integer for bigint compatibility
   * @param {number} timestamp - Timestamp value
   * @returns {number} Integer timestamp
   */
  normalizeTimestamp(timestamp) {
    if (timestamp == null || isNaN(timestamp)) {
      return Date.now();
    }
    return Math.floor(Number(timestamp));
  }

  /**
   * Initialize the Supabase connection
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    try {
      console.log('Initializing Supabase provider...');
      
      // Get stored credentials
      this.credentials = await credentialStorage.getCredentials();
      if (!this.credentials) {
        console.log('No Supabase credentials found');
        return false;
      }

      // Set up API configuration
      this.baseUrl = this.credentials.supabaseUrl;
      this.apiKey = this.credentials.apiKey;
      this.jwtToken = this.credentials.jwtToken;

      // Test connection and ensure schema
      await this.ensureSchema();
      
      this.isInitialized = true;
      this.isConnected = true;
      
      console.log('Supabase provider initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase provider:', error);
      this.isInitialized = false;
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Ensure database schema exists
   * @private
   */
  async ensureSchema() {
    try {
      // Check if table exists by trying to select from it
      const response = await this.makeRequest('GET', `/${this.tableName}?select=count&limit=1`);
      
      if (response.ok) {
        console.log('Supabase schema verified');
        return;
      }

      // If table doesn't exist, we need to create it
      // This would typically be done via SQL in the Supabase dashboard
      console.warn('Table may not exist. Please ensure the table is created in Supabase:');
      console.warn(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          str_ident VARCHAR(255) PRIMARY KEY,
          int_timestamp BIGINT NOT NULL,
          str_title TEXT,
          int_count INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_timestamp 
        ON ${this.tableName} (int_timestamp);
        
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at 
        ON ${this.tableName} (created_at);
      `);
      
    } catch (error) {
      console.error('Failed to ensure schema:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request to Supabase PostgREST API
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object} body - Request body
   * @param {Object} headers - Additional headers
   * @returns {Promise<Response>} Fetch response
   */
  async makeRequest(method, path, body = null, headers = {}) {
    const url = `${this.baseUrl}/rest/v1${path}`;
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.jwtToken || this.apiKey}`,
      'Prefer': 'return=representation',
      ...headers
    };

    const config = {
      method,
      headers: requestHeaders
    };

    if (body && (method === 'POST' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      if (!this.baseUrl || !this.apiKey) {
        return false;
      }
      
      // Simple test query - try to access the table
      const response = await this.makeRequest('GET', `/${this.tableName}?select=count&limit=1`);
      
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get a single video record by ID
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object|null>} Video record or null
   */
  async getVideo(videoId) {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const response = await this.makeRequest('GET', `/${this.tableName}?str_ident=eq.${videoId}&select=str_ident,int_timestamp,str_title,int_count&limit=1`);
      
      if (!response.ok) {
        throw new Error(`Failed to get video: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        strIdent: row.str_ident,
        intTimestamp: parseInt(row.int_timestamp),
        strTitle: row.str_title,
        intCount: parseInt(row.int_count)
      };
    } catch (error) {
      console.error('Failed to get video:', error);
      throw error;
    }
  }

  /**
   * Store or update a video record
   * @param {Object} video - Video data
   * @param {string} video.strIdent - YouTube video ID
   * @param {number} video.intTimestamp - Timestamp
   * @param {string} video.strTitle - Video title
   * @param {number} video.intCount - View count
   * @returns {Promise<boolean>} Success status
   */
  async putVideo(video) {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const { strIdent, intTimestamp, strTitle, intCount = 1 } = video;

      // Use upsert with conflict resolution
      const videoData = {
        str_ident: strIdent,
        int_timestamp: this.normalizeTimestamp(intTimestamp),
        str_title: strTitle,
        int_count: intCount,
        updated_at: new Date().toISOString()
      };

      const response = await this.makeRequest('POST', `/${this.tableName}`, videoData, {
        'Prefer': 'resolution=merge-duplicates'
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to put video:', error);
      throw error;
    }
  }

  /**
   * Get all video records
   * @returns {Promise<Array>} Array of video records
   */
  async getAllVideos() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const allVideos = [];
      let offset = 0;
      const limit = 1000; // Use reasonable batch size
      let hasMore = true;

      while (hasMore) {
        const response = await this.makeRequest('GET', `/${this.tableName}?select=str_ident,int_timestamp,str_title,int_count&order=int_timestamp.desc&limit=${limit}&offset=${offset}`);
        
        if (!response.ok) {
          throw new Error(`Failed to get all videos: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          const videos = data.map(row => ({
            strIdent: row.str_ident,
            intTimestamp: parseInt(row.int_timestamp),
            strTitle: row.str_title,
            intCount: parseInt(row.int_count)
          }));
          
          allVideos.push(...videos);
          offset += limit;
          
          // If we got fewer records than the limit, we've reached the end
          if (data.length < limit) {
            hasMore = false;
          }
        }
      }

      console.log(`Retrieved ${allVideos.length} videos from Supabase (paginated)`);
      return allVideos;
    } catch (error) {
      console.error('Failed to get all videos:', error);
      throw error;
    }
  }

  /**
   * Get video count
   * @returns {Promise<number>} Total number of videos
   */
  async getVideoCount() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const response = await this.makeRequest('GET', `/${this.tableName}?select=count`, null, {
        'Prefer': 'count=exact'
      });

      if (!response.ok) {
        throw new Error(`Failed to get video count: ${response.status}`);
      }

      const countHeader = response.headers.get('Content-Range');
      if (countHeader) {
        const match = countHeader.match(/\/(\d+)$/);
        if (match) {
          return parseInt(match[1]);
        }
      }

      // Fallback: get all and count
      const data = await response.json();
      return data.length;
    } catch (error) {
      console.error('Failed to get video count:', error);
      throw error;
    }
  }

  /**
   * Clear all video records
   * @returns {Promise<boolean>} Success status
   */
  async clearAllVideos() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const response = await this.makeRequest('DELETE', `/${this.tableName}?str_ident=neq.`);
      
      console.log('All videos cleared from Supabase');
      return response.ok;
    } catch (error) {
      console.error('Failed to clear all videos:', error);
      throw error;
    }
  }

  /**
   * Import multiple videos (batch operation)
   * @param {Array} videos - Array of video objects
   * @returns {Promise<boolean>} Success status
   */
  async importVideos(videos) {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      if (!videos || videos.length === 0) {
        return true;
      }

      // Prepare data for batch insert
      const videoData = videos.map(video => ({
        str_ident: video.strIdent,
        int_timestamp: this.normalizeTimestamp(video.intTimestamp),
        str_title: video.strTitle,
        int_count: video.intCount || 1,
        updated_at: new Date().toISOString()
      }));

      // PostgREST supports batch operations
      const response = await this.makeRequest('POST', `/${this.tableName}`, videoData, {
        'Prefer': 'resolution=merge-duplicates'
      });

      console.log(`Imported ${videos.length} videos to Supabase`);
      return response.ok;
    } catch (error) {
      console.error('Failed to import videos:', error);
      throw error;
    }
  }

  /**
   * Search videos by title
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Array of matching video records
   */
  async searchVideos(query, limit = 100) {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const response = await this.makeRequest('GET', `/${this.tableName}?str_title=ilike.*${encodeURIComponent(query)}*&select=str_ident,int_timestamp,str_title,int_count&order=int_timestamp.desc&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to search videos: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map(row => ({
        strIdent: row.str_ident,
        intTimestamp: parseInt(row.int_timestamp),
        strTitle: row.str_title,
        intCount: parseInt(row.int_count)
      }));
    } catch (error) {
      console.error('Failed to search videos:', error);
      throw error;
    }
  }

  /**
   * Get videos by date range
   * @param {number} startTimestamp - Start timestamp
   * @param {number} endTimestamp - End timestamp
   * @returns {Promise<Array>} Array of video records
   */
  async getVideosByDateRange(startTimestamp, endTimestamp) {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const allVideos = [];
      let offset = 0;
      const limit = 1000; // Use reasonable batch size
      let hasMore = true;

      while (hasMore) {
        const response = await this.makeRequest('GET', `/${this.tableName}?int_timestamp=gte.${this.normalizeTimestamp(startTimestamp)}&int_timestamp=lte.${this.normalizeTimestamp(endTimestamp)}&select=str_ident,int_timestamp,str_title,int_count&order=int_timestamp.desc&limit=${limit}&offset=${offset}`);
        
        if (!response.ok) {
          throw new Error(`Failed to get videos by date range: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          const videos = data.map(row => ({
            strIdent: row.str_ident,
            intTimestamp: parseInt(row.int_timestamp),
            strTitle: row.str_title,
            intCount: parseInt(row.int_count)
          }));
          
          allVideos.push(...videos);
          offset += limit;
          
          // If we got fewer records than the limit, we've reached the end
          if (data.length < limit) {
            hasMore = false;
          }
        }
      }

      console.log(`Retrieved ${allVideos.length} videos from Supabase for date range (paginated)`);
      return allVideos;
    } catch (error) {
      console.error('Failed to get videos by date range:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStatistics() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      // Get count
      const countResponse = await this.makeRequest('GET', `/${this.tableName}?select=count`, null, {
        'Prefer': 'count=exact'
      });

      let totalVideos = 0;
      const countHeader = countResponse.headers.get('Content-Range');
      if (countHeader) {
        const match = countHeader.match(/\/(\d+)$/);
        if (match) {
          totalVideos = parseInt(match[1]);
        }
      }

      // Get min/max timestamps and sum of counts
      const statsResponse = await this.makeRequest('GET', `/${this.tableName}?select=int_timestamp,int_count&order=int_timestamp.asc&limit=1`);
      const maxStatsResponse = await this.makeRequest('GET', `/${this.tableName}?select=int_timestamp,int_count&order=int_timestamp.desc&limit=1`);

      const oldestData = await statsResponse.json();
      const newestData = await maxStatsResponse.json();

      // For total views, we need to sum all int_count values with pagination
      // PostgREST doesn't have built-in aggregation, so we'll paginate through all records
      let totalViews = 0;
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const allVideosResponse = await this.makeRequest('GET', `/${this.tableName}?select=int_count&limit=${limit}&offset=${offset}`);
        
        if (!allVideosResponse.ok) {
          throw new Error(`Failed to get video counts for statistics: ${allVideosResponse.status}`);
        }
        
        const allVideos = await allVideosResponse.json();
        
        if (allVideos.length === 0) {
          hasMore = false;
        } else {
          totalViews += allVideos.reduce((sum, video) => sum + (video.int_count || 1), 0);
          offset += limit;
          
          // If we got fewer records than the limit, we've reached the end
          if (allVideos.length < limit) {
            hasMore = false;
          }
        }
      }

      return {
        totalVideos,
        oldestTimestamp: oldestData.length > 0 ? parseInt(oldestData[0].int_timestamp) : 0,
        newestTimestamp: newestData.length > 0 ? parseInt(newestData[0].int_timestamp) : 0,
        totalViews,
        avgViewsPerVideo: totalVideos > 0 ? totalViews / totalVideos : 0
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   * @returns {Promise<boolean>} Success status
   */
  async close() {
    try {
      // HTTP connections don't need explicit closing
      this.isConnected = false;
      this.baseUrl = null;
      this.apiKey = null;
      this.jwtToken = null;
      
      console.log('Supabase provider closed');
      return true;
    } catch (error) {
      console.error('Failed to close Supabase provider:', error);
      return false;
    }
  }

  /**
   * Get provider information
   * @returns {Object} Provider info
   */
  getProviderInfo() {
    return {
      name: 'Supabase',
      type: 'remote',
      isConnected: this.isConnected,
      isInitialized: this.isInitialized,
      url: this.baseUrl,
      tableName: this.tableName
    };
  }
}

// Create singleton instance
export const supabaseDatabaseProvider = new SupabaseDatabaseProvider(); 