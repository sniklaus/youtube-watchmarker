// Error handling system - no imports needed from constants currently

/**
 * Custom error types for the YouTube Watchmarker extension
 */
export class ExtensionError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class DatabaseError extends ExtensionError {
  constructor(message, details = {}) {
    super(message, 'DATABASE_ERROR', details);
  }
}

export class NetworkError extends ExtensionError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
  }
}

export class ValidationError extends ExtensionError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class SyncError extends ExtensionError {
  constructor(message, details = {}) {
    super(message, 'SYNC_ERROR', details);
  }
}

export class ProviderError extends ExtensionError {
  constructor(message, details = {}) {
    super(message, 'PROVIDER_ERROR', details);
  }
}

/**
 * @typedef {Object} ErrorEntry
 * @property {string} timestamp - ISO timestamp of when error occurred
 * @property {string} message - Error message
 * @property {string} code - Error code
 * @property {string} stack - Error stack trace
 * @property {Object} context - Additional context information
 * @property {string} type - Error type/class name
 */

/**
 * @typedef {Object} ErrorStatistics
 * @property {number} totalErrors - Total number of errors logged
 * @property {Object.<string, number>} errorsByType - Count of errors by type
 * @property {Object.<string, number>} errorsByCode - Count of errors by code
 * @property {ErrorEntry[]} recentErrors - Recent error entries
 */

/**
 * Centralized error handler for the extension
 * 
 * @class ErrorHandler
 * @description Provides centralized error handling, logging, and reporting
 * @version 1.0.0
 * 
 * @example
 * import { errorHandler } from './error-handler.js';
 * 
 * try {
 *   // Some operation
 * } catch (error) {
 *   errorHandler.handle(error, { operation: 'database-sync' });
 * }
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * Handle and log errors
   * @param {Error} error - The error to handle
   * @param {Object} [context={}] - Additional context information
   * @param {boolean} [shouldThrow=false] - Whether to re-throw the error
   * @returns {ErrorEntry} The created error entry
   * 
   * @example
   * try {
   *   await someAsyncOperation();
   * } catch (error) {
   *   errorHandler.handle(error, { 
   *     operation: 'sync', 
   *     userId: 'user123' 
   *   });
   * }
   */
  handle(error, context = {}, shouldThrow = false) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      stack: error.stack,
      context: context,
      type: error.constructor.name
    };

    // Add to error log
    this.errorLog.unshift(errorEntry);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }

    // Log to console with appropriate level
    this.logError(error, context);

    // Send to background analytics if configured
    this.reportError(errorEntry);

    if (shouldThrow) {
      throw error;
    }

    return errorEntry;
  }

  /**
   * Log error to console with appropriate level
   * @param {Error} error - The error to log
   * @param {Object} context - Additional context
   */
  logError(error, context) {
    const logMessage = `[${error.constructor.name}] ${error.message}`;
    
    if (error instanceof ValidationError) {
      console.warn(logMessage, { error, context });
    } else if (error instanceof NetworkError) {
      console.error(logMessage, { error, context });
    } else if (error instanceof DatabaseError) {
      console.error(logMessage, { error, context });
    } else if (error instanceof SyncError) {
      console.warn(logMessage, { error, context });
    } else {
      console.error(logMessage, { error, context });
    }
  }

  /**
   * Report error to analytics/monitoring service
   * @param {Object} errorEntry - The error entry to report
   */
  reportError(errorEntry) {
    // In a real implementation, this could send to analytics
    // For now, we'll just store it locally
    try {
      chrome.storage.local.get(['errorReports'], (result) => {
        const reports = result.errorReports || [];
        reports.unshift(errorEntry);
        
        // Keep only last 50 error reports
        if (reports.length > 50) {
          reports.splice(50);
        }
        
        chrome.storage.local.set({ errorReports: reports });
      });
    } catch (storageError) {
      console.error('Failed to store error report:', storageError);
    }
  }

  /**
   * Create a safe wrapper for async functions
   * @param {Function} fn - The async function to wrap
   * @param {Object} defaultReturn - Default return value on error
   * @returns {Function} Wrapped function
   */
  wrapAsync(fn, defaultReturn = null) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, { 
          function: fn.name,
          arguments: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
        });
        return defaultReturn;
      }
    };
  }

  /**
   * Create a safe wrapper for callback-style functions
   * @param {Function} fn - The function to wrap
   * @returns {Function} Wrapped function
   */
  wrapCallback(fn) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle(error, { 
          function: fn.name,
          arguments: args.map(arg => typeof arg === 'object' ? '[Object]' : arg)
        });
        
        // If last argument is a callback, call it with error
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'function') {
          lastArg(null);
        }
      }
    };
  }

  /**
   * Validate required parameters
   * @param {Object} params - Parameters to validate
   * @param {Array} required - Required parameter names
   * @throws {ValidationError} If validation fails
   */
  validateRequired(params, required) {
    const missing = required.filter(key => 
      params[key] === undefined || params[key] === null
    );
    
    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required parameters: ${missing.join(', ')}`,
        { missing, provided: Object.keys(params) }
      );
    }
  }

  /**
   * Validate video ID format
   * @param {string} videoId - Video ID to validate
   * @throws {ValidationError} If validation fails
   */
  validateVideoId(videoId) {
    if (!videoId || typeof videoId !== 'string') {
      throw new ValidationError('Video ID must be a non-empty string');
    }
    
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      throw new ValidationError(
        'Invalid video ID format',
        { videoId, expected: '11 character alphanumeric string' }
      );
    }
  }

  /**
   * Get recent error reports
   * @param {number} limit - Maximum number of reports to return
   * @returns {Promise<Array>} Recent error reports
   */
  async getRecentErrors(limit = 10) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['errorReports'], (result) => {
        const reports = result.errorReports || [];
        resolve(reports.slice(0, limit));
      });
    });
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.errorLog = [];
    chrome.storage.local.remove(['errorReports']);
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStatistics() {
    const errorsByType = {};
    const errorsByCode = {};
    
    this.errorLog.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    });
    
    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsByCode,
      recentErrors: this.errorLog.slice(0, 5)
    };
  }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Utility functions for common error scenarios
 */
export const ErrorUtils = {
  /**
   * Handle database operation errors
   * @param {Error} error - The error that occurred
   * @param {string} operation - The operation that failed
   * @param {Object} context - Additional context
   */
  handleDatabaseError(error, operation, context = {}) {
    const dbError = new DatabaseError(
      `Database ${operation} failed: ${error.message}`,
      { operation, originalError: error.message, ...context }
    );
    return errorHandler.handle(dbError, context);
  },

  /**
   * Handle network request errors
   * @param {Error} error - The error that occurred
   * @param {string} url - The URL that failed
   * @param {Object} context - Additional context
   */
  handleNetworkError(error, url, context = {}) {
    const networkError = new NetworkError(
      `Network request failed: ${error.message}`,
      { url, originalError: error.message, ...context }
    );
    return errorHandler.handle(networkError, context);
  },

  /**
   * Handle sync operation errors
   * @param {Error} error - The error that occurred
   * @param {string} operation - The sync operation that failed
   * @param {Object} context - Additional context
   */
  handleSyncError(error, operation, context = {}) {
    const syncError = new SyncError(
      `Sync ${operation} failed: ${error.message}`,
      { operation, originalError: error.message, ...context }
    );
    return errorHandler.handle(syncError, context);
  },

  /**
   * Create a standardized error response
   * @param {Error} error - The error that occurred
   * @returns {Object} Standardized error response
   */
  createErrorResponse(error) {
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Create a standardized success response
   * @param {*} data - The response data
   * @param {string} message - Success message
   * @returns {Object} Standardized success response
   */
  createSuccessResponse(data = null, message = 'Operation completed successfully') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }
}; 