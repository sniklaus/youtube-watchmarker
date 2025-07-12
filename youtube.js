"use strict";

/**
 * YouTube Watch Marker Content Script
 * Handles marking watched videos on YouTube pages
 */
class YouTubeWatchMarker {
  constructor() {
    this.lastChange = null;
    this.watchDates = {};
    this.observers = new WeakMap();
    this.isProcessing = false;
    
    // Bind methods to preserve 'this' context
    this.refresh = this.refresh.bind(this);
    this.markVideo = this.markVideo.bind(this);
    this.observeVideo = this.observeVideo.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    
    this.init();
  }

  /**
   * Initialize the watch marker
   */
  init() {
    // Set up message listener
    chrome.runtime.onMessage.addListener(this.handleMessage);
    
    // Initial refresh
    this.refresh();
    
    // Set up periodic refresh for dynamic content
    this.setupPeriodicRefresh();
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
        this.refreshTimeout = setTimeout(this.refresh, 100);
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
    
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      
      batch.forEach(video => {
        const videoId = this.extractVideoId(video.href);
        this.markVideo(video, videoId);
        this.observeVideo(video);
        
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
        strMessage: "youtubeLookup",
        strIdent: videoId,
        strTitle: title,
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
   * Handles messages from background script
   * @param {Object} data - Message data
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response function
   */
  handleMessage(data, sender, sendResponse) {
    try {
      switch (data.strMessage) {
        case "youtubeRefresh":
          this.refresh();
          break;
          
        case "youtubeMark":
          this.watchDates[data.strIdent] = data.intTimestamp;
          const videos = this.findVideos(data.strIdent);
          videos.forEach(video => this.markVideo(video, data.strIdent));
          break;
          
        default:
          console.warn("Unknown message type:", data.strMessage);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
    
    sendResponse(null);
  }

  /**
   * Cleanup method to remove observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = new WeakMap();
  }
}

// Initialize the YouTube Watch Marker
const watchMarker = new YouTubeWatchMarker();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  watchMarker.cleanup();
});
