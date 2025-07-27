"use strict";

/**
 * YouTube Watch Marker Content Script
 * Handles marking watched videos on YouTube pages
 */
class YouTubeWatchMarker {
  constructor() {
    this.lastChange = null;
    this.watchDates = {};
    this.publishDates = {}; // Store publication dates
    this.observers = new WeakMap();
    this.isProcessing = false;
    this.cssInjected = false; // Track if CSS is injected
    
    // Settings cache
    this.settingsCache = {};
    
    // Bind methods to preserve 'this' context
    this.refresh = this.refresh.bind(this);
    this.markVideo = this.markVideo.bind(this);
    this.observeVideo = this.observeVideo.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleProgressHookEvent = this.handleProgressHookEvent.bind(this);
    this.setupTooltips = this.setupTooltips.bind(this);
    this.extractPublishDate = this.extractPublishDate.bind(this);
    this.injectCSS = this.injectCSS.bind(this);
    
    // Long-lived port for background communication
    this.backgroundPort = null;
    this.connectToBackground();
    
    this.safeInit().catch(error => {
      console.error('Failed to initialize YouTubeWatchMarker:', error);
    });
  }

  /**
   * Safe initialization with error handling and retry
   */
  async safeInit(retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;
    
    try {
      await this.init();
    } catch (error) {
      console.error(`Initialization failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      if (retryCount < MAX_RETRIES && (error.message?.includes('context invalidated') || error.message?.includes('undefined'))) {
        console.log(`Retrying initialization in ${RETRY_DELAY/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        await this.safeInit(retryCount + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize the extension
   */
  async init() {
    // Check runtime validity before proceeding
    if (!chrome.runtime || !chrome.runtime.id) {
      throw new Error("Runtime invalid during init");
    }
    
    // Fetch and cache settings (with fallbacks)
    await this.cacheSettings();
    
    await this.injectCSS();
    this.setupPeriodicRefresh();
    this.setupRatingObserver();
    await this.setupTooltips();
    this.refresh();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage);
    
    // Listen for progress hook events
    document.addEventListener('youwatch-progresshook', (event) => {
      this.handleProgressHookEvent(event);
    });
    
    // Listen for storage changes to update tooltip settings and cache
    if (this.isStorageAvailable()) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
          // Update cache
          for (const [key, {newValue}] of Object.entries(changes)) {
            this.settingsCache[key] = newValue;
          }
          
          // Handle CSS changes
          const cssKeys = ['stylesheet_Fadeout', 'stylesheet_Grayout', 'stylesheet_Showbadge', 'stylesheet_Showdate', 'stylesheet_Hideprogress'];
          const visualKeys = ['idVisualization_Fadeout', 'idVisualization_Grayout', 'idVisualization_Showbadge', 'idVisualization_Showdate', 'idVisualization_Hideprogress', 'idVisualization_Showpublishdate'];
          
          if (cssKeys.some(key => changes[key]) || visualKeys.some(key => changes[key])) {
            // Reset CSS injection flag and re-inject
            this.cssInjected = false;
            this.injectCSS();
          }
          
          // Handle tooltip changes
          if (changes.idVisualization_Showpublishdate) {
            this.handleTooltipSettingChange(changes.idVisualization_Showpublishdate.newValue);
          }
        }
      });
    } else {
      console.warn('Storage not available - skipping storage change listener');
    }
    
    // Setup periodic runtime check
    this.setupRuntimeCheck();
  }

  /**
   * Check if Chrome storage API is available
   * @returns {boolean} True if storage is available
   */
  isStorageAvailable() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.sync);
    } catch (error) {
      console.warn("Storage availability check failed:", error);
      return false;
    }
  }

  /**
   * Fetch and cache all required settings
   */
  async cacheSettings() {
    const keys = [
      'stylesheet_Fadeout', 'stylesheet_Grayout', 'stylesheet_Showbadge',
      'stylesheet_Showdate', 'stylesheet_Hideprogress',
      'idVisualization_Fadeout', 'idVisualization_Grayout',
      'idVisualization_Showbadge', 'idVisualization_Showdate',
      'idVisualization_Hideprogress', 'idVisualization_Showpublishdate'
    ];
    
    if (!this.isStorageAvailable()) {
      console.warn('Storage not available during cacheSettings - using defaults');
      keys.forEach(key => {
        this.settingsCache[key] = false;
      });
      return;
    }
    
    try {
      const results = await chrome.storage.sync.get(keys);
      this.settingsCache = { ...results };
      console.log('Settings cached successfully:', Object.keys(this.settingsCache).length, 'keys');
    } catch (error) {
      console.error('Failed to cache settings:', error);
      // Set defaults to false
      keys.forEach(key => {
        this.settingsCache[key] = false;
      });
    }
  }

  /**
   * Establish long-lived connection to background
   */
  connectToBackground() {
    // Check if runtime is valid before connecting
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log("Runtime invalid - delaying connection...");
      setTimeout(() => this.connectToBackground(), 1000);
      return;
    }
    
    try {
      this.backgroundPort = chrome.runtime.connect({ name: "youtube-watchmarker" });
    } catch (error) {
      if (error.message.includes("context invalidated")) {
        console.log("Context invalidated during connect - retrying...");
        setTimeout(() => this.connectToBackground(), 1000);
      } else {
        console.error("Connection error:", error);
      }
      return;
    }
      
    this.backgroundPort.onDisconnect.addListener(() => {
      console.log("Disconnected from background - reconnecting...");
      this.backgroundPort = null;
      setTimeout(() => this.connectToBackground(), 1000);
    });
    
    this.backgroundPort.onMessage.addListener((response) => {
      if (response && response.strIdent) {
        this.watchDates[response.strIdent] = response.intTimestamp;
        
        // Mark all videos with this ID
        const videosWithId = this.findVideos(response.strIdent);
        videosWithId.forEach(video => this.markVideo(video, response.strIdent));
      }
    });
  }

  /**
   * Inject CSS styles for custom tooltips and stored stylesheet settings
   */
  async injectCSS() {
    if (this.cssInjected) return;
    
    try {
      // Get all settings from cache/storage
      const settings = {};
      const keys = [
        'stylesheet_Fadeout',
        'stylesheet_Grayout', 
        'stylesheet_Showbadge',
        'stylesheet_Showdate',
        'stylesheet_Hideprogress',
        'idVisualization_Fadeout',
        'idVisualization_Grayout',
        'idVisualization_Showbadge',
        'idVisualization_Showdate',
        'idVisualization_Hideprogress'
      ];
      
      for (const key of keys) {
        settings[key] = await this.getSettingValue(key);
      }

      // Remove any existing injected styles to prevent duplicates
      const existingStyle = document.getElementById('youwatch-injected-styles');
      if (existingStyle) {
        existingStyle.remove();
      }

      // Build CSS string based on enabled settings
      let cssContent = '';
      
      // Add youwatch-mark styles based on enabled visualizations
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

      // Add publication date CSS
      cssContent += `
        /* Publication Date Display */
        .youwatch-has-publish-date::after {
          content: " • Published: " attr(data-publish-date);
          color: #aaa;
          font-weight: normal;
        }
        
        /* Dark theme adjustments */
        [data-bs-theme="dark"] .youwatch-has-publish-date::after {
          color: #ccc;
        }
        
        /* Light theme adjustments */
        [data-bs-theme="light"] .youwatch-has-publish-date::after {
          color: #606060;
        }
      `;

      // Inject CSS if there's content
      if (cssContent.trim()) {
        const style = document.createElement('style');
        style.id = 'youwatch-injected-styles';
        style.textContent = cssContent;
        document.head.appendChild(style);
      }

      this.cssInjected = true;
    } catch (error) {
      console.error('Error injecting CSS:', error);
    }
  }

  /**
   * Sets up periodic refresh to catch dynamically loaded content
   */
  setupPeriodicRefresh() {
    // Use MutationObserver for better performance than polling
    const observer = new MutationObserver((mutations) => {
      let shouldRefresh = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any video thumbnails were added
          const hasVideoThumbnails = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.matches?.(this.getVideoSelectors().join(', ')) || 
             node.querySelector?.(this.getVideoSelectors().join(', ')))
          );
          
          if (hasVideoThumbnails) {
            shouldRefresh = true;
          }
        }
      });
      
      if (shouldRefresh && !this.isProcessing) {
        // Debounce refresh calls
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(() => {
          this.refresh();
          this.setupTooltips(); // Re-setup publication date display for new content
        }, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Gets CSS selectors for video elements
   * @returns {string[]} Array of CSS selectors
   */
  getVideoSelectors() {
    return [
      'a.ytd-thumbnail[href^="/watch?v="]', // regular videos
      'a.yt-lockup-view-model-wiz__content-image[href^="/watch?v="]', // regular videos
      'ytd-compact-video-renderer a.yt-simple-endpoint[href^="/watch?v="]', // compact videos
      'a.ytp-ce-covering-overlay[href*="/watch?v="]', // video overlays
      'a.ytp-videowall-still[href*="/watch?v="]', // video wall
      'a.ytd-thumbnail[href^="/shorts/"]', // shorts
      'a.ShortsLockupViewModelHostEndpoint[href^="/shorts/"]', // shorts
      'a.reel-item-endpoint[href^="/shorts/"]', // shorts
      'a.media-item-thumbnail-container[href^="/watch?v="]', // mobile
    ];
  }

  /**
   * Finds all video elements on the page
   * @param {string} [videoId] - Optional video ID to filter by
   * @returns {Element[]} Array of video elements
   */
  findVideos(videoId = "") {
    const selectors = videoId 
      ? this.getVideoSelectors().map(selector => 
          selector.replace('"/watch?v="', `"/watch?v=${videoId}"`).replace('"/shorts/"', `"/shorts/${videoId}"`))
      : this.getVideoSelectors();
    
    return Array.from(document.querySelectorAll(selectors.join(", ")));
  }

  /**
   * Extracts video ID from URL
   * @param {string} url - Video URL
   * @returns {string} Video ID
   */
  extractVideoId(url) {
    return url.split("&")[0].slice(-11);
  }

  /**
   * Extracts video title from video element
   * @param {Element} videoElement - Video element
   * @returns {string} Video title
   */
  extractVideoTitle(videoElement) {
    let title = "";
    let currentElement = videoElement.parentNode;
    
    // Search up the DOM tree for title element
    for (let i = 0; i < 5 && currentElement; i++) {
      const titleElement = currentElement.querySelector("#video-title");
      if (titleElement) {
        title = titleElement.innerText.trim();
        break;
      }
      currentElement = currentElement.parentNode;
    }
    
    return title;
  }

  /**
   * Extracts publication date from video element
   * @param {Element} videoElement - Video element
   * @returns {string|null} Publication date or null if not found
   */
  extractPublishDate(videoElement) {
    let publishDate = null;
    let currentElement = videoElement.parentNode;
    
    // Search up the DOM tree for publication date
    for (let i = 0; i < 10 && currentElement; i++) {
      // Look for various date selectors - YouTube uses different layouts
      const dateSelectors = [
        // Common metadata selectors
        '#metadata-line span:last-child',
        '#metadata-line span:nth-child(2)',
        '.ytd-video-meta-block #metadata-line span:last-child',
        '.ytd-video-meta-block #metadata-line span:nth-child(2)',
        'ytd-video-meta-block #metadata-line span:last-child',
        'ytd-video-meta-block #metadata-line span:nth-child(2)',
        '.style-scope.ytd-video-meta-block:last-child',
        '.style-scope.ytd-video-meta-block:nth-child(2)',
        
        // Additional specific selectors for different layouts
        '.ytd-video-meta-block span[aria-label*="ago"]',
        '.ytd-video-meta-block span[aria-label*="years ago"]',
        '.ytd-video-meta-block span[aria-label*="months ago"]',
        '.ytd-video-meta-block span[aria-label*="days ago"]',
        '.ytd-video-meta-block span[aria-label*="hours ago"]',
        '.ytd-video-meta-block span[aria-label*="minutes ago"]',
        
        // Grid and list view selectors
        '.details .metadata span:last-child',
        '.details .metadata span:nth-child(2)',
        '.metadata-line span',
        '.video-meta span',
        
        // Shorts and mobile layouts
        '.ytd-shorts-video-meta-block span',
        '.shorts-video-meta span',
        
        // Search result layouts
        '.ytd-video-meta-block .style-scope:last-child',
        '.ytd-channel-video-player-renderer .metadata span:last-child',
        
        // Aria label selectors (more comprehensive)
        '[aria-label*="ago"]',
        '[aria-label*="Streamed"]',
        '[aria-label*="Published"]',
        '[aria-label*="Uploaded"]',
        '[aria-label*="years ago"]',
        '[aria-label*="months ago"]',
        '[aria-label*="weeks ago"]',
        '[aria-label*="days ago"]',
        '[aria-label*="hours ago"]',
        '[aria-label*="minutes ago"]',
        
        // Text content selectors
        'span:contains("ago")',
        'span:contains("years ago")',
        'span:contains("months ago")',
        'span:contains("weeks ago")',
        'span:contains("days ago")',
        'span:contains("hours ago")',
        'span:contains("minutes ago")',
        
        // Alternative layouts and fallbacks
        '.ytd-video-meta-block span',
        '[id*="metadata"] span',
        '.video-meta-block span',
        '.metadata span'
      ];
      
      for (const selector of dateSelectors) {
        try {
          let dateElements;
          
          // Handle :contains() pseudo-selector manually
          if (selector.includes(':contains(')) {
            const baseSelector = selector.split(':contains(')[0];
            const searchText = selector.match(/\("([^"]*)"\)/)?.[1];
            dateElements = currentElement.querySelectorAll(baseSelector);
            dateElements = Array.from(dateElements).filter(el => 
              el.textContent?.includes(searchText)
            );
          } else {
            dateElements = currentElement.querySelectorAll(selector);
          }
          
          for (const dateElement of dateElements) {
            const dateText = dateElement.textContent?.trim() || dateElement.getAttribute('aria-label');
            if (dateText && this.isValidDateText(dateText)) {
              publishDate = dateText;
              break;
            }
          }
          
          if (publishDate) break;
        } catch (e) {
          // Ignore selector errors and continue
          continue;
        }
      }
      
      if (publishDate) break;
      currentElement = currentElement.parentNode;
    }
    
    // If no date found in parent elements, try searching within the video element itself
    if (!publishDate) {
      try {
        const allSpans = videoElement.querySelectorAll('span');
        for (const span of allSpans) {
          const text = span.textContent?.trim() || span.getAttribute('aria-label');
          if (text && this.isValidDateText(text)) {
            publishDate = text;
            break;
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    return publishDate;
  }

  /**
   * Checks if a text string represents a valid publication date
   * @param {string} text - Text to check
   * @returns {boolean} Whether the text is a valid date
   */
  isValidDateText(text) {
    if (!text || typeof text !== 'string') return false;
    
    const lowerText = text.toLowerCase();
    const datePatterns = [
      /\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago/i,
      /streamed\s+\d+/i,
      /published\s+on/i,
      /uploaded\s+on/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /\d{1,2}\/\d{1,2}\/\d{2,4}/,
      /\d{4}-\d{2}-\d{2}/,
      /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i
    ];
    
    return datePatterns.some(pattern => pattern.test(text)) ||
           lowerText.includes('ago') ||
           lowerText.includes('streamed') ||
           lowerText.includes('published') ||
           lowerText.includes('uploaded');
  }

  /**
   * Refreshes the page to mark watched videos
   */
  async refresh() {
    if (this.isProcessing) return;
    
    // Check runtime validity
    if (!chrome.runtime || !chrome.runtime.id) {
      console.error("Runtime invalid during refresh - skipping");
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Clean up any stray publication dates from previous refreshes
      this.cleanupStrayPublishDates();
      
      const videos = this.findVideos();
      const currentState = `${window.location.href}:${document.title}:${videos.length}`;
      
      // Skip if nothing changed
      if (this.lastChange === currentState) {
        return;
      }
      
      this.lastChange = currentState;
      
      // Process videos in batches to avoid blocking the UI
      await this.processVideosInBatches(videos);
      
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clean up stray publication dates that might be on wrong videos
   */
  cleanupStrayPublishDates() {
    const elementsWithPublishDate = document.querySelectorAll('.youwatch-has-publish-date');
    
    elementsWithPublishDate.forEach(element => {
      const storedVideoId = element.getAttribute('data-video-id');
      
      // Find the actual video link associated with this title element
      const videoLink = element.closest('a[href*="/watch"]') || 
                       element.closest('[href*="/watch"]') ||
                       element.parentElement?.querySelector('a[href*="/watch"]');
      
      if (videoLink) {
        const currentVideoId = this.extractVideoId(videoLink.href);
        
        // If the stored video ID doesn't match the current video, remove the publication date
        if (storedVideoId !== currentVideoId) {
          element.classList.remove('youwatch-has-publish-date');
          element.removeAttribute('data-publish-date');
          element.removeAttribute('data-video-id');
        }
      }
    });
  }

  /**
   * Processes videos in batches to improve performance
   * @param {Element[]} videos - Array of video elements
   */
  async processVideosInBatches(videos) {
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 10; // ms
    
    // Check if publication date display is enabled from cache
    const showPublishDate = await this.getSettingValue('idVisualization_Showpublishdate');
    
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      
      batch.forEach(video => {
        const videoId = this.extractVideoId(video.href);
        this.markVideo(video, videoId);
        this.observeVideo(video);
        
        // Add publication date to title if enabled
        if (showPublishDate) {
          this.addPublishDateToTitle(video, videoId);
        }
        
        // Check if we already have watch date for this video
        if (!this.watchDates[videoId]) {
          this.requestVideoData(video, videoId);
        }
      });
      
      // Small delay between batches to prevent blocking
      if (i + BATCH_SIZE < videos.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
  }

  /**
   * Add publication date to video title attribute
   * @param {Element} videoElement - Video element
   * @param {string} videoId - Video ID
   */
  addPublishDateToTitle(videoElement, videoId) {
    // Get or extract publication date
    let publishDate = this.publishDates[videoId];
    if (!publishDate) {
      publishDate = this.extractPublishDate(videoElement);
      if (publishDate) {
        this.publishDates[videoId] = publishDate;
      }
    }
    
    // If still no publication date, try delayed extraction
    if (!publishDate) {
      setTimeout(() => {
        const retryDate = this.extractPublishDate(videoElement);
        if (retryDate) {
          this.publishDates[videoId] = retryDate;
          this.updateVideoTitle(videoElement, retryDate);
        }
      }, 100);
      return;
    }
    
    this.updateVideoTitle(videoElement, publishDate);
  }

  /**
   * Update video element title with publication date
   * @param {Element} videoElement - Video element
   * @param {string} publishDate - Publication date
   */
  updateVideoTitle(videoElement, publishDate) {
    const cleanDate = this.formatPublishDate(publishDate);
    const videoId = this.extractVideoId(videoElement.href);
    
    // Find the video title element in the DOM
    const titleElement = this.findVideoTitleElement(videoElement);
    
    if (titleElement && videoId) {
      // Instead of modifying text content, add a CSS class and data attribute
      titleElement.classList.add('youwatch-has-publish-date');
      titleElement.setAttribute('data-publish-date', cleanDate);
      titleElement.setAttribute('data-video-id', videoId);
    }
    
    // Also update the hover tooltip for accessibility
    const originalTitle = videoElement.getAttribute('aria-label') || 
                         videoElement.getAttribute('title') || 
                         this.extractVideoTitle(videoElement);
    
    if (originalTitle && !originalTitle.includes('Published:')) {
      const newTitle = `${originalTitle}\nPublished: ${cleanDate}`;
      videoElement.setAttribute('title', newTitle);
      
      // Also update aria-label if it exists
      if (videoElement.getAttribute('aria-label')) {
        videoElement.setAttribute('aria-label', newTitle);
      }
    }
  }

  /**
   * Find the video title element within a video container
   * @param {Element} videoElement - Video element
   * @returns {Element|null} Title element or null if not found
   */
  findVideoTitleElement(videoElement) {
    let currentElement = videoElement;
    
    // Search up the DOM tree to find the video container
    for (let i = 0; i < 10 && currentElement; i++) {
      // Look for various title selectors - YouTube uses different layouts
      const titleSelectors = [
        // Common title selectors
        '#video-title',
        '.ytd-video-meta-block #video-title',
        '.ytd-video-meta-block h3 a',
        '.ytd-video-meta-block h3',
        '#video-title-link',
        '.video-title',
        
        // Grid and list view selectors
        'h3 a[href*="/watch"]',
        'h3 span[role="text"]',
        'h3 .ytd-video-meta-block',
        
        // Shorts selectors
        '.ytd-shorts-video-meta-block h3',
        '.shorts-video-meta h3',
        
        // Search result selectors
        '.ytd-video-meta-block .style-scope h3',
        '.ytd-channel-video-player-renderer h3',
        
        // Generic selectors
        'h3[class*="title"]',
        'span[class*="title"]',
        'a[class*="title"]'
      ];
      
      for (const selector of titleSelectors) {
        try {
          const titleElement = currentElement.querySelector(selector);
          if (titleElement && titleElement.textContent && titleElement.textContent.trim()) {
            return titleElement;
          }
        } catch (e) {
          // Ignore selector errors and continue
          continue;
        }
      }
      
      currentElement = currentElement.parentNode;
    }
    
    return null;
  }

  /**
   * Requests video data from background script
   * @param {Element} videoElement - Video element
   * @param {string} videoId - Video ID
   */
  requestVideoData(videoElement, videoId) {
    const title = this.extractVideoTitle(videoElement);
    
    // Use long-lived port if available, fallback to sendMessage
    if (this.backgroundPort) {
      // Check runtime validity
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log("Runtime invalid - skipping message");
        return;
      }
      
      try {
        this.backgroundPort.postMessage({
          action: "youtube-lookup",
          videoId: videoId,
          title: title,
        });
      } catch (error) {
        if (error.message.includes("context invalidated")) {
          console.log("Context invalidated during postMessage - will reconnect");
          this.backgroundPort = null; // Trigger reconnection
        } else {
          console.error("Port error:", error);
          // Fallback to sendMessage if port fails
          chrome.runtime.sendMessage({
            action: "youtube-lookup",
            videoId: videoId,
            title: title,
          });
        }
      }
    } else {
      // Fallback if port not connected
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log("Runtime invalid - skipping fallback message");
        return;
      }
      
      chrome.runtime.sendMessage({
        action: "youtube-lookup",
        videoId: videoId,
        title: title,
      });
    }
  }

  /**
   * Marks a video element as watched or unwatched
   * @param {Element} videoElement - Video element to mark
   * @param {string} videoId - Video ID
   */
  markVideo(videoElement, videoId) {
    const isWatched = this.watchDates.hasOwnProperty(videoId);
    const hasWatchedClass = videoElement.classList.contains("youwatch-mark");
    
    if (isWatched && !hasWatchedClass) {
      videoElement.classList.add("youwatch-mark");
      
      // Add watch date attribute if timestamp exists
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
   * Sets up observation for a video element to detect href changes
   * @param {Element} videoElement - Video element to observe
   */
  observeVideo(videoElement) {
    if (this.observers.has(videoElement)) {
      return;
    }

    const observer = new MutationObserver(() => {
      const videoId = this.extractVideoId(videoElement.href);
      this.markVideo(videoElement, videoId);
    });

    observer.observe(videoElement, {
      attributes: true,
      attributeFilter: ["href"],
    });

    this.observers.set(videoElement, observer);
  }

  /**
   * Sets up publication date display for video elements
   */
  async setupTooltips() {
    // Check if publication date display is enabled from cache
    const isEnabled = await this.getSettingValue('idVisualization_Showpublishdate');
    if (!isEnabled) {
      return;
    }
    
    const videos = this.findVideos();
    
    videos.forEach(videoElement => {
      const videoId = this.extractVideoId(videoElement.href);
      
      // Add publication date to title
      this.addPublishDateToTitle(videoElement, videoId);
    });
  }

  /**
   * Get a setting value from cache, fallback to storage if not cached
   * @param {string} key - Setting key
   * @returns {Promise<boolean>} Setting value
   */
  async getSettingValue(key, maxRetries = 2, retryDelay = 1000) {
    if (this.settingsCache.hasOwnProperty(key)) {
      return this.settingsCache[key] || false;
    }
    
    // If not cached, try to fetch with retry
    let attempts = 0;
    
    while (attempts < maxRetries) {
      if (!this.isStorageAvailable()) {
        console.log(`Storage not available (attempt ${attempts + 1}/${maxRetries}) - retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        attempts++;
        continue;
      }
      
      try {
        const result = await chrome.storage.sync.get([key]);
        this.settingsCache[key] = result[key] || false;
        return this.settingsCache[key];
      } catch (error) {
        console.error(`Storage get error (attempt ${attempts + 1}/${maxRetries}):`, error);
        attempts++;
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 1.5;
        }
      }
    }
    
    console.error(`Failed to get setting ${key} after ${maxRetries} attempts - using default`);
    this.settingsCache[key] = false;
    return false;
  }

  /**
   * Handle tooltip setting change
   * @param {boolean} isEnabled - Whether publication date display is enabled
   */
  async handleTooltipSettingChange(isEnabled) {
    if (isEnabled) {
      // Enable publication date display for existing videos
      await this.setupTooltips();
    } else {
      // Remove publication dates from video titles
      this.removePublishDatesFromTitles();
    }
  }

  /**
   * Remove publication dates from all video titles
   */
  removePublishDatesFromTitles() {
    const videos = this.findVideos();
    
    videos.forEach(videoElement => {
      // Clean up hover tooltip attributes
      const currentTitle = videoElement.getAttribute('title');
      const currentAriaLabel = videoElement.getAttribute('aria-label');
      
      if (currentTitle && currentTitle.includes('Published:')) {
        const cleanTitle = currentTitle.split('\nPublished:')[0];
        videoElement.setAttribute('title', cleanTitle);
      }
      
      if (currentAriaLabel && currentAriaLabel.includes('Published:')) {
        const cleanAriaLabel = currentAriaLabel.split('\nPublished:')[0];
        videoElement.setAttribute('aria-label', cleanAriaLabel);
      }
      
      // Clean up visible title display using CSS classes
      const titleElement = this.findVideoTitleElement(videoElement);
      if (titleElement) {
        titleElement.classList.remove('youwatch-has-publish-date');
        titleElement.removeAttribute('data-publish-date');
        titleElement.removeAttribute('data-video-id');
      }
    });
    
    // Also clean up any stray elements that might have the class
    const allTitleElements = document.querySelectorAll('.youwatch-has-publish-date');
    allTitleElements.forEach(element => {
      element.classList.remove('youwatch-has-publish-date');
      element.removeAttribute('data-publish-date');
      element.removeAttribute('data-video-id');
    });
  }

  /**
   * Format publication date for cleaner display
   * @param {string} publishDate - Raw publication date
   * @returns {string} Formatted date
   */
  formatPublishDate(publishDate) {
    if (!publishDate) return '';
    
    // Clean up common date formats
    let formatted = publishDate.trim();
    
    // Remove "Published" prefix if present
    formatted = formatted.replace(/^(Published|Uploaded|Streamed)\s*:?\s*/i, '');
    
    // Remove view count information that often appears before the date
    // Pattern: "62K views 11h ago" -> "11h ago"
    // Pattern: "1.2M views 2 days ago" -> "2 days ago"
    // Pattern: "123 views 1 week ago" -> "1 week ago"
    formatted = formatted.replace(/^[\d,.]+(K|M|B)?\s+views?\s+/i, '');
    formatted = formatted.replace(/^[\d,]+\s+views?\s+/i, '');
    
    // Extract just the time ago part if there are multiple pieces of information
    // Look for patterns like "X time ago" and extract only that part
    const timeAgoMatch = formatted.match(/(\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago)/i);
    if (timeAgoMatch) {
      formatted = timeAgoMatch[1];
    }
    
    // Simplify "X time ago" format
    formatted = formatted.replace(/(\d+)\s+(year|month|week|day|hour|minute|second)s?\s+ago/i, '$1$2 ago');
    
    // Shorten time units
    formatted = formatted.replace(/years?\s+ago/i, 'y ago');
    formatted = formatted.replace(/months?\s+ago/i, 'mo ago');
    formatted = formatted.replace(/weeks?\s+ago/i, 'w ago');
    formatted = formatted.replace(/days?\s+ago/i, 'd ago');
    formatted = formatted.replace(/hours?\s+ago/i, 'h ago');
    formatted = formatted.replace(/minutes?\s+ago/i, 'm ago');
    formatted = formatted.replace(/seconds?\s+ago/i, 's ago');
    
    return formatted;
  }

  /**
   * Escape HTML characters in text
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handles messages from background script
   * @param {Object} data - Message data
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response function
   */
  handleMessage(data, sender, sendResponse) {
    try {
      switch (data.action) {
        case "youtube-refresh":
          this.refresh();
          break;
          
        case "youtube-mark":
          this.watchDates[data.videoId] = data.timestamp;
          const videos = this.findVideos(data.videoId);
          videos.forEach(video => this.markVideo(video, data.videoId));
          break;
          
        default:
          console.warn("Unknown action:", data.action);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
    
    sendResponse(null);
  }

  /**
   * Get current video ID from URL
   * @returns {string} Current video ID
   */
  getCurrentVideoId() {
    const url = window.location.href;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  /**
   * Set up observer for rating button interactions
   */
  setupRatingObserver() {
    // Use event delegation to catch dynamically loaded content
    document.addEventListener('click', this.handleRatingClick.bind(this), true);
    
    // Also observe for button state changes via MutationObserver
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
   * Handle click events on rating buttons
   * @param {Event} event - Click event
   */
  handleRatingClick(event) {
    const target = event.target.closest('button, [role="button"]');
    if (target && this.isRatingButton(target)) {
      // Small delay to ensure state has updated
      setTimeout(() => {
        this.handleRatingButtonChange(target);
      }, 100);
    }
  }

  /**
   * Check if element is a like or dislike button
   * @param {Element} element - Element to check
   * @returns {boolean} Whether element is a rating button
   */
  isRatingButton(element) {
    if (!element) return false;
    
    // Check various selectors for like/dislike buttons
    const ratingSelectors = [
      'ytd-toggle-button-renderer[target-id="watch-like"]',
      'ytd-toggle-button-renderer[target-id="watch-dislike"]',
      '#segmented-like-button button',
      '#segmented-dislike-button button',
      'button[aria-label*="like"]',
      'button[aria-label*="dislike"]',
      '.ytd-video-primary-info-renderer button[aria-pressed]'
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
   * @param {Element} button - Rating button element
   */
  handleRatingButtonChange(button) {
    try {
      // Check if button is now pressed/active
      const isPressed = button.getAttribute('aria-pressed') === 'true' || 
                       button.classList.contains('style-default-active');
      
      if (isPressed) {
        // Get current video ID from URL
        const videoId = this.getCurrentVideoId();
        if (videoId) {
          const title = this.getCurrentVideoTitle();
          this.markVideoAsWatchedFromRating(videoId, title);
        }
      }
    } catch (error) {
      console.error("Error handling rating button change:", error);
    }
  }

  /**
   * Get current video title from page
   * @returns {string} Current video title
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

  /**
   * Mark video as watched when user rates it
   * @param {string} videoId - Video ID
   * @param {string} title - Video title
   */
  markVideoAsWatchedFromRating(videoId, title) {
    // Use long-lived port if available, fallback to sendMessage
    const message = {
      action: "youtube-ensure",
      videoId: videoId,
      title: title,
    };
    
    if (this.backgroundPort) {
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log("Runtime invalid - skipping rating mark");
        return;
      }
      
      try {
        this.backgroundPort.postMessage(message);
      } catch (error) {
        if (error.message.includes("context invalidated")) {
          console.log("Context invalidated during rating postMessage");
          this.backgroundPort = null;
        } else {
          console.error("Port error in rating mark:", error);
          chrome.runtime.sendMessage(message);
        }
      }
    } else {
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log("Runtime invalid - skipping fallback rating mark");
        return;
      }
      
      chrome.runtime.sendMessage(message);
    }
  }

  /**
   * Handle progress hook events from injected script
   * @param {CustomEvent} event - Progress hook event
   */
  handleProgressHookEvent(event) {
    const { strIdent, strTitle } = event.detail;
    
    if (!strIdent || strIdent.length !== 11) {
      return;
    }
    
    // Use long-lived port if available, fallback to sendMessage
    const message = {
      action: "youtube-ensure",
      videoId: strIdent,
      title: strTitle,
    };
    
    if (this.backgroundPort) {
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log("Runtime invalid - skipping progress hook");
        return;
      }
      
      try {
        this.backgroundPort.postMessage(message);
      } catch (error) {
        if (error.message.includes("context invalidated")) {
          console.log("Context invalidated during progress postMessage");
          this.backgroundPort = null;
        } else {
          console.error("Port error in progress hook:", error);
          chrome.runtime.sendMessage(message);
        }
      }
    } else {
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log("Runtime invalid - skipping fallback progress hook");
        return;
      }
      
      chrome.runtime.sendMessage(message);
    }
  }

  /**
   * Setup periodic check for runtime validity
   */
  setupRuntimeCheck() {
    setInterval(() => {
      if (!this.isStorageAvailable()) {
        console.warn("Runtime/Storage became invalid - attempting reconnect");
        this.connectToBackground();
        // Try to re-cache settings if storage becomes available
        if (this.isStorageAvailable()) {
          this.cacheSettings().catch(error => {
            console.error("Failed to re-cache settings:", error);
          });
        }
      }
    }, 15000); // Check every 15 seconds
  }

  /**
   * Cleanup method to remove observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = new WeakMap();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeWatchMarker();
  });
} else {
  new YouTubeWatchMarker();
}
