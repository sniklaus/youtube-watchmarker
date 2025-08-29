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
        this.activeControllers = new Set(); // Track active AbortControllers for cleanup
    }

    createTimeoutSignal(timeoutMs) {
        const controller = new AbortController();
        this.activeControllers.add(controller);

        const timeoutId = setTimeout(() => {
            controller.abort();
            this.activeControllers.delete(controller);
        }, timeoutMs);

        controller.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            this.activeControllers.delete(controller);
        });

        return controller.signal;
    }

    cleanup() {
        for (const controller of this.activeControllers) {
            try {
                controller.abort();
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        this.activeControllers.clear();
    }

    validateApiKey(apiKey) {
        return apiKey && typeof apiKey === 'string' && apiKey.length >= 100;
    }

    /**
     * Ensure database is connected
     * @private
     */
    ensureConnected() {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
    }

    /**
     * Validate Supabase URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    validateSupabaseUrl(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const isLocalhost = urlObj.hostname.includes('localhost');
            const isSupabase = urlObj.hostname.includes('supabase.co');

            if (!isHttps && !isLocalhost) return false;
            if (!isSupabase && !isLocalhost) return false;

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Ensure timestamp is a valid integer for bigint compatibility
     * @param {number} timestamp - Timestamp value
     * @returns {number} Integer timestamp
     */
    normalizeTimestamp(timestamp) {
        return timestamp == null || isNaN(timestamp) ? Date.now() : Math.floor(Number(timestamp));
    }

    /**
     * Initialize the Supabase connection
     * @returns {Promise<boolean>} Success status
     */
    async init() {
        try {
            console.log('🔄 Initializing Supabase provider...');

            // Get stored credentials
            this.credentials = await credentialStorage.getCredentials();
            if (!this.credentials) {
                console.log('ℹ️ No Supabase credentials found - provider will remain uninitialized');
                return false;
            }

            // Validate credentials
            if (!this.validateSupabaseUrl(this.credentials.supabaseUrl)) {
                console.error('❌ Invalid Supabase URL format:', this.credentials.supabaseUrl);
                return false;
            }

            if (!this.validateApiKey(this.credentials.apiKey)) {
                console.error('❌ Invalid API key format - key appears to be too short or invalid');
                return false;
            }

            // Set up API configuration
            this.baseUrl = this.credentials.supabaseUrl;
            this.apiKey = this.credentials.apiKey;

            console.log('🔗 Testing Supabase connection...');

            // Test connection and ensure schema
            await this.ensureSchema();

            this.isInitialized = true;
            this.isConnected = true;

            console.log('✅ Supabase provider initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase provider:', error.message);
            this.isInitialized = false;
            this.isConnected = false;

            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                console.error('💡 Check: Supabase URL, API key permissions, and extension host permissions');
            } else if (error.message.includes('Database table does not exist')) {
                console.error('💡 Create the database table using the SQL in ensureSchema() method');
            }

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
            const response = await this.makeRequest('GET', `/${this.tableName}?select=count&limit=1`);
            if (response.ok) {
                console.log('✅ Database table exists and is accessible');
                return;
            }

            console.error('❌ Table does not exist. Create it with this SQL:');
            console.error(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
  str_ident VARCHAR(255) PRIMARY KEY,
  int_timestamp BIGINT NOT NULL,
  str_title TEXT,
  int_count INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`);

            throw new Error('Database table does not exist. Please create it using the SQL above.');
        } catch (error) {
            if (error.message.includes('Database table does not exist')) throw error;
            console.error('Failed to ensure schema:', error.message);
            throw error;
        }
    }

    async retryRequest(requestFn, retries = this.maxRetries, attempt = 1) {
        try {
            return await requestFn();
        } catch (error) {
            if (retries > 0 && this.isRetryableError(error)) {
                const delay = Math.min(this.retryDelay * Math.pow(2, attempt - 1), 10000);
                console.log(`🔄 Retrying in ${delay}ms... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryRequest(requestFn, retries - 1, attempt + 1);
            }
            throw error;
        }
    }

    isRetryableError(error) {
        const message = error.message.toLowerCase();
        return message.includes('network') ||
            message.includes('timeout') ||
            message.includes('cors') ||
            message.includes('failed to fetch') ||
            message.includes('abort');
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
            // Add timeout for better reliability - using manual AbortController for better compatibility
            signal: this.createTimeoutSignal(60000) // 60 second timeout
        };

        if (body && (method === 'POST' || method === 'PATCH')) {
            config.body = JSON.stringify(body);
        }

        const requestFn = async () => {
            try {
                const response = await fetch(url, config);

                if (!response.ok) {
                    const errorText = await response.text();

                    if (response.status === 401) {
                        console.error('❌ Supabase Authentication failed - check your API key');
                    } else if (response.status === 403) {
                        console.error('❌ Supabase Access forbidden - check API key permissions');
                    } else if (response.status === 429) {
                        console.error('❌ Supabase Rate limit exceeded - wait before retrying');
                    } else if (response.status >= 500) {
                        console.error('❌ Supabase Server error - check Supabase status');
                    }

                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                return response;
            } catch (error) {
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    console.error('❌ Network error - check CORS, URL, and connectivity');
                } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
                    console.error('❌ Request timed out - check network and Supabase status');
                } else {
                    console.error('❌ Request failed:', error.message);
                }
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
            console.error('Supabase connection test failed:', error.message);
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
            this.ensureConnected();

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
            console.error('Failed to get video:', error.message);
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
            this.ensureConnected();

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
            console.error('Failed to put video:', error.message);
            throw error;
        }
    }

    /**
     * Get all video records
     * @returns {Promise<Array>} Array of video records
     */
    async getAllVideos() {
        try {
            this.ensureConnected();

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
            console.error('Failed to get all videos:', error.message);
            throw error;
        }
    }

    /**
     * Get video count
     * @returns {Promise<number>} Total number of videos
     */
    async getVideoCount() {
        try {
            this.ensureConnected();

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
            console.error('Failed to get video count:', error.message);
            throw error;
        }
    }

    /**
     * Clear all video records
     * @returns {Promise<boolean>} Success status
     */
    async clearAllVideos() {
        try {
            this.ensureConnected();

            const response = await this.makeRequest('DELETE', `/${this.tableName}?str_ident=neq.`);

            console.log('All videos cleared from Supabase');
            return response.ok;
        } catch (error) {
            console.error('Failed to clear all videos:', error.message);
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
            this.ensureConnected();

            const response = await this.makeRequest('DELETE', `/${this.tableName}?str_ident=eq.${videoId}`);

            if (!response.ok) {
                throw new Error(`Failed to delete video: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Failed to delete video:', error.message);
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
            this.ensureConnected();

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
            console.error('Failed to import videos:', error.message);
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
            this.ensureConnected();

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
            console.error('Failed to search videos:', error.message);
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
            this.ensureConnected();

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
            console.error('Failed to get videos by date range:', error.message);
            throw error;
        }
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    async getStatistics() {
        try {
            if (!this.isConnected) throw new Error('Database not connected');

            // Get total count from header
            const countResponse = await this.makeRequest('GET', `/${this.tableName}?select=count`, null, {
                'Prefer': 'count=exact'
            });

            const countHeader = countResponse.headers.get('Content-Range');
            const totalVideos = countHeader ? parseInt(countHeader.match(/\/(\d+)$/)?.[1] || '0') : 0;

            // Get timestamp range
            const oldestResponse = await this.makeRequest('GET', `/${this.tableName}?select=int_timestamp&order=int_timestamp.asc&limit=1`);
            const newestResponse = await this.makeRequest('GET', `/${this.tableName}?select=int_timestamp&order=int_timestamp.desc&limit=1`);

            const oldestData = await oldestResponse.json();
            const newestData = await newestResponse.json();

            return {
                totalVideos,
                oldestTimestamp: oldestData.length > 0 ? parseInt(oldestData[0].int_timestamp) : 0,
                newestTimestamp: newestData.length > 0 ? parseInt(newestData[0].int_timestamp) : 0,
                totalViews: totalVideos, // Simplified: assume 1 view per video
                avgViewsPerVideo: 1
            };
        } catch (error) {
            console.error('Failed to get statistics:', error.message);
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
            console.error('Failed to close Supabase provider:', error.message);
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