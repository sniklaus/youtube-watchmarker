"use strict";

/**
 * YouTube Watch Marker Content Script
 * Handles marking watched videos on YouTube pages
 */

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Utility functions for common operations
 */
const Utils = {
  /**
   * Extract video ID from URL
   */
  extractVideoId(url) {
    return url.split("&")[0].slice(-11);
  },

  /**
   * Extract video title from video element
   */
  extractVideoTitle(videoElement) {
    let title = "";
    let currentElement = videoElement.parentNode;
    
    for (let i = 0; i < 5 && currentElement; i++) {
      const titleElement = currentElement.querySelector("#video-title");
      if (titleElement) {
        title = titleElement.innerText.trim();
        break;
      }
      currentElement = currentElement.parentNode;
    }
    
    return title;
  },

  /**
   * Extract publication date from video element
   */
  extractPublishDate(videoElement) {
    let currentElement = videoElement.parentNode;
    
    for (let i = 0; i < 5 && currentElement; i++) {
      const spans = currentElement.querySelectorAll('span');
      for (const span of spans) {
        const text = span.getAttribute('aria-label')?.trim() || span.textContent?.trim();
        if (text && text.includes('ago')) {
          return text;
        }
      }
      currentElement = currentElement.parentNode;
    }
    
    return null;
  },

  /**
   * Get video selectors for finding video elements
   */
  getVideoSelectors() {
    return [
      'a.ytd-thumbnail[href^="/watch?v="]',
      'a.yt-lockup-view-model-wiz__content-image[href^="/watch?v="]',
      'ytd-compact-video-renderer a.yt-simple-endpoint[href^="/watch?v="]',
      'a.ytp-ce-covering-overlay[href*="/watch?v="]',
      'a.ytp-videowall-still[href*="/watch?v="]',
      'a.ytd-thumbnail[href^="/shorts/"]',
      'a.ShortsLockupViewModelHostEndpoint[href^="/shorts/"]',
      'a.reel-item-endpoint[href^="/shorts/"]',
      'a.media-item-thumbnail-container[href^="/watch?v="]'
    ];
  },

  /**
   * Find all video elements on page
   */
  findVideos(videoId = "") {
    const selectors = videoId 
      ? this.getVideoSelectors().map(selector => 
          selector.replace('"/watch?v="', `"/watch?v=${videoId}"`).replace('"/shorts/"', `"/shorts/${videoId}"`))
      : this.getVideoSelectors();
    
    return Array.from(document.querySelectorAll(selectors.join(", ")));
  },

  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Check if Chrome runtime is available and extension context is valid
   */
  isRuntimeAvailable() {
    try {
      // Check if chrome and chrome.runtime exist
      if (!chrome || !chrome.runtime) {
        return false;
      }
      
      // Check if extension context is still valid by accessing chrome.runtime.id
      // This will throw if the extension context has been invalidated
      return !!chrome.runtime.id;
    } catch (error) {
      // Extension context has been invalidated
      return false;
    }
  },

  /**
   * Safe error logging
   */
  logError(message, error) {
    console.error(message, {
      error: error.message,
      errorName: error.name,
      stack: error.stack
    });
  }
};

// =====================================================================================
// SETTINGS MANAGER
// =====================================================================================

/**
 * Manages Chrome storage settings with caching
 */
class SettingsManager {
  constructor() {
    this.cache = {};
    this.settingKeys = [
      'stylesheet_Fadeout', 'stylesheet_Grayout', 'stylesheet_Showbadge',
      'stylesheet_Showdate', 'stylesheet_Hideprogress',
      'idVisualization_Fadeout', 'idVisualization_Grayout',
      'idVisualization_Showbadge', 'idVisualization_Showdate',
      'idVisualization_Hideprogress', 'idVisualization_Showpublishdate'
    ];
  }

  /**
   * Check if Chrome storage is available
   */
  isStorageAvailable() {
    try {
      return !!(chrome && chrome.storage && chrome.storage.sync && Utils.isRuntimeAvailable());
    } catch (error) {
      return false;
    }
  }

  /**
   * Load all settings into cache
   */
  async loadSettings() {
    if (!this.isStorageAvailable()) {
      console.warn('Storage not available - using default settings');
      this.settingKeys.forEach(key => this.cache[key] = false);
      return;
    }

    try {
      const results = await chrome.storage.sync.get(this.settingKeys);
      this.cache = { ...results };
      console.log('Settings loaded:', Object.keys(this.cache).length, 'keys');
    } catch (error) {
      Utils.logError('Failed to load settings:', error);
      this.settingKeys.forEach(key => this.cache[key] = false);
    }
  }

  /**
   * Get setting value from cache or storage
   */
  async getSetting(key) {
    if (this.cache.hasOwnProperty(key)) {
      return this.cache[key] || false;
    }

    if (!this.isStorageAvailable()) {
        return false;
      }
      
    try {
      const result = await chrome.storage.sync.get([key]);
      this.cache[key] = result[key] || false;
      return this.cache[key];
    } catch (error) {
      Utils.logError(`Failed to get setting ${key}:`, error);
      this.cache[key] = false;
      return false;
    }
  }

  /**
   * Update cache when settings change
   */
  updateCache(changes) {
    for (const [key, {newValue}] of Object.entries(changes)) {
      this.cache[key] = newValue;
    }
  }

  /**
   * Setup storage change listener
   */
  setupChangeListener(callback) {
    if (!this.isStorageAvailable()) return;

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        this.updateCache(changes);
        callback(changes);
      }
    });
  }
}

// =====================================================================================
// BACKGROUND COMMUNICATION MANAGER
// =====================================================================================

/**
 * Manages communication with background script
 */
class BackgroundManager {
  constructor() {
    this.port = null;
    this.messageCallbacks = [];
    this.connect();
  }

  /**
   * Establish connection to background script
   */
  connect() {
    if (this.port || !Utils.isRuntimeAvailable()) return;

    try {
      this.port = chrome.runtime.connect({ name: "youtube-watchmarker" });
      console.log("Connected to background script");

      this.port.onDisconnect.addListener(() => {
        // Clear the lastError to prevent console warnings
        if (chrome.runtime.lastError) {
          console.log("Port disconnected:", chrome.runtime.lastError.message);
        } else {
          console.log("Port disconnected - page may be in back/forward cache");
        }
        this.port = null;
        
        // Only reconnect if the page is still active
        if (document.visibilityState === 'visible') {
          setTimeout(() => this.connect(), 1000);
        } else {
          // If page is not visible, wait for it to become visible again
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              document.removeEventListener('visibilitychange', handleVisibilityChange);
              setTimeout(() => this.connect(), 1000);
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);
        }
      });

      this.port.onMessage.addListener((response) => {
        this.messageCallbacks.forEach(callback => callback(response));
      });
    } catch (error) {
      // Check if this is an extension context invalidation error
      if (error.message && (error.message.includes("Extension context invalidated") ||
                           error.message.includes("context invalidated") ||
                           error.message.includes("Receiving end does not exist"))) {
        Utils.logError("Extension context invalidated during connection:", error);
        console.log("Extension context invalidated - attempting reconnection with longer delay");
        // Use longer delay for context invalidation as it might need more time to recover
        setTimeout(() => this.connect(), 10000);
      } else {
        Utils.logError("Connection error:", error);
        setTimeout(() => this.connect(), 5000);
      }
    }
  }

  /**
   * Send message to background script
   */
  sendMessage(message) {
    if (!Utils.isRuntimeAvailable()) {
      console.log("Runtime not available - skipping message");
      return;
    }
    
    if (this.port) {
      try {
        this.port.postMessage(message);
      } catch (error) {
        if (error.message && (error.message.includes("Extension context invalidated") ||
                             error.message.includes("context invalidated") ||
                             error.message.includes("Receiving end does not exist"))) {
          console.log("Extension context invalidated during postMessage - clearing port");
          this.port = null;
        } else {
          Utils.logError("Port error:", error);
        }
        this.fallbackSendMessage(message);
      }
    } else {
      this.fallbackSendMessage(message);
    }
  }

  /**
   * Fallback message sending with retry logic for extension context invalidation
   */
  async fallbackSendMessage(message) {
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      if (error.message && (error.message.includes("Extension context invalidated") ||
                           error.message.includes("context invalidated") ||
                           error.message.includes("Receiving end does not exist"))) {
        console.log("Extension context invalidated during sendMessage - retrying once");
        // Try once more in case it was a temporary issue
        try {
          await chrome.runtime.sendMessage(message);
        } catch (retryError) {
          console.log("Retry also failed, extension context may be permanently invalidated");
          // Don't log this as an error since it's expected when extension is reloaded
        }
      } else {
        Utils.logError("Error sending message:", error);
      }
    }
  }

  /**
   * Add message callback
   */
  onMessage(callback) {
    this.messageCallbacks.push(callback);
  }
}

// =====================================================================================
// CSS MANAGER
// =====================================================================================

/**
 * Manages dynamic CSS injection
 */
class CSSManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.injected = false;
    this.styleElementId = 'youwatch-injected-styles';
  }

  /**
   * Inject CSS based on current settings
   */
  async injectCSS() {
    if (this.injected) return;
    
    try {
      const settings = {};
      const keys = [
        'stylesheet_Fadeout', 'stylesheet_Grayout', 'stylesheet_Showbadge',
        'stylesheet_Showdate', 'stylesheet_Hideprogress',
        'idVisualization_Fadeout', 'idVisualization_Grayout',
        'idVisualization_Showbadge', 'idVisualization_Showdate',
        'idVisualization_Hideprogress'
      ];
      
      for (const key of keys) {
        settings[key] = await this.settingsManager.getSetting(key);
      }

      this.removeExistingStyles();
      const cssContent = this.buildCSS(settings);

      if (cssContent.trim()) {
        const style = document.createElement('style');
        style.id = this.styleElementId;
        style.textContent = cssContent;
        document.head.appendChild(style);
      }

      this.injected = true;
    } catch (error) {
      Utils.logError('Error injecting CSS:', error);
    }
  }

  /**
   * Remove existing injected styles
   */
  removeExistingStyles() {
    const existingStyle = document.getElementById(this.styleElementId);
      if (existingStyle) {
        existingStyle.remove();
    }
      }

  /**
   * Build CSS content based on settings
   */
  buildCSS(settings) {
      let cssContent = '';
      
      if (settings.idVisualization_Fadeout && settings.stylesheet_Fadeout) {
        cssContent += settings.stylesheet_Fadeout + '\n';
      }
      if (settings.idVisualization_Grayout && settings.stylesheet_Grayout) {
        cssContent += settings.stylesheet_Grayout + '\n';
      }
      if (settings.idVisualization_Showbadge && settings.stylesheet_Showbadge) {
        cssContent += settings.stylesheet_Showbadge + '\n';
      }
      if (settings.idVisualization_Showdate && settings.stylesheet_Showdate) {
        cssContent += settings.stylesheet_Showdate + '\n';
      }
      if (settings.idVisualization_Hideprogress && settings.stylesheet_Hideprogress) {
        cssContent += settings.stylesheet_Hideprogress + '\n';
      }

      // Publication dates are now added directly to title text, no CSS needed

    return cssContent;
  }

  /**
   * Reinject CSS (for settings changes)
   */
  async reinjectCSS() {
    this.injected = false;
    await this.injectCSS();
  }
}

// =====================================================================================
// VIDEO MARKER MANAGER
// =====================================================================================

/**
 * Manages video marking and watch date tracking
 */
class VideoMarkerManager {
  constructor(backgroundManager) {
    this.backgroundManager = backgroundManager;
    this.watchDates = {};
    this.observers = new WeakMap();

    // Listen for watch date updates from background
    this.backgroundManager.onMessage((response) => {
      if (response && response.strIdent) {
        this.watchDates[response.strIdent] = response.intTimestamp;
        this.markVideosWithId(response.strIdent);
      }
    });
  }

  /**
   * Mark video as watched or unwatched
   */
  markVideo(videoElement, videoId) {
    const isWatched = this.watchDates.hasOwnProperty(videoId);
    const hasWatchedClass = videoElement.classList.contains("youwatch-mark");

    if (isWatched && !hasWatchedClass) {
      videoElement.classList.add("youwatch-mark");
      
      if (this.watchDates[videoId] !== 0) {
        const watchDate = new Date(this.watchDates[videoId])
          .toISOString()
          .split("T")[0]
          .replace(/-/g, ".");
        videoElement.setAttribute("watchdate", ` - ${watchDate}`);
      }
    } else if (!isWatched && hasWatchedClass) {
      videoElement.classList.remove("youwatch-mark");
      if (videoElement.hasAttribute("watchdate")) {
        videoElement.removeAttribute("watchdate");
      }
    }
  }

  /**
   * Mark all videos with specific ID
   */
  markVideosWithId(videoId) {
    const videos = Utils.findVideos(videoId);
    videos.forEach(video => this.markVideo(video, videoId));
  }

  /**
   * Observe video element for changes
   */
  observeVideo(videoElement) {
    if (this.observers.has(videoElement)) return;

    const observer = new MutationObserver(() => {
      const videoId = Utils.extractVideoId(videoElement.href);
      this.markVideo(videoElement, videoId);
    });

    observer.observe(videoElement, {
      attributes: true,
      attributeFilter: ["href"]
    });

    this.observers.set(videoElement, observer);
  }

  /**
   * Request video data from background
   */
  requestVideoData(videoElement, videoId) {
    if (this.watchDates[videoId]) return; // Already have data

    const title = Utils.extractVideoTitle(videoElement);
    this.backgroundManager.sendMessage({
      action: "youtube-lookup",
      videoId: videoId,
      title: title
    });
  }

  /**
   * Mark video as watched from user interaction
   */
  markAsWatchedFromInteraction(videoId, title) {
    this.backgroundManager.sendMessage({
      action: "youtube-ensure",
      videoId: videoId,
      title: title
    });
  }

  /**
   * Process videos in batches
   */
  async processVideos(videos) {
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 10;
    
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      
      batch.forEach(video => {
        const videoId = Utils.extractVideoId(video.href);
        this.markVideo(video, videoId);
        this.observeVideo(video);
          this.requestVideoData(video, videoId);
      });
      
      if (i + BATCH_SIZE < videos.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
  }
}

// =====================================================================================
// PUBLICATION DATE MANAGER
// =====================================================================================

/**
 * Manages publication date display for videos
 */
class PublicationDateManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.publishDates = {};
    this.publishDatesCacheTime = {};
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Add publication date to video if enabled
   */
  async addPublishDateToVideo(videoElement, videoId) {
    const showPublishDate = await this.settingsManager.getSetting('idVisualization_Showpublishdate');
    if (!showPublishDate) return;

    let publishDate = this.getOrExtractPublishDate(videoElement, videoId);
    
    if (!publishDate) {
      // Retry with progressive delays for better reliability
      const retryDelays = [100, 300, 500];
      
      for (const delay of retryDelays) {
        setTimeout(() => {
          // Check if we already found and processed this video
          if (this.publishDates[videoId]) {
            this.updateVideoWithPublishDate(videoElement, videoId, this.publishDates[videoId]);
            return;
          }
          
          const retryDate = Utils.extractPublishDate(videoElement);
          if (retryDate) {
            this.cachePublishDate(videoId, retryDate);
            this.updateVideoWithPublishDate(videoElement, videoId, retryDate);
          }
        }, delay);
      }
      return;
    }
    
    this.updateVideoWithPublishDate(videoElement, videoId, publishDate);
  }

  /**
   * Get cached or extract fresh publication date
   */
  getOrExtractPublishDate(videoElement, videoId) {
    let publishDate = this.publishDates[videoId];
    const cacheTime = this.publishDatesCacheTime[videoId];
    const now = Date.now();

    // Check if cache is stale
    if (publishDate && cacheTime && (now - cacheTime > this.CACHE_DURATION)) {
      delete this.publishDates[videoId];
      delete this.publishDatesCacheTime[videoId];
      publishDate = null;
    }

    if (!publishDate) {
      publishDate = Utils.extractPublishDate(videoElement);
      if (publishDate) {
        this.cachePublishDate(videoId, publishDate);
      }
    }

    return publishDate;
  }

  /**
   * Cache publication date
   */
  cachePublishDate(videoId, publishDate) {
    this.publishDates[videoId] = publishDate;
    this.publishDatesCacheTime[videoId] = Date.now();
  }

  /**
   * Update video element with publication date
   */
  updateVideoWithPublishDate(videoElement, videoId, publishDate) {
    const cleanDate = publishDate.trim();
    if (!cleanDate || cleanDate === 'ago' || cleanDate.length < 3) return;

    const titleElement = this.findVideoTitleElement(videoElement);
    if (titleElement) {
      const existingVideoId = titleElement.getAttribute('data-video-id');
      
      // If this title already has a video ID (same or different), skip processing
      if (existingVideoId) return;
      
      titleElement.classList.add('youwatch-has-publish-date');
      titleElement.setAttribute('data-publish-date', cleanDate);
      titleElement.setAttribute('data-video-id', videoId);
      
      // Update title text with publication date
      this.updateVideoTitle(titleElement, cleanDate);
    }
  }

  /**
   * Find video title element
   */
  findVideoTitleElement(videoElement) {
    // Scope strictly to the videowall tile that contains this link
    // Many pages nest tiles inside containers like .ytp-ce-element which
    // hold multiple tiles. Using those containers leads to selecting the
    // first title on the wall. We therefore always resolve the closest
    // .ytp-videowall-still tile first and query within it only.

    // 1) Prefer the nearest videowall tile
    const tile =
      videoElement.closest('.ytp-videowall-still') ||
      videoElement.parentElement?.closest?.('.ytp-videowall-still');

    if (tile) {
      const titleInTile = tile.querySelector('.ytp-videowall-still-info-title');
      if (titleInTile && titleInTile.textContent && titleInTile.textContent.trim()) {
        return titleInTile;
      }
    }

    // 2) If the link isn’t inside a .ytp-videowall-still (end screens can vary),
    // walk up a few levels and only search within the closest element that also
    // contains this link to avoid leaking into sibling tiles.
    let currentElement = videoElement.parentElement;
    for (let i = 0; i < 5 && currentElement; i++) {
      if (currentElement.querySelector && currentElement.contains(videoElement)) {
        const scopedTitle = currentElement.querySelector('.ytp-videowall-still-info-title');
        if (scopedTitle && scopedTitle.textContent && scopedTitle.textContent.trim()) {
          return scopedTitle;
        }
      }
      currentElement = currentElement.parentElement;
    }

    return null;
  }

  /**
   * Update video title text with publication date
   */
  updateVideoTitle(titleElement, publishDate) {
    if (!titleElement) return;
    
    const currentText = titleElement.textContent?.trim() || '';
    
    // Don't add if already present (check for the exact format we add)
    if (currentText.includes(' ago')) return;
    
    // Add published date to the title text
    const newText = `${currentText} • ${publishDate}`;
    titleElement.textContent = newText;
  }





  /**
   * Remove all publication dates
   */
  removeAllPublishDates() {
    this.publishDates = {};
    this.publishDatesCacheTime = {};
    
    // Clean all title elements with the specific YouTube class
    const allTitleElements = document.querySelectorAll('.ytp-videowall-still-info-title');
    allTitleElements.forEach(titleElement => {
      const currentText = titleElement.textContent?.trim() || '';
      if (currentText.includes(' • Published:')) {
        const cleanText = currentText.split(' • Published:')[0];
        titleElement.textContent = cleanText;
      }
      
      // Clean attributes
      titleElement.classList.remove('youwatch-has-publish-date');
      titleElement.removeAttribute('data-publish-date');
      titleElement.removeAttribute('data-video-id');
    });
    
    // Clean any remaining elements
    document.querySelectorAll('.youwatch-has-publish-date').forEach(element => {
      element.classList.remove('youwatch-has-publish-date');
      element.removeAttribute('data-publish-date');
      element.removeAttribute('data-video-id');
    });
  }

  /**
   * Process videos for publication dates
   */
  async processVideos(videos) {
    for (const video of videos) {
      const videoId = Utils.extractVideoId(video.href);
      await this.addPublishDateToVideo(video, videoId);
    }
  }
}

// =====================================================================================
// INTERACTION MANAGER
// =====================================================================================

/**
 * Manages user interaction detection (rating, progress)
 */
class InteractionManager {
  constructor(videoMarkerManager) {
    this.videoMarkerManager = videoMarkerManager;
    this.setupRatingObserver();
    this.setupProgressListener();
  }

  /**
   * Setup rating button observer
   */
  setupRatingObserver() {
    document.addEventListener('click', this.handleRatingClick.bind(this), true);
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'aria-pressed' || mutation.attributeName === 'class')) {
          const target = mutation.target;
          if (this.isRatingButton(target)) {
            this.handleRatingButtonChange(target);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-pressed', 'class']
    });
  }

  /**
   * Handle rating button clicks
   */
  handleRatingClick(event) {
    const target = event.target.closest('button, [role="button"]');
    if (target && this.isRatingButton(target)) {
      setTimeout(() => this.handleRatingButtonChange(target), 100);
    }
  }

  /**
   * Check if element is a rating button
   */
  isRatingButton(element) {
    if (!element) return false;
    
    const ratingSelectors = [
      'ytd-toggle-button-renderer[target-id="watch-like"]',
      'ytd-toggle-button-renderer[target-id="watch-dislike"]',
      '#segmented-like-button button',
      '#segmented-dislike-button button',
      'button[aria-label*="like"]',
      'button[aria-label*="dislike"]'
    ];
    
    return ratingSelectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Handle rating button state change
   */
  handleRatingButtonChange(button) {
    try {
      const isPressed = button.getAttribute('aria-pressed') === 'true' || 
                       button.classList.contains('style-default-active');
      
      if (isPressed) {
        const videoId = this.getCurrentVideoId();
        if (videoId) {
          const title = this.getCurrentVideoTitle();
          this.videoMarkerManager.markAsWatchedFromInteraction(videoId, title);
        }
      }
    } catch (error) {
      Utils.logError("Error handling rating button change:", error);
    }
  }

  /**
   * Setup progress hook listener
   */
  setupProgressListener() {
    document.addEventListener('youwatch-progresshook', (event) => {
      const { strIdent, strTitle } = event.detail;
      
      if (strIdent && strIdent.length === 11) {
        this.videoMarkerManager.markAsWatchedFromInteraction(strIdent, strTitle);
      }
    });
  }

  /**
   * Get current video ID from URL
   */
  getCurrentVideoId() {
    const url = window.location.href;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get current video title
   */
  getCurrentVideoTitle() {
    const titleSelectors = [
      'h1.ytd-video-primary-info-renderer',
      'h1.ytd-watch-metadata',
      '.ytd-video-primary-info-renderer h1',
      'meta[property="og:title"]'
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        if (element.tagName === 'META') {
          return element.getAttribute('content') || '';
        }
        return element.textContent?.trim() || '';
      }
    }
    
    return document.title.replace(' - YouTube', '') || '';
  }
}

// =====================================================================================
// PAGE OBSERVER MANAGER
// =====================================================================================

/**
 * Manages page observation for dynamic content
 */
class PageObserverManager {
  constructor(refreshCallback) {
    this.refreshCallback = refreshCallback;
    this.setupMutationObserver();
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    const debouncedRefresh = Utils.debounce(this.refreshCallback, 100);
    
    const observer = new MutationObserver((mutations) => {
      let shouldRefresh = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const hasVideoThumbnails = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.matches?.(Utils.getVideoSelectors().join(', ')) || 
             node.querySelector?.(Utils.getVideoSelectors().join(', ')))
          );
          
          if (hasVideoThumbnails) {
            shouldRefresh = true;
          }
        }
      });
      
      if (shouldRefresh) {
        debouncedRefresh();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// =====================================================================================
// MAIN YOUTUBE WATCH MARKER CLASS
// =====================================================================================

/**
 * Main coordinator class for YouTube Watch Marker
 */
class YouTubeWatchMarker {
  constructor() {
    this.isProcessing = false;
    this.lastChange = null;
    
    // Initialize managers
    this.settingsManager = new SettingsManager();
    this.backgroundManager = new BackgroundManager();
    this.cssManager = new CSSManager(this.settingsManager);
    this.videoMarkerManager = new VideoMarkerManager(this.backgroundManager);
    this.publicationDateManager = new PublicationDateManager(this.settingsManager);
    this.interactionManager = new InteractionManager(this.videoMarkerManager);
    this.pageObserverManager = new PageObserverManager(() => this.refresh());
    
    this.init().catch(error => {
      Utils.logError('Failed to initialize YouTubeWatchMarker:', error);
    });
  }

  /**
   * Initialize the extension
   */
  async init() {
    if (!Utils.isRuntimeAvailable()) {
      throw new Error("Chrome runtime not available");
    }

    await this.settingsManager.loadSettings();
    await this.cssManager.injectCSS();
    
    this.setupMessageListener();
    this.setupSettingsListener();
    
    this.refresh();
  }

  /**
   * Setup message listener
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
      try {
        switch (data.action) {
          case "youtube-refresh":
            this.refresh();
            break;
          case "youtube-mark":
            this.videoMarkerManager.watchDates[data.videoId] = data.timestamp;
            this.videoMarkerManager.markVideosWithId(data.videoId);
            break;
          default:
            console.warn("Unknown action:", data.action);
        }
      } catch (error) {
        Utils.logError("Error handling message:", error);
      }
      sendResponse(null);
    });
  }

  /**
   * Setup settings change listener
   */
  setupSettingsListener() {
    this.settingsManager.setupChangeListener((changes) => {
      // Handle CSS changes
      const cssKeys = ['stylesheet_Fadeout', 'stylesheet_Grayout', 'stylesheet_Showbadge', 
                       'stylesheet_Showdate', 'stylesheet_Hideprogress'];
      const visualKeys = ['idVisualization_Fadeout', 'idVisualization_Grayout', 
                         'idVisualization_Showbadge', 'idVisualization_Showdate', 
                         'idVisualization_Hideprogress', 'idVisualization_Showpublishdate'];
      
      if (cssKeys.some(key => changes[key]) || visualKeys.some(key => changes[key])) {
        this.cssManager.reinjectCSS();
      }
      
      // Handle publication date setting changes
      if (changes.idVisualization_Showpublishdate) {
        this.handlePublishDateSettingChange(changes.idVisualization_Showpublishdate.newValue);
      }
    });
  }

  /**
   * Handle publication date setting change
   */
  async handlePublishDateSettingChange(isEnabled) {
    if (isEnabled) {
      const videos = Utils.findVideos();
      await this.publicationDateManager.processVideos(videos);
      } else {
      this.publicationDateManager.removeAllPublishDates();
    }
  }

  /**
   * Main refresh function
   */
  async refresh() {
    if (this.isProcessing || !Utils.isRuntimeAvailable()) return;
    
    this.isProcessing = true;
    
    try {
      const videos = Utils.findVideos();
      const currentState = `${window.location.href}:${document.title}:${videos.length}`;
      
      if (this.lastChange === currentState) {
        return;
      }
      
      this.lastChange = currentState;
      
      // Process videos with both managers
      await Promise.all([
        this.videoMarkerManager.processVideos(videos),
        this.publicationDateManager.processVideos(videos)
      ]);
      
    } catch (error) {
      Utils.logError("Error during refresh:", error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// =====================================================================================
// INITIALIZATION
// =====================================================================================

// Initialize when DOM is ready
let youtubeWatchMarker;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    youtubeWatchMarker = new YouTubeWatchMarker();
  });
} else {
  youtubeWatchMarker = new YouTubeWatchMarker();
}

// Debug function
window.clearPublishDateCache = function() {
  if (youtubeWatchMarker) {
    youtubeWatchMarker.publicationDateManager.publishDates = {};
    youtubeWatchMarker.publicationDateManager.publishDatesCacheTime = {};
    console.log('DEBUG: Manually cleared publish date cache');
    youtubeWatchMarker.publicationDateManager.removeAllPublishDates();
    youtubeWatchMarker.refresh();
  }
};