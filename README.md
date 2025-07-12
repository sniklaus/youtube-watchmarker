# youtube-watchmarker

YouTube keeps track of your watch history and automatically marks videos that you have already watched. However, they only mark recently seen videos, which is kind of disappointing. This extension fixes this issue and keeps track of your entire watch history, such that not only the recently seen videos are being marked.

## Installation

Currently, only a manual installation of the unpacked source code is supported. This fork has only been tested on Chrome browser.

## Features

### Core Functionality
- **Complete Watch History Tracking**: Marks all previously watched videos, not just recent ones
- **Multiple Data Sources**: Integrates browser history, YouTube watch history, and liked videos
- **Visual Indicators**: Customizable visual markers for watched videos (fade-out, gray-out, badges, dates)
- **Search & Management**: Built-in search functionality to find and manage your watch history

### Synchronization & Backup
- **Chrome Storage Sync**: Automatic cross-device synchronization for Chrome users (up to 100KB)
- **Manual Export/Import**: JSON-based backup and restore functionality
- **Data Merging**: Intelligent conflict resolution when syncing across devices
- **Multiple Sync Sources**: Browser history, YouTube history, and liked videos synchronization

### Modern UI
- **Responsive Design**: Modern, mobile-friendly interface
- **Dark/Light Theme**: Automatic theme switching with system preferences
- **Real-time Updates**: Live status indicators and progress reporting
- **Accessibility**: ARIA labels and keyboard navigation support

## Development

This extension has been completely modernized with contemporary JavaScript practices and patterns:

### Technical Stack

- **Manifest V3**: Latest Chrome extension standard
- **ES6+ Modules**: Modern JavaScript with imports/exports
- **Service Worker**: Background script using the latest APIs
- **IndexedDB**: Local database storage with proper indexing
- **Chrome Storage API**: Cross-device synchronization capabilities

### Architecture

The extension follows a modular, class-based architecture:

- **`background.js`** - Main extension service worker with `ExtensionManager` class
- **`bg-database.js`** - Database operations with `DatabaseManager` and `SyncManager` classes
- **`bg-history.js`** - Browser history synchronization module
- **`bg-youtube.js`** - YouTube API integration and data fetching
- **`bg-search.js`** - Search functionality and video management
- **`youtube.js`** - Content script with `YouTubeWatchMarker` class for page interaction
- **`content/index.js`** - Options page with `OptionsPageManager` class
- **`utils.js`** - Shared utilities and helper functions

### Code Quality

- **Modern JavaScript**: Arrow functions, destructuring, template literals, async/await
- **Type Safety**: Comprehensive JSDoc annotations for better IDE support
- **Error Handling**: Robust try/catch blocks and error propagation
- **Memory Management**: Proper cleanup of observers and event listeners
- **Performance**: Optimized DOM queries and batch processing

### Development Commands

```bash
# Install dependencies
npm install

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Load extension for development
npm run dev
```

### Development Setup

1. Clone the repository
2. Run `npm install` to install development dependencies
3. Load the extension as an unpacked extension in Chrome/Firefox
4. Make changes and reload the extension to test

### Browser Compatibility

- **Chrome/Chromium**: Full support including sync features
- **Firefox**: Core functionality supported, sync features limited to manual export/import
- **Edge**: Full Chrome compatibility
- **Safari**: Not currently supported

## Sync Implementation

The extension includes a comprehensive synchronization system:

### Available Sync Providers

1. **Chrome Storage Sync** (Implemented)
   - Automatic cross-device sync for Chrome users
   - 100KB storage limit with intelligent data chunking
   - No setup required, works with Google account sync

2. **Google Drive API** (Planned)
   - Large storage capacity for extensive watch histories
   - Cross-browser compatibility
   - OAuth-based authentication

3. **Custom Backend** (Planned)
   - Self-hosted sync solutions
   - Enterprise-friendly deployments

### Sync Features

- **Automatic Sync**: Configurable intervals with background operations
- **Manual Sync**: On-demand synchronization with progress reporting
- **Conflict Resolution**: Timestamp-based merging with data integrity preservation
- **Data Privacy**: User-controlled sync with no central data collection

## Data Management

### Database Schema
```javascript
{
  strIdent: "video_id",           // YouTube video ID
  intTimestamp: 1234567890,       // Last watched timestamp
  strTitle: "Video Title",        // Video title
  intCount: 1                     // View count
}
```

### Storage Options
- **Local Storage**: IndexedDB for primary data storage
- **Chrome Sync**: Automatic cloud synchronization (Chrome only)
- **Manual Backup**: JSON export/import for data portability

## Privacy & Security

- **No Data Collection**: All data remains on your devices or chosen sync provider
- **User Control**: Complete control over sync settings and data sharing
- **Provider Choice**: Select your preferred synchronization method
- **Data Encryption**: Provider-specific encryption (Chrome Sync uses Google's encryption)

## FAQ

**How can the persistence of the database be ensured?**  
The extension offers multiple backup options: Chrome Storage Sync for automatic cross-device synchronization, plus manual export/import features for creating portable backups. You can easily archive these backups to ensure you never lose your watch history.

**How can I make sure that the database is complete?**  
The automatic synchronization considers recent activity, but you're encouraged to manually initiate a complete synchronization in the settings. This incorporates as much of your browser and YouTube history as possible into the database.

**What's the difference between browser history and YouTube history sync?**  
Browser history sync extracts YouTube video visits from your browser's history, while YouTube history sync directly fetches your watch history from YouTube. Both sources are merged intelligently to provide the most complete picture of your viewing history.

## Contributing

Contributions are welcome! Please ensure your code follows the established patterns:

- Use modern JavaScript features (ES6+)
- Follow the existing class-based architecture

## Special Thanks

I would like to express my gratitude to [Simon Niklaus](https://github.com/sniklaus) who developed the initial extension of which this is a fork.

## Links

- Original Project: https://github.com/sniklaus/youtube-watchmarker
- Sync Implementation Details: [SYNC_IMPLEMENTATION.md](SYNC_IMPLEMENTATION.md)

## License

Please refer to the [LICENSE](LICENSE) file within this repository.
