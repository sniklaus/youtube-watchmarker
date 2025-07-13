# YouTube Watchmarker Reloaded

YouTube keeps track of your watch history and automatically marks videos that you have already watched. However, they only mark recently seen videos, which is kind of disappointing. This extension fixes this issue and keeps track of your entire watch history, such that not only the recently seen videos are being marked.

## Installation

Currently, only manual installation of the unpacked source code is supported. This extension has been tested on Chrome/Chromium browsers and has Firefox compatibility with some limitations.

## Current Features

### Core Functionality
- **Complete Watch History Tracking**: Marks all previously watched videos, not just recent ones
- **Multiple Data Sources**: Integrates browser history, YouTube watch history, and liked videos
- **Real-time Detection**: Automatically detects when videos are watched through multiple methods
- **Search & Management**: Built-in search functionality to find and manage your watch history
- **Video Management**: Delete individual videos from your watch history

### Visual Customization
- **Fade Out**: Reduce opacity of watched video thumbnails
- **Grayscale**: Convert watched video thumbnails to grayscale
- **Watch Badge**: Display "WATCHED" badge on marked videos
- **Watch Date**: Show the date when video was watched in the badge
- **Hide Progress Bar**: Hide YouTube's default progress bars on watched videos
- **Publication Date Tooltips**: Show video publication dates on hover

### Watch Detection Methods
- **Browser Navigation**: Mark videos when opened in browser
- **Browser History**: Sync from browser's history data
- **YouTube Progress**: Detect when video progress is reported to YouTube
- **YouTube Badge**: Recognize YouTube's native watched indicators
- **YouTube History**: Sync from YouTube's watch history
- **Video Rating**: Mark videos when liked or disliked

### Data Storage & Backup
- **Local Storage**: IndexedDB for primary data storage with proper indexing
- **Supabase Integration**: Optional cloud database storage via PostgreSQL
- **Manual Export/Import**: JSON-based backup and restore functionality
- **Data Migration**: Transfer data between local and cloud storage
- **Bidirectional Sync**: Merge data between IndexedDB and Supabase

### User Interface
- **Modern Design**: Responsive, mobile-friendly interface built with Bootstrap
- **Dark/Light Theme**: Automatic theme switching with system preferences
- **Options Page**: Comprehensive settings management
- **Popup Search**: Quick search interface accessible from browser toolbar
- **Real-time Updates**: Live status indicators and progress reporting
- **Accessibility**: ARIA labels and keyboard navigation support

## Technical Architecture

### Modern Stack
- **Manifest V3**: Latest Chrome extension standard
- **ES6+ Modules**: Modern JavaScript with imports/exports
- **Service Worker**: Background script using latest APIs
- **IndexedDB**: Local database with proper indexing and transactions
- **PostgREST API**: Direct PostgreSQL access via Supabase

### Code Structure
- **`background.js`** - Main extension service worker with `ExtensionManager` class
- **`bg-database.js`** - Database operations with `DatabaseManager` class
- **`bg-history.js`** - Browser history synchronization module
- **`bg-youtube.js`** - YouTube API integration and data fetching
- **`bg-search.js`** - Search functionality and video management
- **`bg-sync-manager.js`** - Automatic synchronization management
- **`youtube.js`** - Content script with `YouTubeWatchMarker` class
- **`content/index.js`** - Options page with `OptionsPageManager` class
- **`supabase-database-provider.js`** - Supabase cloud database integration
- **`database-provider-factory.js`** - Database provider switching logic

### Database Schema
```javascript
{
  strIdent: "video_id",           // YouTube video ID (11 characters)
  intTimestamp: 1234567890,       // Last watched timestamp (Unix time)
  strTitle: "Video Title",        // Video title
  intCount: 1                     // View count
}
```

## Browser Compatibility

- **Chrome/Chromium**: Full support with all features
- **Firefox**: Core functionality supported, Supabase sync requires manual setup
- **Edge**: Full Chrome compatibility expected
- **Safari**: Not currently supported

## Storage Options

### Local Storage (IndexedDB)
- **Default option**: Works offline, no configuration required
- **Fast performance**: Direct browser database access
- **No size limits**: Can store extensive watch histories
- **Privacy**: Data stays on your device

### Supabase Cloud Database
- **Optional remote storage**: PostgreSQL database in the cloud
- **Cross-device sync**: Access your data from multiple devices
- **Manual setup required**: Users must configure Supabase credentials
- **Row Level Security**: Secure data isolation per user

## Data Management

### Backup & Restore
- **JSON Export**: Download your complete watch history
- **JSON Import**: Restore from exported files
- **Data Merging**: Intelligent conflict resolution during imports
- **Provider Migration**: Move data between local and cloud storage

### Synchronization
- **Browser History Sync**: Extract YouTube visits from browser history
- **YouTube History Sync**: Fetch watch history directly from YouTube
- **Liked Videos Sync**: Import liked videos as watched
- **Bidirectional Sync**: Merge data between IndexedDB and Supabase
- **Automatic Sync**: Configurable periodic synchronization

## Development

### Setup
```bash
# Install dependencies
npm install

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Load extension for development
npm run dev
```

### Development Workflow
1. Clone the repository
2. Run `npm install` to install development dependencies
3. Load the extension as unpacked in Chrome Developer Mode
4. Make changes and reload the extension to test
5. Use browser DevTools to debug content scripts and popup
6. Check service worker logs in Extensions page

## Privacy & Security

- **No Data Collection**: Extension doesn't collect or transmit personal data
- **Local-First**: Primary storage is local IndexedDB
- **User Control**: Complete control over sync settings and data sharing
- **Optional Cloud**: Supabase integration is entirely optional
- **Open Source**: Full source code available for inspection

## FAQ

**How can I ensure my watch history is preserved?**  
The extension stores data locally in IndexedDB by default. For additional backup, you can export your data as JSON or optionally configure Supabase for cloud storage.

**How do I set up Supabase sync?**  
Go to the extension options, configure your Supabase URL and API key, then switch to the Supabase provider. You'll need to create the database schema manually using the provided SQL.

**What's the difference between browser history and YouTube history sync?**  
Browser history sync extracts YouTube video visits from your browser's history, while YouTube history sync fetches your watch history directly from YouTube's API. Both sources are merged for completeness.

**Can I customize how watched videos are displayed?**  
Yes, the extension offers multiple visual options including fade-out, grayscale, badges, watch dates, and hiding progress bars. All can be enabled/disabled independently.

## Contributing

Contributions are welcome! Please ensure your code follows the established patterns:
- Use modern JavaScript features (ES6+)
- Follow the existing class-based architecture
- Add JSDoc comments for new functions
- Test on Chrome/Chromium browsers

## Special Thanks

I would like to express my gratitude to [Simon Niklaus](https://github.com/sniklaus) who developed the original extension of which this is a fork.

## Links

- **Original Project**: https://github.com/sniklaus/youtube-watchmarker
- **Current Fork**: https://github.com/widike/youtube-watchmarker

## License

Please refer to the [LICENSE](LICENSE) file within this repository.
