/**
 * Modern Options Page Manager for YouTube Watch Marker Extension
 * Replaces jQuery with vanilla JavaScript for better performance and modern standards
 */
class OptionsPageManager {
    constructor() {
        this.isInitialized = false;
        this.loadingContainer = null;
        this.loadingMessage = null;
        this.loadingProgress = null;
        this.loadingClose = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the options page
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Cache DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize theme
            await this.initializeTheme();
            
            // Load initial data
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('Options page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize options page:', error);
        }
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        // Loading elements
        this.loadingContainer = document.getElementById('idLoading_Container');
        this.loadingMessage = document.getElementById('idLoading_Message');
        this.loadingProgress = document.getElementById('idLoading_Progress');
        this.loadingClose = document.getElementById('idLoading_Close');
        
        // Database elements
        this.databaseSize = document.getElementById('idDatabase_Size');
        
        // Timestamp elements
        this.historyTimestamp = document.getElementById('idHistory_Timestamp');
        this.youtubeTimestamp = document.getElementById('idYoutube_Timestamp');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Database operations
        this.getElementById('idDatabase_Export').addEventListener('click', () => this.exportDatabase());
        this.getElementById('idDatabase_Import').querySelector('input[type=file]').addEventListener('change', (event) => this.importDatabase(event));
        this.getElementById('idDatabase_Reset').addEventListener('click', () => this.resetDatabase());

        // Synchronization
        this.getElementById('idHistory_Synchronize').addEventListener('click', () => this.synchronizeHistory());
        this.getElementById('idYoutube_Synchronize').addEventListener('click', () => this.synchronizeYoutube());

        // Toggle buttons for conditions
        this.setupToggleButton('idCondition_Brownav');
        this.setupToggleButton('idCondition_Browhist');
        this.setupToggleButton('idCondition_Youprog');
        this.setupToggleButton('idCondition_Youbadge');
        this.setupToggleButton('idCondition_Youhist');

        // Toggle buttons for visualization
        this.setupToggleButton('idVisualization_Fadeout');
        this.setupToggleButton('idVisualization_Grayout');
        this.setupToggleButton('idVisualization_Showbadge');
        this.setupToggleButton('idVisualization_Showdate');
        this.setupToggleButton('idVisualization_Hideprogress');

        // Search functionality
        this.setupSearchListeners();

        // Loading modal close
        this.loadingClose.addEventListener('click', () => this.hideLoading());
    }

    /**
     * Set up search functionality
     */
    setupSearchListeners() {
        const searchQuery = this.getElementById('idSearch_Query');
        const searchButton = this.getElementById('idSearch_Lookup');
        const searchResults = this.getElementById('idSearch_Results');

        searchButton.addEventListener('click', () => this.performSearch());
        searchQuery.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.performSearch();
            }
        });
    }

    /**
     * Get element by ID with error handling
     * @param {string} id - Element ID
     * @returns {HTMLElement} DOM element
     */
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with ID '${id}' not found`);
        }
        return element;
    }

    /**
     * Set up toggle button functionality
     * @param {string} elementId - Button element ID
     */
    setupToggleButton(elementId) {
        const button = this.getElementById(elementId);
        const icons = button.querySelectorAll('i');
        
        if (icons.length !== 2) {
            console.warn(`Toggle button ${elementId} should have exactly 2 icons`);
            return;
        }

        button.addEventListener('click', async () => {
            try {
                const isEnabled = await this.getToggleState(elementId);
                await this.setToggleState(elementId, !isEnabled);
                this.updateToggleVisuals(button, !isEnabled);
            } catch (error) {
                console.error(`Error toggling ${elementId}:`, error);
            }
        });

        // Initialize visual state
        this.getToggleState(elementId).then(isEnabled => {
            this.updateToggleVisuals(button, isEnabled);
        });
    }

    /**
     * Update toggle button visual state
     * @param {HTMLElement} button - Button element
     * @param {boolean} isEnabled - Whether toggle is enabled
     */
    updateToggleVisuals(button, isEnabled) {
        const icons = button.querySelectorAll('i');
        if (icons.length === 2) {
            icons[0].style.display = isEnabled ? 'none' : 'inline';
            icons[1].style.display = isEnabled ? 'inline' : 'none';
        }
    }

    /**
     * Initialize theme based on system preference
     */
    async initializeTheme() {
        try {
            const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : '');
            
            // Listen for theme changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    document.documentElement.setAttribute('data-bs-theme', e.matches ? 'dark' : '');
                });
            }
        } catch (error) {
            console.error('Error initializing theme:', error);
        }
    }

    /**
     * Export database
     */
    async exportDatabase() {
        try {
            this.showLoading('Exporting database...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'database-export'
            });

            if (response && response.success) {
                const blob = new Blob([response.data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `youtube-watchmarker-${new Date().toISOString().split('T')[0]}.database`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showSuccess('Database exported successfully');
            } else {
                this.showError('Failed to export database');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Export failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Import database from file
     * @param {Event} event - File input change event
     */
    async importDatabase(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.showLoading('Importing database...');
            
            const fileContent = await this.readFileAsText(file);
            
            const response = await chrome.runtime.sendMessage({
                action: 'database-import',
                data: fileContent
            });

            if (response && response.success) {
                this.showSuccess('Database imported successfully');
                await this.loadInitialData(); // Refresh displayed data
            } else {
                this.showError('Failed to import database');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showError('Import failed: ' + error.message);
        } finally {
            this.hideLoading();
            event.target.value = ''; // Clear file input
        }
    }

    /**
     * Read file as text using modern FileReader API
     * @param {File} file - File to read
     * @returns {Promise<string>} File content as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Reset database
     */
    async resetDatabase() {
        if (!confirm('Are you sure you want to reset the database? This action cannot be undone.')) {
            return;
        }

        try {
            this.showLoading('Resetting database...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'database-reset'
            });

            if (response && response.success) {
                this.showSuccess('Database reset successfully');
                await this.loadInitialData(); // Refresh displayed data
            } else {
                this.showError('Failed to reset database');
            }
        } catch (error) {
            console.error('Reset error:', error);
            this.showError('Reset failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Synchronize browser history
     */
    async synchronizeHistory() {
        try {
            this.showLoading('Synchronizing history...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'history-synchronize'
            });

            if (response && response.success) {
                this.showSuccess('History synchronized successfully');
                await this.loadInitialData(); // Refresh displayed data
            } else {
                this.showError('Failed to synchronize history');
            }
        } catch (error) {
            console.error('History sync error:', error);
            this.showError('History sync failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Synchronize YouTube data
     */
    async synchronizeYoutube() {
        try {
            this.showLoading('Synchronizing YouTube data...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'youtube-synchronize'
            });

            if (response && response.success) {
                this.showSuccess('YouTube data synchronized successfully');
                await this.loadInitialData(); // Refresh displayed data
            } else {
                this.showError('Failed to synchronize YouTube data');
            }
        } catch (error) {
            console.error('YouTube sync error:', error);
            this.showError('YouTube sync failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Perform search
     */
    async performSearch() {
        const searchQuery = this.getElementById('idSearch_Query');
        const searchButton = this.getElementById('idSearch_Lookup');
        const searchResults = this.getElementById('idSearch_Results');
        const query = searchQuery.value.trim();

        if (!query) {
            searchResults.innerHTML = '<p class="text-muted">Please enter a search query</p>';
            return;
        }

        try {
            // Update button state
            const icons = searchButton.querySelectorAll('i');
            if (icons.length === 2) {
                icons[0].style.display = 'none';
                icons[1].style.display = 'inline';
            }

            const response = await chrome.runtime.sendMessage({
                action: 'search-videos',
                query: query
            });

            if (response && response.success) {
                this.displaySearchResults(response.results);
            } else {
                searchResults.innerHTML = '<p class="text-danger">Search failed</p>';
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = '<p class="text-danger">Search error: ' + error.message + '</p>';
        } finally {
            // Reset button state
            const icons = searchButton.querySelectorAll('i');
            if (icons.length === 2) {
                icons[0].style.display = 'inline';
                icons[1].style.display = 'none';
            }
        }
    }

    /**
     * Display search results
     * @param {Array} results - Search results
     */
    displaySearchResults(results) {
        const searchResults = this.getElementById('idSearch_Results');
        
        if (!results || results.length === 0) {
            searchResults.innerHTML = '<p class="text-muted">No results found</p>';
            return;
        }

        const html = results.map(result => `
            <div class="card mb-2">
                <div class="card-body">
                    <h6 class="card-title">${this.escapeHtml(result.title)}</h6>
                    <p class="card-text">
                        <small class="text-muted">
                            Watched: ${this.formatDate(new Date(result.timestamp))} 
                            (${result.count} time${result.count !== 1 ? 's' : ''})
                        </small>
                    </p>
                    <a href="https://www.youtube.com/watch?v=${result.id}" 
                       class="btn btn-sm btn-primary" target="_blank">
                        Watch Again
                    </a>
                </div>
            </div>
        `).join('');

        searchResults.innerHTML = html;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get toggle state from storage
     * @param {string} elementId - Element ID
     * @returns {Promise<boolean>} Toggle state
     */
    async getToggleState(elementId) {
        try {
            const result = await chrome.storage.sync.get([elementId]);
            return result[elementId] || false;
        } catch (error) {
            console.error(`Error getting toggle state for ${elementId}:`, error);
            return false;
        }
    }

    /**
     * Set toggle state in storage
     * @param {string} elementId - Element ID
     * @param {boolean} state - New state
     */
    async setToggleState(elementId, state) {
        try {
            await chrome.storage.sync.set({ [elementId]: state });
        } catch (error) {
            console.error(`Error setting toggle state for ${elementId}:`, error);
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            await Promise.all([
                this.updateDatabaseSize(),
                this.updateHistoryTimestamp(),
                this.updateYoutubeTimestamp()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    /**
     * Update database size display
     */
    async updateDatabaseSize() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'database-size'
            });

            if (response && response.success) {
                this.databaseSize.textContent = parseInt(response.size || 0).toLocaleString();
            }
        } catch (error) {
            console.error('Error updating database size:', error);
            this.databaseSize.textContent = 'Error';
        }
    }

    /**
     * Update history timestamp display
     */
    async updateHistoryTimestamp() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'history-timestamp'
            });

            if (response && response.success && response.timestamp) {
                const date = new Date(response.timestamp);
                this.historyTimestamp.textContent = this.formatDate(date);
            } else {
                this.historyTimestamp.textContent = 'Never';
            }
        } catch (error) {
            console.error('Error updating history timestamp:', error);
            this.historyTimestamp.textContent = 'Error';
        }
    }

    /**
     * Update YouTube timestamp display
     */
    async updateYoutubeTimestamp() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'youtube-timestamp'
            });

            if (response && response.success && response.timestamp) {
                const date = new Date(response.timestamp);
                this.youtubeTimestamp.textContent = this.formatDate(date);
            } else {
                this.youtubeTimestamp.textContent = 'Never';
            }
        } catch (error) {
            console.error('Error updating YouTube timestamp:', error);
            this.youtubeTimestamp.textContent = 'Error';
        }
    }

    /**
     * Format date for display
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        if (!date || isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Show loading modal
     * @param {string} message - Loading message
     */
    showLoading(message) {
        if (this.loadingContainer && this.loadingMessage && this.loadingProgress && this.loadingClose) {
            this.loadingContainer.style.display = 'block';
            this.loadingMessage.textContent = message;
            this.loadingProgress.textContent = '...';
            this.loadingClose.classList.add('disabled');
        }
    }

    /**
     * Hide loading modal
     */
    hideLoading() {
        if (this.loadingContainer && this.loadingClose) {
            this.loadingContainer.style.display = 'none';
            this.loadingClose.classList.remove('disabled');
        }
    }

    /**
     * Update loading progress
     * @param {string} progress - Progress text
     */
    updateLoadingProgress(progress) {
        if (this.loadingProgress) {
            this.loadingProgress.textContent = progress;
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log('Success:', message);
        // Could implement toast notifications here
        alert(message); // Simple fallback
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('Error:', message);
        // Could implement toast notifications here
        alert('Error: ' + message); // Simple fallback
    }
}

// Initialize the options page manager
new OptionsPageManager();
