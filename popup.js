/**
 * Popup Search Manager
 * Simplified version of the options page focused only on search functionality
 */
class PopupSearchManager {
    constructor() {
        this.isInitialized = false;
        this.bootstrap = null;
        this.searchState = {
            currentQuery: '',
            currentPage: 1,
            pageSize: 30, // Increased page size for smaller font
            totalResults: 0,
            isSearching: false
        };
    }

    /**
     * Initialize the popup
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
            
            // Load initial search results
            await this.performInitialSearch();
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showError('Failed to initialize the popup. Please refresh and try again.');
        }
    }

    /**
     * Wait for Bootstrap to be available
     */
    async waitForBootstrap() {
        return new Promise((resolve) => {
            const checkBootstrap = () => {
                if (typeof bootstrap !== 'undefined') {
                    this.bootstrap = bootstrap;
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
        // Theme elements
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = document.getElementById('theme-icon');
        
        // Search elements
        this.searchQuery = document.getElementById('idSearch_Query');
        this.searchButton = document.getElementById('idSearch_Lookup');
        this.searchResults = document.getElementById('idSearch_Results');
        this.searchIcon = document.getElementById('search-icon');
        this.searchSpinner = document.getElementById('search-spinner');
        this.initialLoading = document.getElementById('initial-loading');
        
        // Options link
        this.openOptionsLink = document.getElementById('open-options');
        
        // Toast elements
        this.successToast = new this.bootstrap.Toast(document.getElementById('successToast'));
        this.errorToast = new this.bootstrap.Toast(document.getElementById('errorToast'));
        this.successToastMessage = document.getElementById('successToastMessage');
        this.errorToastMessage = document.getElementById('errorToastMessage');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Search functionality
        this.setupSearchListeners();
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Options link
        this.openOptionsLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openFullOptions();
        });
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Set up search functionality
     */
    setupSearchListeners() {
        // Search button click
        this.searchButton.addEventListener('click', () => this.performSearch());
        
        // Enter key search
        this.searchQuery.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.performSearch();
            }
        });
        
        // Auto-search with debounce (1 second delay)
        let searchTimeout;
        this.searchQuery.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                const query = this.searchQuery.value.trim();
                
                // Reset to first page when query changes
                this.searchState.currentPage = 1;
                this.searchState.currentQuery = query;
                
                // Always search (empty query shows all videos)
                this.performSearch();
            }, 1000);
        });
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + K to focus search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.searchQuery.focus();
            }
            
            // Escape to close popup
            if (event.key === 'Escape') {
                window.close();
            }
        });
    }

    /**
     * Initialize theme
     */
    async initializeTheme() {
        try {
            const result = await chrome.storage.sync.get(['theme']);
            const theme = result.theme || 'light';
            this.setTheme(theme);
        } catch (error) {
            console.error('Error loading theme:', error);
            this.setTheme('light');
        }
    }

    /**
     * Toggle theme
     */
    async toggleTheme() {
        try {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            this.setTheme(newTheme);
            await chrome.storage.sync.set({ theme: newTheme });
        } catch (error) {
            console.error('Error toggling theme:', error);
        }
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        if (theme === 'dark') {
            this.themeIcon.classList.remove('fa-sun');
            this.themeIcon.classList.add('fa-moon');
        } else {
            this.themeIcon.classList.remove('fa-moon');
            this.themeIcon.classList.add('fa-sun');
        }
    }

    /**
     * Safely send message to background script with error handling
     * @param {Object} message - Message to send
     * @returns {Promise<Object>} Response from background
     */
    async safeSendMessage(message) {
        try {
            return await chrome.runtime.sendMessage(message);
        } catch (error) {
            if (error.message && (error.message.includes("Extension context invalidated") || 
                               error.message.includes("context invalidated") ||
                               error.message.includes("Receiving end does not exist"))) {
                console.log("Extension context invalidated during sendMessage - retrying once");
                // Try once more in case it was a temporary issue
                try {
                    return await chrome.runtime.sendMessage(message);
                } catch (retryError) {
                    console.log("Retry also failed, extension context may be permanently invalidated");
                    throw new Error("Extension context invalidated");
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Open full options page
     */
    openFullOptions() {
        chrome.runtime.openOptionsPage();
    }

    /**
     * Perform initial search on page load
     */
    async performInitialSearch() {
        try {
            // Initialize search state for initial load
            this.searchState.currentQuery = '';
            this.searchState.currentPage = 1;
            
            // Add retry logic for database initialization timing
            const maxRetries = 3;
            let retryCount = 0;
            let response = null;
            
            while (retryCount < maxRetries) {
                try {
                    response = await this.safeSendMessage({
                        action: 'search-videos',
                        query: '', // Empty query to show all videos
                        page: 1,
                        pageSize: this.searchState.pageSize
                    });
                    
                    // If successful, break out of retry loop
                    if (response && response.success) {
                        break;
                    }
                    
                    // If failed but not due to database issues, don't retry
                    if (response && response.error && !response.error.includes('Database')) {
                        break;
                    }
                } catch (error) {
                    console.warn(`Initial search attempt ${retryCount + 1} failed:`, error);
                }
                
                retryCount++;
                if (retryCount < maxRetries) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                }
            }

            if (response && response.success) {
                this.searchState.totalResults = response.totalResults || 0;
                this.hideInitialLoading();
                this.displaySearchResults(response.results);
                
                // Show a subtle message if it took multiple retries
                if (retryCount > 0) {
                    // Search successful after multiple attempts
                }
            } else {
                // Don't show error on initial load, just show empty state
                this.hideInitialLoading();
                this.searchResults.innerHTML = '<div class="alert alert-info m-3"><i class="fas fa-info-circle me-2"></i>No videos found in your watch history.</div>';
            }
        } catch (error) {
            console.error('Initial search error:', error);
            this.hideInitialLoading();
            this.searchResults.innerHTML = '<div class="alert alert-info m-3"><i class="fas fa-info-circle me-2"></i>No videos found in your watch history.</div>';
        }
    }

    /**
     * Perform search
     */
    async performSearch() {
        // Prevent multiple concurrent searches
        if (this.searchState.isSearching) return;
        
        // Use the query from search state if available, otherwise from input
        let query = this.searchState.currentQuery;
        if (query === undefined || query === null) {
            query = this.searchQuery.value.trim();
            this.searchState.currentQuery = query;
        }

        // Update search state
        this.searchState.isSearching = true;

        try {
            // Update button state
            this.searchIcon.classList.add('d-none');
            this.searchSpinner.classList.remove('d-none');
            this.searchButton.disabled = true;
            this.searchResults.classList.add('search-loading');

            const response = await this.safeSendMessage({
                action: 'search-videos',
                query: query,
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
                this.hideInitialLoading();
                this.showError(response?.error || errorMessage);
                this.searchResults.innerHTML = `<div class="alert alert-warning m-3"><i class="fas fa-exclamation-triangle me-2"></i>${errorMessage}</div>`;
            }
        } catch (error) {
            console.error('Search error:', error);
            const errorMessage = query 
                ? 'Search failed. Please try again.' 
                : 'Failed to load watch history.';
            this.hideInitialLoading();
            this.showError(errorMessage);
            this.searchResults.innerHTML = `<div class="alert alert-danger m-3"><i class="fas fa-exclamation-circle me-2"></i>An error occurred. Please try again.</div>`;
        } finally {
            // Reset button state
            this.searchIcon.classList.remove('d-none');
            this.searchSpinner.classList.add('d-none');
            this.searchButton.disabled = false;
            this.searchResults.classList.remove('search-loading');
            this.searchState.isSearching = false;
        }
    }

    /**
     * Hide initial loading animation
     */
    hideInitialLoading() {
        if (this.initialLoading) {
            this.initialLoading.style.display = 'none';
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        // Ensure initial loading is hidden
        this.hideInitialLoading();
        
        if (!results || results.length === 0) {
            const message = this.searchState.currentQuery 
                ? 'No videos found matching your search.' 
                : 'No videos found in your watch history.';
            this.searchResults.innerHTML = `<div class="alert alert-info m-3"><i class="fas fa-info-circle me-2"></i>${message}</div>`;
            return;
        }

        // Create compact table structure for popup
        const html = `
            <div class="p-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0 text-primary">
                        <i class="fas fa-video me-2"></i>
                        ${this.searchState.totalResults} video${this.searchState.totalResults !== 1 ? 's' : ''}
                        ${this.searchState.currentQuery ? ` for "${this.escapeHtml(this.searchState.currentQuery)}"` : ''}
                    </h6>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover table-sm">
                        <thead class="table-secondary">
                            <tr>
                                <th style="width: 120px;">
                                    <i class="fas fa-clock me-1"></i>Date
                                </th>
                                <th>
                                    <i class="fas fa-play me-1"></i>Title
                                </th>
                                <th class="text-center" style="width: 60px;">
                                    <i class="fas fa-eye me-1"></i>Views
                                </th>
                                <th class="text-center" style="width: 60px;">
                                    <i class="fas fa-cog me-1"></i>Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${results.map(result => `
                                <tr class="search-result-item">
                                    <td class="text-center">
                                        <small class="text-muted">
                                            ${this.formatDateForTable(new Date(result.timestamp))}
                                        </small>
                                    </td>
                                    <td>
                                        <a href="https://www.youtube.com/watch?v=${result.id}" 
                                           target="_blank" 
                                           class="text-decoration-none fw-medium text-primary"
                                           title="${this.escapeHtml(result.title)}">
                                                                                         ${this.truncateText(this.escapeHtml(result.title), 60)}
                                            <i class="fas fa-external-link-alt ms-1 text-muted small"></i>
                                        </a>
                                    </td>
                                    <td class="text-center">
                                        <span class="badge bg-primary rounded-pill">
                                            ${result.count}
                                        </span>
                                    </td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-outline-danger delete-video-btn" 
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

        this.searchResults.innerHTML = html;
        
        // Add fade-in animation
        this.searchResults.classList.add('animate-fade-in');
        
        // Set up pagination event listeners
        this.setupPaginationListeners();
        
        // Add event listeners for delete buttons
        const deleteButtons = this.searchResults.querySelectorAll('.delete-video-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const videoId = e.currentTarget.getAttribute('data-video-id');
                this.deleteVideo(videoId, e.currentTarget);
            });
        });
    }

    /**
     * Set up pagination event listeners
     */
    setupPaginationListeners() {
        const paginationButtons = this.searchResults.querySelectorAll('.page-link');
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.currentTarget.getAttribute('data-page'));
                if (page && page !== this.searchState.currentPage) {
                    this.goToPage(page);
                }
            });
        });
    }

    /**
     * Go to a specific page
     */
    async goToPage(page) {
        if (page < 1) return;
        
        // Update the current page in search state
        this.searchState.currentPage = page;
        
        // Get the current search query from the input
        this.searchState.currentQuery = this.searchQuery.value.trim();
        
        // Perform the search with the updated page
        await this.performSearch();
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const totalPages = Math.ceil(this.searchState.totalResults / this.searchState.pageSize);
        if (totalPages <= 1) return '';

        const currentPage = this.searchState.currentPage;
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        let paginationHtml = `
            <nav aria-label="Search results pagination" class="mt-3">
                <ul class="pagination pagination-sm justify-content-center">
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
     * Delete a video from the database
     */
    async deleteVideo(videoId, deleteButton) {
        if (!confirm('Are you sure you want to delete this video from your watch history?')) {
            return;
        }
        
        try {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            const response = await this.safeSendMessage({
                action: 'search-delete',
                videoId: videoId
            });

            if (response && response.success) {
                this.showSuccess('Video deleted successfully');
                
                // Check if we need to go back a page
                const totalPagesAfterDelete = Math.ceil((this.searchState.totalResults - 1) / this.searchState.pageSize);
                if (this.searchState.currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
                    this.searchState.currentPage = totalPagesAfterDelete;
                }
                
                // Refresh the current search
                await this.performSearch();
            } else {
                this.showError('Failed to delete video');
                deleteButton.disabled = false;
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Delete error: ' + error.message);
            deleteButton.disabled = false;
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        }
    }

    /**
     * Format date for table display
     */
    formatDateForTable(date) {
        return moment(date).format('MM/DD/YY');
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.successToastMessage.textContent = message;
        this.successToast.show();
    }

    /**
     * Show error message
     */
    showError(message) {
        this.errorToastMessage.textContent = message;
        this.errorToast.show();
    }
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popupManager = new PopupSearchManager();
    popupManager.initialize();
}); 