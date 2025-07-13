/**
 * Constants and configuration values for YouTube Watchmarker extension
 * Centralizes all magic numbers, storage keys, and configuration values
 * 
 * @fileoverview Centralized constants for the YouTube Watchmarker extension
 * @author YouTube Watchmarker Team
 * @version 1.0.0
 */

/**
 * @typedef {Object} DatabaseConfig
 * @property {string} NAME - Database name
 * @property {number} VERSION - Database version
 * @property {string} STORE_NAME - Object store name
 * @property {Object} INDEXES - Index definitions
 * @property {string} INDEXES.IDENT - Identity index name
 * @property {string} INDEXES.TIMESTAMP - Timestamp index name
 */

/**
 * @typedef {Object} VideoRecord
 * @property {string} strIdent - YouTube video ID
 * @property {number} intTimestamp - Last watched timestamp
 * @property {string} strTitle - Video title
 * @property {number} intCount - View count
 */

/**
 * @typedef {Object} SyncConfig
 * @property {Object} PROVIDERS - Available sync providers
 * @property {Object} INTERVALS - Sync interval constants
 * @property {Object} LIMITS - Sync limitations
 */

/**
 * Database configuration constants
 * @type {DatabaseConfig}
 */
export const DATABASE = {
  NAME: "Database",
  VERSION: 401,
  STORE_NAME: "storeDatabase",
  INDEXES: {
    IDENT: "strIdent",
    TIMESTAMP: "intTimestamp"
  }
};

// Storage Keys
export const STORAGE_KEYS = {
  // Settings
  SETTINGS_PREFIX: "extensions.Youwatch.",
  
  // Timestamps
  HISTORY_TIMESTAMP: "extensions.Youwatch.History.intTimestamp",
  YOUTUBE_TIMESTAMP: "extensions.Youwatch.Youtube.intTimestamp", 
  LIKED_TIMESTAMP: "extensions.Youwatch.Liked.intTimestamp",
  
  // Sync Configuration
  SYNC_ENABLED: "sync_enabled",
  SYNC_PROVIDER: "sync_provider",
  SYNC_INTERVAL: "sync_interval",
  LAST_SYNC_TIMESTAMP: "last_sync_timestamp",
  
  // Database Provider
  DATABASE_PROVIDER: "database_provider",
  
  // Visualization Settings
  VISUALIZATION: {
    FADEOUT: "idVisualization_Fadeout",
    GRAYOUT: "idVisualization_Grayout", 
    SHOWBADGE: "idVisualization_Showbadge",
    SHOWDATE: "idVisualization_Showdate",
    HIDEPROGRESS: "idVisualization_Hideprogress",
    SHOWPUBLISHDATE: "idVisualization_Showpublishdate"
  },
  
  // Condition Settings
  CONDITIONS: {
    YOURATING: "idCondition_Yourating",
    BROWSER: "idCondition_Browser",
    LIKED: "idCondition_Liked"
  },
  
  // Stylesheet Settings
  STYLESHEETS: {
    FADEOUT: "stylesheet_Fadeout",
    GRAYOUT: "stylesheet_Grayout",
    SHOWBADGE: "stylesheet_Showbadge", 
    SHOWDATE: "stylesheet_Showdate",
    HIDEPROGRESS: "stylesheet_Hideprogress"
  },
  
  // Supabase Configuration
  SUPABASE: {
    URL: "supabaseUrl",
    API_KEY: "apiKey", 
    JWT_TOKEN: "jwtToken"
  }
};

// YouTube URLs and Patterns
export const YOUTUBE = {
  URLS: {
    WATCH: "https://www.youtube.com/watch?v=",
    SHORTS: "https://www.youtube.com/shorts/",
    MOBILE_WATCH: "https://m.youtube.com/watch?v=",
    HISTORY: "https://www.youtube.com/feed/history",
    LIKED: "https://www.youtube.com/playlist?list=LL"
  },
  
  PATTERNS: {
    VIDEO_ID: /^[a-zA-Z0-9_-]{11}$/,
    TITLE_SUFFIX: " - YouTube"
  },
  
  API: {
    BASE: "https://www.youtube.com/youtubei/v1/",
    ENDPOINTS: {
      BROWSE: "browse",
      NEXT: "next"
    }
  }
};

// Sync Configuration
export const SYNC = {
  PROVIDERS: {
    CHROME: "chrome",
    SUPABASE: "supabase", 
    GOOGLE_DRIVE: "googledrive",
    CUSTOM: "custom",
    INDEXEDDB: "indexeddb"
  },
  
  INTERVALS: {
    DEFAULT: 300000, // 5 minutes
    HOURLY: 3600000, // 1 hour
    DAILY: 86400000  // 24 hours
  },
  
  LIMITS: {
    CHROME_STORAGE_QUOTA: 102400, // 100KB
    CHROME_STORAGE_ITEM_MAX: 8192, // 8KB per item
    BATCH_SIZE: 100
  }
};

// Message Actions
export const ACTIONS = {
  // YouTube Actions
  YOUTUBE_LOOKUP: "youtube-lookup",
  YOUTUBE_ENSURE: "youtube-ensure", 
  YOUTUBE_MARK: "youtube-mark",
  YOUTUBE_SYNCHRONIZE: "youtube-synchronize",
  YOUTUBE_LIKED_VIDEOS: "youtube-liked-videos",
  
  // Database Actions
  DATABASE_EXPORT: "database-export",
  DATABASE_IMPORT: "database-import",
  DATABASE_RESET: "database-reset",
  DATABASE_SYNC_ENABLE: "database-sync-enable",
  DATABASE_SYNC_DISABLE: "database-sync-disable",
  DATABASE_SYNC_NOW: "database-sync-now",
  DATABASE_SYNC_STATUS: "database-sync-status",
  
  // Provider Actions
  DATABASE_PROVIDER_STATUS: "database-provider-status",
  DATABASE_PROVIDER_SWITCH: "database-provider-switch",
  DATABASE_PROVIDER_SYNC: "database-provider-sync",
  
  // Search Actions
  SEARCH_LOOKUP: "search-lookup",
  SEARCH_DELETE: "search-delete",
  
  // History Actions
  HISTORY_SYNCHRONIZE: "history-synchronize",
  HISTORY_TIMESTAMP: "history-timestamp",
  
  // Settings Actions
  GET_SETTING: "get-setting",
  SET_SETTING: "set-setting",
  
  // Supabase Actions
  SUPABASE_CONFIGURE: "supabase-configure",
  SUPABASE_TEST: "supabase-test",
  SUPABASE_CLEAR: "supabase-clear",
  SUPABASE_GET_CREDENTIALS: "supabase-get-credentials",
  SUPABASE_GET_STATUS: "supabase-get-status"
};

// Error Messages
export const ERRORS = {
  DATABASE_NOT_AVAILABLE: "Database not available",
  INVALID_REQUEST: "Invalid request format",
  HANDLER_TIMEOUT: "Handler timeout",
  UNKNOWN_ACTION: "Unknown action",
  SYNC_FAILED: "Synchronization failed",
  PROVIDER_NOT_FOUND: "Database provider not found",
  INVALID_VIDEO_ID: "Invalid video ID format",
  CONNECTION_FAILED: "Connection failed"
};

// Timeouts and Limits
export const TIMEOUTS = {
  MESSAGE_HANDLER: 30000, // 30 seconds
  DATABASE_OPERATION: 10000, // 10 seconds
  NETWORK_REQUEST: 15000, // 15 seconds
  SYNC_OPERATION: 60000 // 1 minute
};

// Default Values
export const DEFAULTS = {
  VISUALIZATION: {
    FADEOUT: "0.4",
    GRAYOUT: "0.4", 
    SHOWBADGE: "1",
    SHOWDATE: "1",
    HIDEPROGRESS: "0",
    SHOWPUBLISHDATE: "0"
  },
  
  CONDITIONS: {
    YOURATING: "1",
    BROWSER: "1",
    LIKED: "1"
  },
  
  SYNC: {
    ENABLED: false,
    PROVIDER: SYNC.PROVIDERS.CHROME,
    INTERVAL: SYNC.INTERVALS.DEFAULT
  }
};

// CSS Selectors (for content script)
export const SELECTORS = {
  YOUTUBE: {
    VIDEO_TITLE: "h1.title",
    VIDEO_CONTAINER: "#primary",
    THUMBNAIL: "img",
    PROGRESS_BAR: ".ytp-progress-bar"
  }
};

// Regular Expressions
export const REGEX = {
  VIDEO_ID: /^[a-zA-Z0-9_-]{11}$/,
  YOUTUBE_URL: /^https:\/\/(www\.|m\.)?youtube\.com\/(watch\?v=|shorts\/)/,
  SUPABASE_URL: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/
}; 