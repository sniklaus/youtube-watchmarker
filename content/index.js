/**
 * Modern Options Page Manager for YouTube Watch Marker Extension
 * Enhanced with modern JavaScript patterns, improved UX, and accessibility features
 */
class OptionsPageManager {
    constructor() {
        this.isInitialized = false;
        this.themeToggle = null;
        this.bootstrap = null;
        
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
            // Wait for Bootstrap to be available
            await this.waitForBootstrap();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize theme
            await this.initializeTheme();
            
            // Load initial data
            await this.loadInitialData();
            
            // Add page animations
            this.addPageAnimations();
            
            
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize options page:', error);
            this.showError('Failed to initialize the options page. Please refresh and try again.');
        }
    }

    /**
     * Wait for Bootstrap to be available
     */
    async waitForBootstrap() {
        return new Promise((resolve) => {
            const checkBootstrap = () => {
                if (window.bootstrap) {
                    this.bootstrap = window.bootstrap;
                    resolve();
                } else {
                    setTimeout(checkBootstrap, 100);
                }
            };
            checkBootstrap();
        });
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        const elementIds = [
            'theme-toggle', 'theme-icon', 'idDatabase_Size', 'provider_indexeddb',
            'provider_supabase', 'enable_auto_sync', 'supabase-config',
            'supabase_url', 'supabase_api_key', 'supabase_jwt_token',
            'search-icon', 'search-spinner', 'successToast', 'errorToast',
            'successToastMessage', 'errorToastMessage', 'sr-announcements'
        ];

        elementIds.forEach(id => {
            try {
                const element = document.getElementById(id);
                if (!element) {
                    console.warn(`Element with ID '${id}' not found in the DOM.`);
                } else {
                    // console.log(`Successfully cached element '${id}'`);
                }
            } catch (e) {
                console.error(`Error while trying to get element with ID '${id}':`, e);
            }
        });


        // Theme toggle
        this.themeToggle = this.getElementById('theme-toggle');
        this.themeIcon = this.getElementById('theme-icon');
        
        // Database elements
        this.databaseSize = this.getElementById('idDatabase_Size');
        
        // Database provider elements
        this.providerIndexedDB = this.getElementById('provider_indexeddb');
        this.providerSupabase = this.getElementById('provider_supabase');
        this.enableAutoSync = this.getElementById('enable_auto_sync');
        this.supabaseConfig = this.getElementById('supabase-config');
        
        // Supabase configuration elements
        this.supabaseUrl = this.getElementById('supabase_url');
        this.supabaseApiKey = this.getElementById('supabase_api_key');
        this.supabaseJwtToken = this.getElementById('supabase_jwt_token');
        
        // Current configuration display elements
        this.currentConfig = this.getElementById('current-config');
        this.currentUrl = this.getElementById('current-url');
        this.currentApiKey = this.getElementById('current-api-key');
        this.currentJwtToken = this.getElementById('current-jwt-token');
        
        // Search elements
        this.searchIcon = this.getElementById('search-icon');
        this.searchSpinner = this.getElementById('search-spinner');
        
        // Toast elements
        this.successToast = new this.bootstrap.Toast(this.getElementById('successToast'));
        this.errorToast = new this.bootstrap.Toast(this.getElementById('errorToast'));
        this.successToastMessage = this.getElementById('successToastMessage');
        this.errorToastMessage = this.getElementById('errorToastMessage');
        
        // Screen reader announcements
        this.srAnnouncements = this.getElementById('sr-announcements');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        try {
            // Database operations
            this.getElementById('idDatabase_Export').addEventListener('click', () => this.exportDatabase());
            this.getElementById('idDatabase_Import').parentElement.querySelector('input[type=file]').addEventListener('change', (event) => this.importDatabase(event));
            this.getElementById('idDatabase_Reset').addEventListener('click', () => this.resetDatabase());

            // Database Provider
            this.getElementById('idDatabase_Sync').addEventListener('click', () => this.syncDatabases());
            this.providerIndexedDB.addEventListener('change', () => this.switchDatabaseProvider('indexeddb'));
            this.providerSupabase.addEventListener('change', () => this.switchDatabaseProvider('supabase'));
            this.enableAutoSync.addEventListener('change', (event) => this.toggleAutoSync(event));
            
            // Supabase Configuration
            this.getElementById('supabase_save').addEventListener('click', () => this.saveSupabaseConfig());
            this.getElementById('supabase_test').addEventListener('click', () => this.testSupabaseConnection());
            this.getElementById('supabase_clear').addEventListener('click', () => this.clearSupabaseConfig());

            // Toggle switches for conditions (using new form-switch format)
            this.setupToggleSwitch('idCondition_Brownav');
            this.setupToggleSwitch('idCondition_Browhist');
            this.setupToggleSwitch('idCondition_Youprog');
            this.setupToggleSwitch('idCondition_Youbadge');
            this.setupToggleSwitch('idCondition_Youhist');
            this.setupToggleSwitch('idCondition_Yourating');

            // Toggle switches for visualization
            this.setupToggleSwitch('idVisualization_Fadeout');
            this.setupToggleSwitch('idVisualization_Grayout');
            this.setupToggleSwitch('idVisualization_Showbadge');
            this.setupToggleSwitch('idVisualization_Showdate');
            this.setupToggleSwitch('idVisualization_Hideprogress');
            this.setupToggleSwitch('idVisualization_Showpublishdate');

            // Search functionality
            this.setupSearchListeners();

            // Synchronization
            this.setupSynchronizationListeners();

            // Theme toggle
            this.themeToggle.addEventListener('click', () => this.toggleTheme());

            // Keyboard shortcuts
            this.setupKeyboardShortcuts();
                } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    /**
     * Set up search functionality
     */
    setupSearchListeners() {
        const searchQuery = this.getElementById('idSearch_Query');
        const searchButton = this.getElementById('idSearch_Lookup');

        // Initialize pagination state
        this.searchState = {
            currentQuery: '',
            currentPage: 1,
            pageSize: 50,
            totalResults: 0,
            isSearching: false
        };

        // Search button click
        searchButton.addEventListener('click', () => this.performSearch());
        
        // Enter key search
        searchQuery.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.performSearch();
            }
        });
        
        // Auto-search with debounce (1 second delay)
        let searchTimeout;
        searchQuery.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                const query = searchQuery.value.trim();
                
                // Reset to first page when query changes
                this.searchState.currentPage = 1;
                this.searchState.currentQuery = query;
                
                // Always search (empty query shows all videos)
                this.performSearch();
            }, 1000);
        });

        // Prevent input expansion issues
        searchQuery.addEventListener('focus', (event) => {
            event.target.style.width = 'auto';
        });
        
        searchQuery.addEventListener('blur', (event) => {
            event.target.style.width = 'auto';
        });
    }

    /**
     * Set up synchronization event listeners
     */
    setupSynchronizationListeners() {
        try {
            // Individual sync buttons
            this.getElementById('sync-history').addEventListener('click', () => this.syncBrowserHistory());
            this.getElementById('sync-youtube').addEventListener('click', () => this.syncYouTubeHistory());
            this.getElementById('sync-youtube-likes').addEventListener('click', () => this.syncYouTubeLikes());
            

            
            // Sync all button
            this.getElementById('sync-all').addEventListener('click', () => this.syncAllSources());
        } catch (error) {
            console.error('Error setting up synchronization listeners:', error);
        }
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + K to focus search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.getElementById('idSearch_Query').focus();
            }
            
            // Ctrl/Cmd + E to export database
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                this.exportDatabase();
            }
            
            // Ctrl/Cmd + T to toggle theme
            if ((event.ctrlKey || event.metaKey) && event.key === 't') {
                event.preventDefault();
                this.toggleTheme();
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
            console.error(`Fatal: Element with ID '${id}' was not found in the DOM.`);
            throw new Error(`Element with ID '${id}' not found`);
        }
        return element;
    }

    /**
     * Set up toggle switch functionality (Bootstrap form-switch)
     * @param {string} elementId - Switch element ID
     */
    setupToggleSwitch(elementId) {
        const switchElement = this.getElementById(elementId);
        
        if (!switchElement) {
            console.warn(`Toggle switch ${elementId} not found`);
            return;
        }

        switchElement.addEventListener('change', async () => {
            try {
                const isEnabled = switchElement.checked;
                await this.setToggleState(elementId, isEnabled);
                this.showSuccess(`Setting ${this.getSettingDisplayName(elementId)} ${isEnabled ? 'enabled' : 'disabled'}`);
            } catch (error) {
                console.error(`Error toggling ${elementId}:`, error);
                // Revert the switch state on error
                switchElement.checked = !switchElement.checked;
                this.showError(`Failed to update ${this.getSettingDisplayName(elementId)} setting`);
            }
        });

        // Initialize switch state
        this.getToggleState(elementId).then(isEnabled => {
            switchElement.checked = isEnabled;
        }).catch(error => {
            console.error(`Error loading initial state for ${elementId}:`, error);
        });
    }

    /**
     * Get display name for a setting
     * @param {string} elementId - Element ID
     * @returns {string} Human-readable setting name
     */
    getSettingDisplayName(elementId) {
        const nameMap = {
            'idCondition_Brownav': 'Browser Navigation',
            'idCondition_Browhist': 'Browser History',
            'idCondition_Youprog': 'YouTube Progress',
            'idCondition_Youbadge': 'YouTube Badge',
            'idCondition_Youhist': 'YouTube History',
            'idCondition_Yourating': 'Video Rating',
            'idVisualization_Fadeout': 'Fade Out',
            'idVisualization_Grayout': 'Grayscale',
            'idVisualization_Showbadge': 'Show Badge',
            'idVisualization_Showdate': 'Show Date',
            'idVisualization_Hideprogress': 'Hide Progress Bar',
            'idVisualization_Showpublishdate': 'Show Publication Date'
        };
        return nameMap[elementId] || elementId;
    }

    /**
     * Initialize theme based on saved preference or system preference
     */
    async initializeTheme() {
        try {
            // Get saved theme preference
            const savedTheme = await this.getSavedTheme();
            let theme = savedTheme;
            
            // If no saved theme, use system preference
            if (!theme) {
                const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                theme = isDarkMode ? 'dark' : 'light';
            }
            
            this.setTheme(theme);
            
            // Listen for system theme changes only if no saved preference
            if (!savedTheme && window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    this.setTheme(e.matches ? 'dark' : 'light');
                });
            }
        } catch (error) {
            console.error('Error initializing theme:', error);
        }
    }

    /**
     * Toggle between light and dark theme
     */
    async toggleTheme() {
        try {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            this.setTheme(newTheme);
            await this.saveTheme(newTheme);
            
            this.showSuccess(`Switched to ${newTheme} theme`);
        } catch (error) {
            console.error('Error toggling theme:', error);
            this.showError('Failed to change theme');
        }
    }

    /**
     * Set the theme
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme === 'dark' ? 'dark' : 'light');
        
        // Update theme toggle icon
        if (this.themeIcon) {
            this.themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    /**
     * Get saved theme preference
     * @returns {Promise<string|null>} Saved theme or null
     */
    async getSavedTheme() {
        try {
            const result = await chrome.storage.local.get(['theme']);
            return result.theme || null;
        } catch (error) {
            console.error('Error getting saved theme:', error);
            return null;
        }
    }

    /**
     * Save theme preference
     * @param {string} theme - Theme to save
     */
    async saveTheme(theme) {
        try {
            await chrome.storage.local.set({ theme });
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    }

    /**
     * Add page animations
     */
    addPageAnimations() {
        // Add slide-in animation to cards
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('animate-slide-in-up');
        });
    }



















    /**
     * Export database
     */
    async exportDatabase() {
        try {
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
        }
    }

    /**
     * Import database from file
     * @param {Event} event - File input change event
     */
    async importDatabase(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Find the import button (it's a label wrapping the file input)
        const importButton = event.target.closest('label');
        
        try {
            this.showButtonLoading(importButton, 'Importing...');
            
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
            this.hideButtonLoading(importButton);
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
        }
    }

    /**
     * Switch database provider (UI state only)
     * @param {string} provider - Provider type ('indexeddb' or 'supabase')
     */
    async switchDatabaseProvider(provider) {
        try {
            // Show/hide Supabase configuration based on provider selection
            if (provider === 'supabase') {
                this.supabaseConfig.classList.remove('d-none');
                
                // Load existing configuration if available
                await this.loadSupabaseConfig();
                
                // Don't automatically switch to Supabase - let user configure first
                this.showSuccess('Supabase configuration panel opened. Please configure your database credentials below.');
            } else {
                this.supabaseConfig.classList.add('d-none');
                
                // Switch to IndexedDB immediately since no configuration is needed
                await this.actuallySwitchProvider('indexeddb');
            }
        } catch (error) {
            console.error('Error switching provider UI:', error);
            this.showError('Failed to switch provider: ' + error.message);
            
            // Revert radio button selection
            if (provider === 'supabase') {
                this.providerIndexedDB.checked = true;
                this.providerSupabase.checked = false;
                this.supabaseConfig.classList.add('d-none');
            } else {
                this.providerIndexedDB.checked = false;
                this.providerSupabase.checked = true;
            }
        }
    }

    /**
     * Actually switch the database provider in the background
     * @param {string} provider - Provider type ('indexeddb' or 'supabase')
     */
    async actuallySwitchProvider(provider) {
        const response = await chrome.runtime.sendMessage({
            action: 'database-provider-switch',
            provider: provider
        });

        if (response && response.success) {
            this.showSuccess(`Successfully switched to ${provider === 'indexeddb' ? 'Local Storage' : 'Supabase'}`);
            await this.updateDatabaseSize();
            return true;
        } else {
            throw new Error(response?.error || 'Failed to switch provider');
        }
    }

    /**
     * Toggle automatic synchronization
     * @param {Event} event - Change event
     */
    async toggleAutoSync(event) {
        const isEnabled = event.target.checked;
        
        try {
            // Store the auto-sync preference
            await chrome.storage.local.set({ auto_sync_enabled: isEnabled });
            
            this.showSuccess(`Automatic synchronization ${isEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling auto sync:', error);
            this.showError('Failed to update auto sync setting');
            // Revert checkbox
            event.target.checked = !isEnabled;
        }
    }

    /**
     * Sync databases between providers
     */
    async syncDatabases() {
        const syncButton = this.getElementById('idDatabase_Sync');
        
        try {
            this.showButtonLoading(syncButton, 'Syncing...');
            
            // Get current provider status
            const statusResponse = await chrome.runtime.sendMessage({
                action: 'database-provider-status'
            });
            
            if (!statusResponse || !statusResponse.success) {
                throw new Error('Failed to get provider status');
            }
            
            // Get available providers
            const providersResponse = await chrome.runtime.sendMessage({
                action: 'database-provider-list'
            });
            
            if (!providersResponse || !providersResponse.success) {
                throw new Error('Failed to get available providers');
            }
            
            const availableProviders = providersResponse.providers;
            const supabaseProvider = availableProviders.find(p => p.id === 'supabase');
            
            // Check if Supabase is available
            if (!supabaseProvider || !supabaseProvider.isAvailable) {
                throw new Error('Supabase is not configured. Please configure Supabase credentials first.');
            }
            
            // Perform bidirectional sync between IndexedDB and Supabase
            const response = await chrome.runtime.sendMessage({
                action: 'database-provider-sync',
                providers: ['indexeddb', 'supabase']
            });
            
            if (response && response.success) {
                this.showSuccess(response.message || 'Databases synced successfully');
                await this.updateDatabaseSize();
                
                // Refresh search results to show any changes from sync
                await this.performSearch();
            } else {
                throw new Error(response?.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Error syncing databases:', error);
            this.showError('Sync failed: ' + error.message);
        } finally {
            this.hideButtonLoading(syncButton);
        }
    }

    /**
     * Save Supabase configuration
     */
    async saveSupabaseConfig() {
        try {
            const credentials = {
                supabaseUrl: this.supabaseUrl.value.trim(),
                apiKey: this.supabaseApiKey.value.trim(),
                jwtToken: this.supabaseJwtToken.value.trim() || null
            };

            // Validate required fields
            if (!credentials.supabaseUrl || !credentials.apiKey) {
                this.showError('Please provide both Supabase URL and API Key');
                return;
            }

            const response = await chrome.runtime.sendMessage({
                action: 'supabase-configure',
                credentials: credentials
            });

            if (response && response.success) {
                this.showSuccess('Supabase configuration saved successfully');
                
                // Clear sensitive fields for security
                this.supabaseApiKey.value = '';
                this.supabaseJwtToken.value = '';
                
                // Now try to switch to Supabase
                try {
                    await this.actuallySwitchProvider('supabase');
                } catch (switchError) {
                    console.error('Failed to switch to Supabase after configuration:', switchError);
                    this.showError('Configuration saved but failed to switch to Supabase: ' + switchError.message);
                }
            } else {
                throw new Error(response?.error || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving Supabase config:', error);
            this.showError('Failed to save configuration: ' + error.message);
        }
    }

    /**
     * Test Supabase connection
     */
    async testSupabaseConnection() {
        const testButton = this.getElementById('supabase_test');
        
        try {
            this.showButtonLoading(testButton, 'Testing...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'supabase-test'
            });
            
            if (response && response.success) {
                this.showSuccess(response.message || 'Connection successful');
            } else {
                throw new Error(response?.error || 'Connection failed');
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            this.showError('Connection test failed: ' + error.message);
        } finally {
            this.hideButtonLoading(testButton);
        }
    }

    /**
     * Clear Supabase configuration
     */
    async clearSupabaseConfig() {
        if (!confirm('Are you sure you want to clear the Supabase configuration?')) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'supabase-clear'
            });

            if (response && response.success) {
                // Clear form fields
                this.supabaseUrl.value = '';
                this.supabaseApiKey.value = '';
                this.supabaseJwtToken.value = '';
                
                this.showSuccess('Supabase configuration cleared');
                
                // Switch back to IndexedDB UI and actually switch
                this.providerIndexedDB.checked = true;
                this.providerSupabase.checked = false;
                this.supabaseConfig.classList.add('d-none');
                await this.actuallySwitchProvider('indexeddb');
            } else {
                throw new Error(response?.error || 'Failed to clear configuration');
            }
        } catch (error) {
            console.error('Error clearing Supabase config:', error);
            this.showError('Failed to clear configuration: ' + error.message);
        }
    }

    /**
     * Load existing Supabase configuration
     */
    async loadSupabaseConfig() {
        try {
            // Get masked credentials for display
            const credentialsResponse = await chrome.runtime.sendMessage({
                action: 'supabase-get-credentials'
            });

            // Get credential status
            const statusResponse = await chrome.runtime.sendMessage({
                action: 'supabase-get-status'
            });

            if (credentialsResponse && credentialsResponse.success && credentialsResponse.credentials) {
                const credentials = credentialsResponse.credentials;
                
                // Display current configuration
                this.currentUrl.textContent = credentials.supabaseUrl || '-';
                this.currentApiKey.textContent = credentials.apiKey || '-';
                this.currentJwtToken.textContent = credentials.jwtToken || 'Not configured';
                
                this.currentConfig.classList.remove('d-none');
            } else {
                this.currentConfig.classList.add('d-none');
            }



        } catch (error) {
            console.error('Error loading Supabase config:', error);
            this.currentConfig.classList.add('d-none');
        }
    }

    /**
     * Synchronize browser history
     */
    async syncBrowserHistory() {
        const syncButton = this.getElementById('sync-history');
        
        try {
            this.showButtonLoading(syncButton, 'Syncing...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'history-synchronize'
            });
            
            if (response && response.success) {
                const videoCount = response.videoCount || 0;
                this.showSuccess(`Browser history synchronized! Added ${videoCount} videos.`);
                await this.updateDatabaseSize();
                
                // Refresh search results to show newly added videos
                if (videoCount > 0) {
                    await this.performSearch();
                }
            } else {
                const errorMessage = response?.error || 'History synchronization failed';
                
                // Show more user-friendly error messages
                if (errorMessage.includes('Database not initialized') || errorMessage.includes('Extension not fully initialized')) {
                    this.showError('Extension is still initializing. Please wait a moment and try again.');
                } else {
                    this.showError('History sync failed: ' + errorMessage);
                }
            }
        } catch (error) {
            console.error('Error syncing browser history:', error);
            
            // Show more user-friendly error messages
            if (error.message.includes('Database not initialized') || error.message.includes('Extension not fully initialized')) {
                this.showError('Extension is still initializing. Please wait a moment and try again.');
            } else {
                this.showError('History sync failed: ' + error.message);
            }
        } finally {
            this.hideButtonLoading(syncButton);
        }
    }

    /**
     * Synchronize YouTube history
     */
    async syncYouTubeHistory() {
        const syncButton = this.getElementById('sync-youtube');
        
        try {
            this.showButtonLoading(syncButton, 'Syncing...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'youtube-synchronize'
            });
            
            if (response && response.success) {
                const videoCount = response.videoCount || 0;
                this.showSuccess(`YouTube history synchronized! Added ${videoCount} videos.`);
                await this.updateDatabaseSize();
                
                // Refresh search results to show newly added videos
                if (videoCount > 0) {
                    await this.performSearch();
                }
            } else {
                const errorMessage = response?.error || 'YouTube synchronization failed';
                
                // Show more user-friendly error messages
                if (errorMessage.includes('Database not initialized') || errorMessage.includes('Extension not fully initialized')) {
                    this.showError('Extension is still initializing. Please wait a moment and try again.');
                } else {
                    this.showError('YouTube sync failed: ' + errorMessage);
                }
            }
        } catch (error) {
            console.error('Error syncing YouTube history:', error);
            
            // Show more user-friendly error messages
            if (error.message.includes('Database not initialized') || error.message.includes('Extension not fully initialized')) {
                this.showError('Extension is still initializing. Please wait a moment and try again.');
            } else {
                this.showError('YouTube sync failed: ' + error.message);
            }
        } finally {
            this.hideButtonLoading(syncButton);
        }
    }

    /**
     * Synchronize YouTube likes
     */
    async syncYouTubeLikes() {
        const syncButton = this.getElementById('sync-youtube-likes');
        
        try {
            this.showButtonLoading(syncButton, 'Syncing...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'youtube-liked-videos'
            });
            
            if (response && response.success) {
                const videoCount = response.videoCount || 0;
                this.showSuccess(`YouTube likes synchronized! Added ${videoCount} videos.`);
                await this.updateDatabaseSize();
                
                // Refresh search results to show newly added videos
                if (videoCount > 0) {
                    await this.performSearch();
                }
            } else {
                const errorMessage = response?.error || 'YouTube likes synchronization failed';
                
                // Show more user-friendly error messages
                if (errorMessage.includes('Database not initialized') || errorMessage.includes('Extension not fully initialized')) {
                    this.showError('Extension is still initializing. Please wait a moment and try again.');
                } else {
                    this.showError('YouTube likes sync failed: ' + errorMessage);
                }
            }
        } catch (error) {
            console.error('Error syncing YouTube likes:', error);
            
            // Show more user-friendly error messages
            if (error.message.includes('Database not initialized') || error.message.includes('Extension not fully initialized')) {
                this.showError('Extension is still initializing. Please wait a moment and try again.');
            } else {
                this.showError('YouTube likes sync failed: ' + error.message);
            }
        } finally {
            this.hideButtonLoading(syncButton);
        }
    }

    /**
     * Synchronize all sources
     */
    async syncAllSources() {
        const syncButton = this.getElementById('sync-all');
        
        try {
            this.showButtonLoading(syncButton, 'Syncing All...');
            
            let totalVideos = 0;
            const results = [];
            
            // Sync browser history
            try {
                const historyResponse = await chrome.runtime.sendMessage({
                    action: 'history-synchronize'
                });
                if (historyResponse && historyResponse.success) {
                    totalVideos += historyResponse.videoCount || 0;
                    results.push(`Browser history: ${historyResponse.videoCount || 0} videos`);
                }
            } catch (error) {
                console.error('Browser history sync failed:', error);
                results.push('Browser history: failed');
            }
            
            // Sync YouTube history
            try {
                const youtubeResponse = await chrome.runtime.sendMessage({
                    action: 'youtube-synchronize'
                });
                if (youtubeResponse && youtubeResponse.success) {
                    totalVideos += youtubeResponse.videoCount || 0;
                    results.push(`YouTube history: ${youtubeResponse.videoCount || 0} videos`);
                }
            } catch (error) {
                console.error('YouTube history sync failed:', error);
                results.push('YouTube history: failed');
            }
            
            // Sync YouTube likes
            try {
                const likesResponse = await chrome.runtime.sendMessage({
                    action: 'youtube-liked-videos'
                });
                if (likesResponse && likesResponse.success) {
                    totalVideos += likesResponse.videoCount || 0;
                    results.push(`YouTube likes: ${likesResponse.videoCount || 0} videos`);
                }
            } catch (error) {
                console.error('YouTube likes sync failed:', error);
                results.push('YouTube likes: failed');
            }
            
            // Update database size
            await this.updateDatabaseSize();
            
            // Refresh search results to show newly added videos
            if (totalVideos > 0) {
                await this.performSearch();
            }
            
            // Show results
            const resultMessage = `All sources synchronized! Total: ${totalVideos} videos added.\n\n${results.join('\n')}`;
            this.showSuccess(resultMessage);
            
        } catch (error) {
            console.error('Error syncing all sources:', error);
            
            // Show more user-friendly error messages
            if (error.message.includes('Database not initialized') || error.message.includes('Extension not fully initialized')) {
                this.showError('Extension is still initializing. Please wait a moment and try again.');
            } else {
                this.showError('Sync all failed: ' + error.message);
            }
        } finally {
            this.hideButtonLoading(syncButton);
        }
    }





    /**
     * Perform search
     */
    async performSearch() {
        // Prevent multiple concurrent searches
        if (this.searchState.isSearching) return;
        
        const searchQuery = this.getElementById('idSearch_Query');
        const searchButton = this.getElementById('idSearch_Lookup');
        const searchResults = this.getElementById('idSearch_Results');
        
        // Use the query from search state if available, otherwise from input
        let query = this.searchState.currentQuery;
        if (query === undefined || query === null) {
            query = searchQuery.value.trim();
            this.searchState.currentQuery = query;
        }

        // Update search state
        this.searchState.isSearching = true;

        try {
            // Update button state
            this.searchIcon.classList.add('d-none');
            this.searchSpinner.classList.remove('d-none');
            searchButton.disabled = true;
            searchResults.classList.add('search-loading');

            const response = await chrome.runtime.sendMessage({
                action: 'search-videos',
                query: query, // Use the query from search state
                page: this.searchState.currentPage,
                pageSize: this.searchState.pageSize
            });

            if (response && response.success) {
                this.searchState.totalResults = response.totalResults || 0;
                this.displaySearchResults(response.results);
            } else {
                const errorMessage = query 
                    ? 'Search failed. Please try again.' 
                    : 'Failed to load watch history.';
                this.showError(response?.error || errorMessage);
                searchResults.innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>${errorMessage}</div>`;
            }
        } catch (error) {
            console.error('Search error:', error);
            const errorMessage = query 
                ? 'Search failed. Please try again.' 
                : 'Failed to load watch history.';
            this.showError(errorMessage);
            searchResults.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>An error occurred. Please try again.</div>`;
        } finally {
            // Reset button state
            this.searchIcon.classList.remove('d-none');
            this.searchSpinner.classList.add('d-none');
            searchButton.disabled = false;
            searchResults.classList.remove('search-loading');
            this.searchState.isSearching = false;
        }
    }

    /**
     * Perform initial search on page load (no error messages)
     */
    async performInitialSearch() {
        try {
            // Initialize search state for initial load
            this.searchState.currentQuery = '';
            this.searchState.currentPage = 1;
            
            const response = await chrome.runtime.sendMessage({
                action: 'search-videos',
                query: '', // Empty query to show all videos
                page: 1,
                pageSize: 50
            });

            if (response && response.success) {
                this.searchState.totalResults = response.totalResults || 0;
                this.displaySearchResults(response.results);
            } else {
                console.warn('Initial search failed:', response);
                // Don't show error on initial load, just show empty state
                const searchResults = this.getElementById('idSearch_Results');
                searchResults.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>No videos found in your watch history. Try synchronizing your browser history or YouTube history first.</div>';
            }
        } catch (error) {
            console.error('Initial search error:', error);
            // Don't show error toast on initial load
            const searchResults = this.getElementById('idSearch_Results');
            searchResults.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>No videos found in your watch history. Try synchronizing your browser history or YouTube history first.</div>';
        }
    }

    /**
     * Display search results
     * @param {Array} results - Search results
     */
    displaySearchResults(results) {
        const searchResults = this.getElementById('idSearch_Results');
        
        if (!results || results.length === 0) {
            const message = this.searchState.currentQuery 
                ? 'No videos found matching your search.' 
                : 'No videos found in your watch history. Try synchronizing your browser history or YouTube history first.';
            searchResults.innerHTML = `<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>${message}</div>`;
            return;
        }

        // Create modern table structure with enhanced styling
        const html = `
            <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0 text-primary">
                        <i class="fas fa-video me-2"></i>
                        Found ${this.searchState.totalResults} video${this.searchState.totalResults !== 1 ? 's' : ''}
                        ${this.searchState.currentQuery ? ` for "${this.escapeHtml(this.searchState.currentQuery)}"` : ''}
                    </h6>
                    <small class="text-muted">
                        <i class="fas fa-external-link-alt me-1"></i>
                        Click titles to open on YouTube
                    </small>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover table-striped">
                        <thead class="table-secondary">
                            <tr>
                                <th class="text-center" style="width: 200px;">
                                    <i class="fas fa-clock me-2"></i>Watch Time
                                </th>
                                <th>
                                    <i class="fas fa-play me-2"></i>Video Title
                                </th>
                                <th class="text-center" style="width: 100px;">
                                    <i class="fas fa-eye me-2"></i>Visits
                                </th>
                                <th class="text-center" style="width: 80px;">
                                    <i class="fas fa-cog me-2"></i>Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results.map(result => `
                                <tr class="search-result-item">
                                    <td class="text-center">
                                        <small class="text-muted font-monospace">
                                            ${this.formatDateForTable(new Date(result.timestamp))}
                                        </small>
                                    </td>
                                    <td>
                                        <a href="https://www.youtube.com/watch?v=${result.id}" 
                                           target="_blank" 
                                           class="text-decoration-none fw-medium text-primary">
                                            ${this.escapeHtml(result.title)}
                                            <i class="fas fa-external-link-alt ms-2 text-muted small"></i>
                                        </a>
                                    </td>
                                    <td class="text-center">
                                        <span class="badge bg-primary rounded-pill">
                                            ${result.count}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-outline-danger delete-video-btn hover-lift" 
                                                data-video-id="${result.id}"
                                                title="Delete from watch history">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${this.renderPagination()}
            </div>
        `;

        searchResults.innerHTML = html;
        
        // Add fade-in animation
        searchResults.classList.add('animate-fade-in');
        
        // Set up pagination event listeners
        this.setupPaginationListeners(searchResults);
        
        // Add event listeners for delete buttons
        const deleteButtons = searchResults.querySelectorAll('.delete-video-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const videoId = e.currentTarget.getAttribute('data-video-id');
                this.deleteVideo(videoId, e.currentTarget);
            });
        });
    }

    /**
     * Delete a video from the database
     * @param {string} videoId - Video ID to delete
     * @param {HTMLElement} deleteButton - The delete button element
     */
    async deleteVideo(videoId, deleteButton) {
        if (!confirm('Are you sure you want to delete this video from your watch history?')) {
            return;
        }
        
        try {
            this.showButtonLoading(deleteButton, 'Deleting...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'search-delete',
                videoId: videoId
            });

            if (response && response.success) {
                this.showSuccess('Video deleted successfully');
                
                // Update database size to reflect the deletion
                await this.updateDatabaseSize();
                
                // Refresh the search results, but check if we need to go back a page
                const totalPagesAfterDelete = Math.ceil((this.searchState.totalResults - 1) / this.searchState.pageSize);
                if (this.searchState.currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
                    this.searchState.currentPage = totalPagesAfterDelete;
                }
                
                // Refresh the current search
                await this.performSearch();
            } else {
                this.showError('Failed to delete video');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Delete error: ' + error.message);
        } finally {
            this.hideButtonLoading(deleteButton);
        }
    }

    /**
     * Format date for table display (matching original format)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDateForTable(date) {
        if (!date || isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}.${month}.${day} - ${hours}:${minutes}`;
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
            // Store in sync storage - now used by both options page and background script
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
                this.updateProviderStatus(),
                this.performInitialSearch(), // Show all videos by default without errors
                
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

            if (this.databaseSize) {
                if (response && response.success) {
                    this.databaseSize.textContent = parseInt(response.size || 0).toLocaleString();
                } else {
                    this.databaseSize.textContent = 'N/A';
                    console.warn('Could not retrieve database size from background script.');
                }
            }
        } catch (error) {
            console.error('Error sending message to update database size:', error);
            if (this.databaseSize) {
                this.databaseSize.textContent = 'Error';
            }
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
     * Show loading state on a button
     * @param {string|HTMLElement} buttonIdOrElement - Button ID or element
     * @param {string} loadingText - Optional loading text
     */
    showButtonLoading(buttonIdOrElement, loadingText = null) {
        const button = typeof buttonIdOrElement === 'string' 
            ? this.getElementById(buttonIdOrElement) 
            : buttonIdOrElement;
            
        if (!button) return;
        
        // Store original state
        button.dataset.originalText = button.innerHTML;
        button.dataset.originalDisabled = button.disabled;
        
        // Create loading content
        const spinner = '<i class="fas fa-spinner fa-spin me-2"></i>';
        const text = loadingText || 'Loading...';
        
        button.innerHTML = spinner + text;
        button.disabled = true;
    }

    /**
     * Hide loading state on a button
     * @param {string|HTMLElement} buttonIdOrElement - Button ID or element
     */
    hideButtonLoading(buttonIdOrElement) {
        const button = typeof buttonIdOrElement === 'string' 
            ? this.getElementById(buttonIdOrElement) 
            : buttonIdOrElement;
            
        if (!button) return;
        
        // Restore original state
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
        
        if (button.dataset.originalDisabled !== undefined) {
            button.disabled = button.dataset.originalDisabled === 'true';
            delete button.dataset.originalDisabled;
        }
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message) {
        // Loading state
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        // Implementation can be added if needed
    }

    /**
     * Show success toast
     * @param {string} message - Success message
     */
    showSuccess(message) {
        if (this.successToast && this.successToastMessage) {
            this.successToastMessage.textContent = message;
            this.successToast.show();
            this.announceToScreenReader(message);
        } else {
            // Success message
        }
    }

    /**
     * Show error toast
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.errorToast && this.errorToastMessage) {
            this.errorToastMessage.textContent = message;
            this.errorToast.show();
            this.announceToScreenReader(`Error: ${message}`);
        } else {
            console.error('Error:', message);
            alert('Error: ' + message); // Fallback
        }
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    announceToScreenReader(message) {
        if (this.srAnnouncements) {
            this.srAnnouncements.textContent = message;
            // Clear after a short delay to allow for re-announcement of the same message
            setTimeout(() => {
                this.srAnnouncements.textContent = '';
            }, 1000);
        }
    }

    /**
     * Render pagination controls
     * @returns {string} HTML for pagination controls
     */
    renderPagination() {
        const totalPages = Math.ceil(this.searchState.totalResults / this.searchState.pageSize);
        if (totalPages <= 1) return '';

        const currentPage = this.searchState.currentPage;
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        let paginationHtml = `
            <nav aria-label="Search results pagination" class="mt-4">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="1" ${currentPage === 1 ? 'disabled' : ''} aria-label="First">
                            <span aria-hidden="true">&laquo;&laquo;</span>
                        </button>
                    </li>
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </button>
                    </li>`;

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>
                </li>`;
        }

        paginationHtml += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </button>
                    </li>
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <button class="page-link" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Last">
                            <span aria-hidden="true">&raquo;&raquo;</span>
                        </button>
                    </li>
                </ul>
                <div class="text-center text-muted small mt-2">
                    Page ${currentPage} of ${totalPages} (${this.searchState.totalResults} total videos)
                </div>
            </nav>
        `;

        return paginationHtml;
    }

    /**
     * Set up pagination event listeners
     * @param {Element} container - Container element with pagination buttons
     */
    setupPaginationListeners(container) {
        const paginationButtons = container.querySelectorAll('.page-link[data-page]');
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Get page number from button or its parent
                let pageElement = e.target;
                let page = pageElement.getAttribute('data-page');
                
                // If clicked on span inside button, get page from button
                if (!page && pageElement.parentElement) {
                    page = pageElement.parentElement.getAttribute('data-page');
                }
                
                page = parseInt(page);
                
                if (page && !pageElement.disabled && !pageElement.parentElement?.disabled) {
                    this.goToPage(page);
                }
            });
        });
    }

    /**
     * Go to a specific page
     * @param {number} page - Page number to go to
     */
    async goToPage(page) {
        if (page < 1) return;
        
        // Update the current page in search state
        this.searchState.currentPage = page;
        
        // Get the current search query from the input
        const searchQuery = this.getElementById('idSearch_Query');
        this.searchState.currentQuery = searchQuery.value.trim();
        
        // Perform the search with the updated page
        await this.performSearch();
    }

    /**
     * Update database provider status display
     */
    async updateProviderStatus() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'database-provider-status'
            });
                        if (response && response.success) {
                const status = response.status;
                
                // Update provider radio buttons based on actual provider type
                if (status.type === 'indexeddb') {
                    this.providerIndexedDB.checked = true;
                    this.providerSupabase.checked = false;
                    this.supabaseConfig.classList.add('d-none');
                } else if (status.type === 'supabase') {
                    this.providerIndexedDB.checked = false;
                    this.providerSupabase.checked = true;
                    this.supabaseConfig.classList.remove('d-none');
                    await this.loadSupabaseConfig();
                } else {
                    // Default to IndexedDB if provider type is null or unknown
                    this.providerIndexedDB.checked = true;
                    this.providerSupabase.checked = false;
                    this.supabaseConfig.classList.add('d-none');
                }
                
                // Load auto-sync setting
                const autoSyncResult = await chrome.storage.local.get(['auto_sync_enabled']);
                this.enableAutoSync.checked = autoSyncResult.auto_sync_enabled || false;
            } else {
                console.warn('Failed to get provider status:', response?.error);
                // Default to IndexedDB on error
                this.providerIndexedDB.checked = true;
                this.providerSupabase.checked = false;
                this.supabaseConfig.classList.add('d-none');
            }
        } catch (error) {
            console.error('Error updating provider status:', error);
            // Default to IndexedDB on error
            this.providerIndexedDB.checked = true;
            this.providerSupabase.checked = false;
            this.supabaseConfig.classList.add('d-none');
        }
    }

   
}

// Initialize the options page manager
new OptionsPageManager();
