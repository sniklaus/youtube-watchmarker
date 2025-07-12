import { getStorageAsync, setStorageAsync } from '../utils.js';

/**
 * Extension options page manager
 */
class OptionsPageManager {
  constructor() {
    this.connections = {
      database: chrome.runtime.connect({ name: "database" }),
      history: chrome.runtime.connect({ name: "history" }),
      youtube: chrome.runtime.connect({ name: "youtube" }),
      search: chrome.runtime.connect({ name: "search" })
    };
    
    this.init();
  }

  /**
   * Initialize the options page
   */
  async init() {
    await this.setupTheme();
    await this.setupEventListeners();
    await this.loadInitialData();
  }

  /**
   * Setup theme switching based on user preference
   */
  async setupTheme() {
    const updateTheme = () => {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      jQuery("html").attr("data-bs-theme", isDark ? "dark" : "");
    };

    // Initial theme setup
    updateTheme();

    // Listen for theme changes
    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", updateTheme);
  }

  /**
   * Setup all event listeners for the options page
   */
  async setupEventListeners() {
    // Database operations
    this.setupDatabaseListeners();
    
    // History operations
    this.setupHistoryListeners();
    
    // YouTube operations
    this.setupYouTubeListeners();
    
    // Search operations
    this.setupSearchListeners();
    
    // Settings operations
    this.setupSettingsListeners();
  }

  /**
   * Setup database-related event listeners
   */
  setupDatabaseListeners() {
    // Export database
    jQuery("#idDatabase_Export").on("click", () => {
      this.showLoading("exporting database");
      this.connections.database.postMessage({
        strMessage: "databaseExport",
        objRequest: {},
      });
    });

    // Import database
    jQuery("#idDatabase_Import input[type=file]").on("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        this.handleDatabaseImport(file);
      }
    });

    // Reset database
    jQuery("#idDatabase_Reset").on("click", () => {
      if (confirm("Are you sure you want to reset the database? This will delete all your watch history.")) {
        this.showLoading("resetting database");
        this.connections.database.postMessage({
          strMessage: "databaseReset",
          objRequest: {},
        });
      }
    });

    // Database message listener
    this.connections.database.onMessage.addListener((data) => {
      this.handleDatabaseMessage(data);
    });
  }

  /**
   * Handle database file import
   * @param {File} file - The database file to import
   */
  async handleDatabaseImport(file) {
    try {
      this.showLoading("importing database");
      
      const text = await this.readFileAsText(file);
      const videos = JSON.parse(text);
      
      this.connections.database.postMessage({
        strMessage: "databaseImport",
        objRequest: { objVideos: videos },
      });
    } catch (error) {
      console.error("Error importing database:", error);
      this.showError("Failed to import database. Please check the file format.");
    }
  }

  /**
   * Read file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File content as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * Handle database-related messages
   * @param {Object} data - Message data
   */
  handleDatabaseMessage(data) {
    switch (data.strMessage) {
      case "databaseExport":
        this.hideLoading();
        if (data.objResponse === null) {
          this.showError("Error exporting database");
        } else {
          this.showSuccess("Database exported successfully");
        }
        break;
        
      case "databaseImport":
        this.hideLoading();
        if (data.objResponse === null) {
          this.showError("Error importing database");
        } else {
          this.showSuccess("Database imported successfully");
          this.loadDatabaseSize();
        }
        break;
        
      case "databaseReset":
        this.hideLoading();
        window.location.reload();
        break;
        
      case "databaseExport-progress":
      case "databaseImport-progress":
        this.updateProgress(data.objResponse.strProgress);
        break;
    }
  }

  /**
   * Setup history-related event listeners
   */
  setupHistoryListeners() {
    jQuery("#idHistory_Synchronize").on("click", () => {
      this.showLoading("synchronizing history");
      this.connections.history.postMessage({
        strMessage: "historySynchronize",
        objRequest: { intTimestamp: 0 },
      });
    });

    this.connections.history.onMessage.addListener((data) => {
      this.handleHistoryMessage(data);
    });
  }

  /**
   * Handle history-related messages
   * @param {Object} data - Message data
   */
  handleHistoryMessage(data) {
    switch (data.strMessage) {
      case "historySynchronize":
        this.hideLoading();
        if (data.objResponse === null) {
          this.showError("Error synchronizing history");
        } else {
          this.showSuccess("History synchronized successfully");
          this.loadHistoryTimestamp();
        }
        break;
        
      case "historySynchronize-progress":
        this.updateProgress(data.objResponse.strProgress);
        break;
    }
  }

  /**
   * Setup YouTube-related event listeners
   */
  setupYouTubeListeners() {
    jQuery("#idYoutube_Synchronize").on("click", () => {
      this.showLoading("synchronizing youtube");
      this.connections.youtube.postMessage({
        strMessage: "youtubeSynchronize",
        objRequest: { intThreshold: 1000000 },
      });
    });

    this.connections.youtube.onMessage.addListener((data) => {
      this.handleYouTubeMessage(data);
    });
  }

  /**
   * Handle YouTube-related messages
   * @param {Object} data - Message data
   */
  handleYouTubeMessage(data) {
    switch (data.strMessage) {
      case "youtubeSynchronize":
        this.hideLoading();
        if (data.objResponse === null) {
          this.showError("Error synchronizing YouTube");
        } else {
          this.showSuccess("YouTube synchronized successfully");
          this.loadYouTubeTimestamp();
        }
        break;
        
      case "youtubeSynchronize-progress":
        this.updateProgress(data.objResponse.strProgress);
        break;
    }
  }

  /**
   * Setup search-related event listeners
   */
  setupSearchListeners() {
    // Search functionality would go here
    // This is a placeholder for future search features
  }

  /**
   * Setup settings-related event listeners
   */
  setupSettingsListeners() {
    // Settings toggles and other configuration options
    // This would handle the various checkboxes and settings in the UI
    this.setupConditionToggles();
    this.setupVisualizationToggles();
  }

  /**
   * Setup condition toggle buttons
   */
  setupConditionToggles() {
    const conditions = ['Brownav', 'Browhist', 'Youprog', 'Youbadge', 'Youhist'];
    
    conditions.forEach(condition => {
      this.setupToggle(`idCondition_${condition}`, `extensions.Youwatch.Condition.bool${condition}`);
    });
  }

  /**
   * Setup visualization toggle buttons
   */
  setupVisualizationToggles() {
    const visualizations = ['Fadeout', 'Grayout', 'Showbadge', 'Showdate', 'Hideprogress'];
    
    visualizations.forEach(visualization => {
      this.setupToggle(`idVisualization_${visualization}`, `extensions.Youwatch.Visualization.bool${visualization}`);
    });
  }

  /**
   * Setup a toggle button
   * @param {string} elementId - Element ID
   * @param {string} storageKey - Storage key
   */
  async setupToggle(elementId, storageKey) {
    const element = jQuery(`#${elementId}`);
    if (element.length === 0) return;

    // Load initial state
    const isEnabled = await getStorageAsync(storageKey) === "true";
    this.updateToggleState(element, isEnabled);

    // Handle clicks
    element.on("click", async () => {
      const currentState = await getStorageAsync(storageKey) === "true";
      const newState = !currentState;
      
      await setStorageAsync(storageKey, String(newState));
      this.updateToggleState(element, newState);
    });
  }

  /**
   * Update toggle button visual state
   * @param {jQuery} element - jQuery element
   * @param {boolean} isEnabled - Whether the toggle is enabled
   */
  updateToggleState(element, isEnabled) {
    const uncheckedIcon = element.find('.fa-square');
    const checkedIcon = element.find('.fa-check-square');
    
    if (isEnabled) {
      uncheckedIcon.hide();
      checkedIcon.show();
      element.addClass('active');
    } else {
      uncheckedIcon.show();
      checkedIcon.hide();
      element.removeClass('active');
    }
  }

  /**
   * Load initial data for the options page
   */
  async loadInitialData() {
    await this.loadDatabaseSize();
    await this.loadHistoryTimestamp();
    await this.loadYouTubeTimestamp();
  }

  /**
   * Load and display database size
   */
  async loadDatabaseSize() {
    try {
      const size = await getStorageAsync("extensions.Youwatch.Database.intSize");
      jQuery("#idDatabase_Size").text(parseInt(size || 0));
    } catch (error) {
      console.error("Error loading database size:", error);
    }
  }

  /**
   * Load and display history timestamp
   */
  async loadHistoryTimestamp() {
    try {
      const timestamp = await getStorageAsync("extensions.Youwatch.History.intTimestamp");
      const date = new Date(parseInt(timestamp || 0));
      jQuery("#idHistory_Timestamp").text(this.formatDate(date));
    } catch (error) {
      console.error("Error loading history timestamp:", error);
    }
  }

  /**
   * Load and display YouTube timestamp
   */
  async loadYouTubeTimestamp() {
    try {
      const timestamp = await getStorageAsync("extensions.Youwatch.Youtube.intTimestamp");
      const date = new Date(parseInt(timestamp || 0));
      jQuery("#idYoutube_Timestamp").text(this.formatDate(date));
    } catch (error) {
      console.error("Error loading YouTube timestamp:", error);
    }
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    return date.toLocaleDateString() + " - " + date.toLocaleTimeString();
  }

  /**
   * Show loading dialog
   * @param {string} message - Loading message
   */
  showLoading(message) {
    jQuery("#idLoading_Container").show();
    jQuery("#idLoading_Message").text(message);
    jQuery("#idLoading_Progress").text("...");
    jQuery("#idLoading_Close").addClass("disabled");
  }

  /**
   * Hide loading dialog
   */
  hideLoading() {
    jQuery("#idLoading_Container").hide();
    jQuery("#idLoading_Close").removeClass("disabled");
  }

  /**
   * Update progress text
   * @param {string} progress - Progress message
   */
  updateProgress(progress) {
    jQuery("#idLoading_Progress").text(progress);
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    // This would show a success notification
    console.log("Success:", message);
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // This would show an error notification
    console.error("Error:", message);
  }
}

// Initialize the options page when DOM is ready
jQuery(document).ready(() => {
  new OptionsPageManager();
});
