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
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Validate API key format and strength
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if valid
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // Basic validation for Supabase API key format
    if (apiKey.length < 100) {
      console.warn('API key appears to be too short for a Supabase key');
      return false;
    }
    
    
    return true;
  }

  /**
   * Validate Supabase URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  validateSupabaseUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      
      // Check for HTTPS (required for production)
      if (urlObj.protocol !== 'https:' && !url.includes('localhost')) {
        console.warn('Supabase URL should use HTTPS in production');
        return false;
      }
      
      // Check for valid Supabase domain or localhost
      if (!urlObj.hostname.includes('supabase.co') && !urlObj.hostname.includes('localhost')) {
        console.warn('URL does not appear to be a valid Supabase URL');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Invalid URL format:', error);
      return false;
    }
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
      // Get stored credentials
      this.credentials = await credentialStorage.getCredentials();
      if (!this.credentials) {
        console.log('No Supabase credentials found');
        return false;
      }

      // Validate credentials
      if (!this.validateSupabaseUrl(this.credentials.supabaseUrl)) {
        console.error('Invalid Supabase URL format');
        return false;
      }

      if (!this.validateApiKey(this.credentials.apiKey)) {
        console.error('Invalid API key format');
        return false;
      }

      // Set up API configuration
      this.baseUrl = this.credentials.supabaseUrl;
      this.apiKey = this.credentials.apiKey;

      // Test connection and ensure schema
      await this.ensureSchema();
      
      this.isInitialized = true;
      this.isConnected = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase provider:', error);
      this.isInitialized = false;
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Check if the database table exists
   * @returns {Promise<boolean>} True if table exists and is accessible
   */
  async checkTableExists() {
    try {
      if (!this.baseUrl || !this.apiKey) {
        return false;
      }
      
      // Check if table exists by trying to select from it
      const response = await this.makeRequest('GET', `/${this.tableName}?select=count&limit=1`);
      return response.ok;
    } catch (error) {
      console.debug('Table existence check failed:', error);
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
        console.log('✅ Database table exists and is accessible');
        return;
      }

      // If table doesn't exist, we need to create it
      // PostgREST cannot execute DDL statements - users must create the schema manually
      console.warn('❌ Table does not exist in your Supabase database.');
      console.warn('');
      console.warn('🔧 SETUP REQUIRED: Create the database table');
      console.warn('');
      console.warn('Option 1 (Recommended): Use Supabase SQL Editor');
      console.warn('1. Go to your Supabase project dashboard');
      console.warn('2. Open SQL Editor');
      console.warn('3. Copy and run the SQL below');
      console.warn('');
      console.warn('Option 2: Use Supabase CLI');
      console.warn('1. Install Supabase CLI: https://supabase.com/docs/guides/cli');
      console.warn('2. Run: supabase migration new create_youtube_watchmarker_table');
      console.warn('3. Copy the SQL below into the migration file');
      console.warn('4. Run: supabase db push');
      console.warn('');
      console.warn('📋 COPY THIS SQL:');
      console.warn('================================================================================');
      console.warn(`
-- YouTube Watchmarker Table Schema
-- Run this SQL in your Supabase SQL Editor or via CLI migration

-- Create main table for storing YouTube watch history
CREATE TABLE IF NOT EXISTS ${this.tableName} (
  str_ident VARCHAR(255) PRIMARY KEY,
  int_timestamp BIGINT NOT NULL,
  str_title TEXT,
  int_count INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_${this.tableName}_timestamp 
ON ${this.tableName} (int_timestamp);

CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at 
ON ${this.tableName} (created_at);

-- Add full-text search index for video titles
CREATE INDEX IF NOT EXISTS idx_${this.tableName}_title_search 
ON ${this.tableName} USING gin(to_tsvector('english', str_title));

-- Add data validation constraints
ALTER TABLE ${this.tableName} 
ADD CONSTRAINT IF NOT EXISTS check_positive_count CHECK (int_count > 0);

ALTER TABLE ${this.tableName} 
ADD CONSTRAINT IF NOT EXISTS check_valid_timestamp CHECK (int_timestamp > 0);

ALTER TABLE ${this.tableName} 
ADD CONSTRAINT IF NOT EXISTS check_title_length CHECK (char_length(str_title) <= 1000);

-- Verify table creation
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = '${this.tableName}';
      `);
      console.warn('================================================================================');
      console.warn('');
      console.warn('📊 TABLE FEATURES:');
      console.warn('✅ Primary key on video ID');
      console.warn('✅ Timestamp indexing for performance');
      console.warn('✅ Full-text search on video titles');
      console.warn('✅ Data validation constraints');
      console.warn('✅ Automatic timestamps');
      console.warn('');
      console.warn('⚠️  IMPORTANT: After running the SQL, refresh this page to verify the setup.');
      
      throw new Error('Database table does not exist. Please create it using the SQL above.');
      
    } catch (error) {
      if (error.message.includes('Database table does not exist')) {
        throw error;
      }
      console.error('Failed to ensure schema:', error);
      throw error;
    }
  }

  /**
   * Retry mechanism for failed requests
   * @param {Function} requestFn - Function to retry
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<Response>} Response from successful request
   */
  async retryRequest(requestFn, retries = this.maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if retryable
   */
  isRetryableError(error) {
    // Retry on network errors or temporary server errors
    return error.message.includes('NetworkError') || 
           error.message.includes('HTTP 5') || 
           error.message.includes('timeout');
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
    
    // Security headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Prefer': 'return=representation',
      'X-Client-Info': 'youtube-watchmarker-extension',
      // Add security headers
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...headers
    };

    const config = {
      method,
      headers: requestHeaders,
      // Add timeout for security
      signal: AbortSignal.timeout(30000) // 30 second timeout
    };

    if (body && (method === 'POST' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    const requestFn = async () => {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorText = await response.text();
          
          // Log security-relevant errors
          if (response.status === 401) {
            console.error('Authentication failed - check API key');
          } else if (response.status === 403) {
            console.error('Access forbidden - check API key and database permissions');
          } else if (response.status === 429) {
            console.error('Rate limit exceeded - too many requests');
          }
          
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return response;
      } catch (error) {
        console.error('Request failed:', error);
        throw error;
      }
    };

    return this.retryRequest(requestFn);
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
   * Delete a single video record by ID
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteVideo(videoId) {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const response = await this.makeRequest('DELETE', `/${this.tableName}?str_ident=eq.${videoId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to delete video: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete video:', error);
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