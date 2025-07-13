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
    this.tooltipElements = new Map(); // Track custom tooltips
    this.cssInjected = false; // Track if CSS is injected
    
    // Bind methods to preserve 'this' context
    this.refresh = this.refresh.bind(this);
    this.markVideo = this.markVideo.bind(this);
    this.observeVideo = this.observeVideo.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.setupTooltips = this.setupTooltips.bind(this);
    this.extractPublishDate = this.extractPublishDate.bind(this);
    this.createCustomTooltip = this.createCustomTooltip.bind(this);
    this.injectCSS = this.injectCSS.bind(this);
    
    this.init().catch(error => {
      console.error('Failed to initialize YouTubeWatchMarker:', error);
    });
  }

  /**
   * Initialize the extension
   */
  async init() {
    await this.injectCSS();
    this.setupPeriodicRefresh();
    this.setupRatingObserver();
    await this.setupTooltips();
    this.refresh();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage);
    
    // Listen for storage changes to update tooltip settings
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        // Handle CSS changes
        const cssKeys = ['stylesheet_Fadeout', 'stylesheet_Grayout', 'stylesheet_Showbadge', 'stylesheet_Showdate', 'stylesheet_Hideprogress'];
        const visualKeys = ['idVisualization_Fadeout', 'idVisualization_Grayout', 'idVisualization_Showbadge', 'idVisualization_Showdate', 'idVisualization_Hideprogress'];
        
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
  }

  /**
   * Inject CSS styles for custom tooltips and stored stylesheet settings
   */
  async injectCSS() {
    if (this.cssInjected) return;
    
    try {
      // Get all settings from storage
      const settings = await chrome.storage.sync.get([
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
      ]);

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

      // Add tooltip CSS
      cssContent += `
        /* Simple Publication Date Tooltip */
        .youwatch-date-tooltip {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Roboto', 'Arial', sans-serif;
          font-size: 11px;
          font-weight: 500;
          line-height: 1.2;
          white-space: nowrap;
          z-index: 10000;
          pointer-events: none;
          opacity: 0;
          animation: dateTooltipFadeIn 0.15s ease-out forwards;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(4px);
        }

        @keyframes dateTooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Dark theme adjustments */
        [data-bs-theme="dark"] .youwatch-date-tooltip {
          background: rgba(40, 40, 40, 0.9);
          color: #ffffff;
        }

        /* Light theme adjustments */
        [data-bs-theme="light"] .youwatch-date-tooltip {
          background: rgba(0, 0, 0, 0.85);
          color: #ffffff;
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
          this.setupTooltips(); // Re-setup tooltips for new content
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
        
        // Aria label selectors
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
        
        // Alternative layouts
        '.ytd-video-meta-block span',
        '.metadata-line span',
        '[id*="metadata"] span',
        '.video-meta span'
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
    this.isProcessing = true;
    
    try {
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
   * Processes videos in batches to improve performance
   * @param {Element[]} videos - Array of video elements
   */
  async processVideosInBatches(videos) {
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 10; // ms
    
    // Check if tooltips are enabled once for this batch processing
    const tooltipsEnabled = await this.getSettingValue('idVisualization_Showpublishdate');
    
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      
      batch.forEach(video => {
        const videoId = this.extractVideoId(video.href);
        this.markVideo(video, videoId);
        this.observeVideo(video);
        
        // Extract and store publication date
        const publishDate = this.extractPublishDate(video);
        if (publishDate && !this.publishDates[videoId]) {
          this.publishDates[videoId] = publishDate;
        }
        
        // Set up tooltip if enabled and not already set up
        if (tooltipsEnabled && !this.tooltipElements.has(video)) {
          this.createCustomTooltip(video, videoId);
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
   * Requests video data from background script
   * @param {Element} videoElement - Video element
   * @param {string} videoId - Video ID
   */
  requestVideoData(videoElement, videoId) {
    const title = this.extractVideoTitle(videoElement);
    
    chrome.runtime.sendMessage(
      {
        action: "youtube-lookup",
        videoId: videoId,
        title: title,
      },
      (response) => {
        if (response && response.strIdent) {
          this.watchDates[response.strIdent] = response.intTimestamp;
          
          // Mark all videos with this ID
          const videosWithId = this.findVideos(response.strIdent);
          videosWithId.forEach(video => this.markVideo(video, response.strIdent));
        }
      }
    );
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
   * Sets up custom tooltips for video elements
   */
  async setupTooltips() {
    // Check if publication date tooltips are enabled
    const isEnabled = await this.getSettingValue('idVisualization_Showpublishdate');
    if (!isEnabled) {
      return;
    }
    
    const videos = this.findVideos();
    
    videos.forEach(videoElement => {
      const videoId = this.extractVideoId(videoElement.href);
      
      // Skip if tooltip already exists
      if (this.tooltipElements.has(videoElement)) {
        return;
      }
      
      // Create custom tooltip
      this.createCustomTooltip(videoElement, videoId);
    });
  }

  /**
   * Get a setting value from storage
   * @param {string} key - Setting key
   * @returns {Promise<boolean>} Setting value
   */
  async getSettingValue(key) {
    try {
      const result = await chrome.storage.sync.get([key]);
      return result[key] || false;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Handle tooltip setting change
   * @param {boolean} isEnabled - Whether tooltips are enabled
   */
  async handleTooltipSettingChange(isEnabled) {
    if (isEnabled) {
      // Enable tooltips for existing videos
      await this.setupTooltips();
    } else {
      // Disable and clean up existing tooltips
      this.cleanupTooltips();
    }
  }

  /**
   * Clean up all existing tooltips
   */
  cleanupTooltips() {
    this.tooltipElements.forEach((handlers, videoElement) => {
      videoElement.removeEventListener('mouseenter', handlers.showTooltip);
      videoElement.removeEventListener('mouseleave', handlers.hideTooltip);
    });
    this.tooltipElements.clear();
  }

  /**
   * Creates a custom tooltip for a video element
   * @param {Element} videoElement - Video element
   * @param {string} videoId - Video ID
   */
  createCustomTooltip(videoElement, videoId) {
    let tooltip = null;
    let hideTimeout = null;
    
    const showTooltip = (event) => {
      clearTimeout(hideTimeout);
      
      // Get publication date
      const publishDate = this.publishDates[videoId] || this.extractPublishDate(videoElement);
      
      // Skip if no publication date found
      if (!publishDate) {
        return;
      }
      
      // Format the date text for cleaner display
      const cleanDate = this.formatPublishDate(publishDate);
      
      // Create simple tooltip element
      tooltip = document.createElement('div');
      tooltip.className = 'youwatch-date-tooltip';
      tooltip.textContent = cleanDate;
      
      // Position tooltip closer to thumbnail
      this.positionDateTooltip(tooltip, videoElement);
      
      document.body.appendChild(tooltip);
    };
    
    const hideTooltip = () => {
      hideTimeout = setTimeout(() => {
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
          tooltip = null;
        }
      }, 50);
    };
    
    // Add event listeners
    videoElement.addEventListener('mouseenter', showTooltip);
    videoElement.addEventListener('mouseleave', hideTooltip);
    
    // Track tooltip for cleanup
    this.tooltipElements.set(videoElement, { showTooltip, hideTooltip });
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
   * Position date tooltip closer to thumbnail
   * @param {Element} tooltip - Tooltip element
   * @param {Element} videoElement - Video element
   */
  positionDateTooltip(tooltip, videoElement) {
    const rect = videoElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Position tooltip in the bottom-left corner of the thumbnail (like YouTube's duration badge)
    let left = rect.left + 8;
    let top = rect.bottom - tooltipRect.height - 8;
    
    // Adjust horizontal position if tooltip goes off-screen
    if (left + tooltipRect.width > viewportWidth) {
      left = rect.right - tooltipRect.width - 8;
    }
    
    // Adjust vertical position if tooltip goes off-screen
    if (top < 0) {
      top = rect.bottom + 5; // Position below thumbnail if no room above
    }
    
    // Ensure tooltip stays within viewport
    left = Math.max(5, Math.min(left, viewportWidth - tooltipRect.width - 5));
    top = Math.max(5, Math.min(top, viewportHeight - tooltipRect.height - 5));
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.zIndex = '10000';
  }

  /**
   * Position date tooltip closer to thumbnail
   * @param {Element} tooltip - Tooltip element
   * @param {Element} videoElement - Video element
   */
  positionDateTooltip(tooltip, videoElement) {
    const rect = videoElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.left + 10; // Position to the right of the thumbnail
    let top = rect.bottom - tooltipRect.height - 5; // Position above the thumbnail

    // Adjust horizontal position if tooltip goes off-screen
    if (left + tooltipRect.width > viewportWidth) {
      left = rect.right - tooltipRect.width - 10; // Position to the left of the thumbnail
    }

    // Adjust vertical position if tooltip goes off-screen
    if (top < 0) { // If it goes above the viewport
      top = rect.bottom + 5; // Position below the thumbnail
    }

    // Ensure tooltip stays within viewport
    left = Math.max(5, Math.min(left, viewportWidth - tooltipRect.width - 5));
    top = Math.max(5, Math.min(top, viewportHeight - tooltipRect.height - 5));

    tooltip.style.position = 'fixed';
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.zIndex = '10000';
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
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
    console.log("Video rated, marking as watched:", videoId, title);
    
    chrome.runtime.sendMessage(
      {
        action: "youtube-ensure",
        videoId: videoId,
        title: title,
      },
      (response) => {
        if (response && response.strIdent) {
          this.watchDates[response.strIdent] = response.intTimestamp;
          
          // Mark all videos with this ID on current page
          const videosWithId = this.findVideos(response.strIdent);
          videosWithId.forEach(video => this.markVideo(video, response.strIdent));
          
          console.log("Video marked as watched from rating:", videoId);
        }
      }
    );
  }

  /**
   * Cleanup method to remove observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = new WeakMap();
    this.tooltipElements.forEach(tooltip => {
      tooltip.showTooltip.disconnect();
      tooltip.hideTooltip.disconnect();
    });
    this.tooltipElements.clear();
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
