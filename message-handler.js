/**
 * @typedef {Object} HandlerOptions
 * @property {boolean} [requiresAuth=false] - Whether handler requires authentication
 * @property {number} [timeout=30000] - Handler timeout in milliseconds
 */

/**
 * @typedef {Object} MessageRequest
 * @property {string} action - The action to perform
 * @property {*} [data] - Additional data for the action
 */

/**
 * @typedef {Object} MessageResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {*} [data] - Response data
 * @property {string} [error] - Error message if operation failed
 * @property {string} [action] - The original action
 */

/**
 * Unified message handler for Chrome extension background scripts
 * Consolidates messaging patterns and provides consistent error handling
 * 
 * @class MessageHandler
 * @description Manages message routing and error handling for Chrome extension communication
 * @version 1.0.0
 * 
 * @example
 * const handler = new MessageHandler();
 * handler.init();
 * handler.register('test-action', async (data) => {
 *   return { result: 'success' };
 * });
 */
export class MessageHandler {
  constructor() {
    this.handlers = new Map();
    this.isInitialized = false;
  }

  /**
   * Register a message handler for a specific action
   * @param {string} action - The action name
   * @param {Function} handler - The handler function (async or callback-style)
   * @param {HandlerOptions} [options={}] - Handler options
   * @throws {Error} If action is already registered
   * 
   * @example
   * // Register an async handler
   * handler.register('get-user', async (data) => {
   *   return await getUserById(data.userId);
   * });
   * 
   * @example
   * // Register with options
   * handler.register('admin-action', adminHandler, {
   *   requiresAuth: true,
   *   timeout: 60000
   * });
   */
  register(action, handler, options = {}) {
    this.handlers.set(action, {
      handler,
      requiresAuth: options.requiresAuth || false,
      timeout: options.timeout || 30000
    });
  }

  /**
   * Register multiple handlers at once
   * @param {Object} handlers - Object mapping actions to handlers
   * @param {Object} globalOptions - Global options for all handlers
   */
  registerBatch(handlers, globalOptions = {}) {
    for (const [action, handler] of Object.entries(handlers)) {
      this.register(action, handler, globalOptions);
    }
  }

  /**
   * Initialize the message handler with Chrome runtime listener
   */
  init() {
    if (this.isInitialized) return;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Indicate asynchronous response
    });

    this.isInitialized = true;
    console.log('MessageHandler initialized');
  }

  /**
   * Handle incoming messages
   * @param {Object} request - The message request
   * @param {Object} sender - The message sender
   * @param {Function} sendResponse - Response function
   */
  async handleMessage(request, sender, sendResponse) {
    const { action, ...data } = request;

    try {
      if (!action) {
        throw new Error('Missing action in message');
      }

      const handlerInfo = this.handlers.get(action);
      if (!handlerInfo) {
        throw new Error(`Unknown action: ${action}`);
      }

      const { handler, timeout } = handlerInfo;

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Handler timeout for action: ${action}`)), timeout);
      });

      // Execute handler with timeout
      const handlerPromise = this.executeHandler(handler, data, sender);
      const result = await Promise.race([handlerPromise, timeoutPromise]);

      console.debug(`Message handled successfully: ${action}`, result);
      sendResponse({ success: true, data: result });

    } catch (error) {
      console.error(`Message handling error for action ${action}:`, error);
      sendResponse({ 
        success: false, 
        error: error.message,
        action: action 
      });
    }
  }

  /**
   * Execute a handler function
   * @param {Function} handler - The handler function
   * @param {Object} data - The request data
   * @param {Object} sender - The message sender
   * @returns {Promise} Handler result
   */
  async executeHandler(handler, data, sender) {
    // Support both callback-style and async handlers
    return new Promise((resolve, reject) => {
      try {
        if (handler.constructor.name === 'AsyncFunction') {
          // Modern async handler
          handler(data, sender).then(resolve).catch(reject);
        } else {
          // Callback-style handler
          const result = handler(data, (response) => {
            if (response === null || response === undefined) {
              reject(new Error('Handler returned null/undefined'));
            } else {
              resolve(response);
            }
          });

          // If handler returns a promise, use it
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create a port-based messaging handler
   * @param {string} portName - Name of the port
   * @param {Object} messageHandlers - Handler functions
   * @returns {Function} AsyncSeries-compatible function
   */
  static createPortHandler(portName, messageHandlers) {
    return (args, callback) => {
      chrome.runtime.onConnect.addListener((port) => {
        if (port.name === portName) {
          port.onMessage.addListener(async (data) => {
            const { action, ...request } = data;

            const sendResponse = (response) => {
              port.postMessage({
                action: action,
                response: response,
              });
            };

            const sendProgress = (response) => {
              port.postMessage({
                action: `${action}-progress`,
                response: response,
              });
            };

            try {
              const handler = messageHandlers[action];
              if (handler) {
                await handler(request, sendResponse, sendProgress);
              } else {
                console.error(`[${portName}] Received unexpected action:`, action);
                sendResponse({ success: false, error: `Unknown action: ${action}` });
              }
            } catch (error) {
              console.error(`[${portName}] Handler error:`, error);
              sendResponse({ success: false, error: error.message });
            }
          });
        }
      });
      return callback({});
    };
  }
}

// Create and export singleton instance
export const messageHandler = new MessageHandler(); 