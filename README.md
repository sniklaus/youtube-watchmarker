# youtube-watchmarker

Youtube keeps track of your watch history and automatically marks videos that you have already watched. They however only mark recently seen videos, which is kind of disappointing. This addon fixes this issue and keeps track of your entire watch history, such that not only the recently seen videos are being marked.

<p align="center"><a href="https://sniklaus.com/youwatch"><img src="https://content.sniklaus.com/youwatch/screenshot.jpg" alt="Screenshot"></a></p>

## installation

Firefox: https://addons.mozilla.org/en-US/firefox/addon/watchmarker-for-youtube/
<br />
Chrome: [https://chrome.google.com/webstore/detail/watchmarker-for-youtube/](https://chrome.google.com/webstore/detail/watchmarker-for-youtube/pfkkfbfdhomeagojoahjmkojeeepcolc)

## development

This extension has been modernized to use contemporary JavaScript practices and patterns:

### Code Structure

- **ES6+ Modules**: All code uses modern ES6 imports/exports
- **Classes**: Object-oriented design with proper encapsulation
- **Async/Await**: Modern asynchronous programming patterns
- **Type Annotations**: Comprehensive JSDoc documentation
- **Error Handling**: Proper try/catch blocks and error propagation

### Architecture

- `utils.js` - Core utilities and helper functions
- `background.js` - Main extension background script with ExtensionManager class
- `bg-database.js` - Database operations using DatabaseManager class
- `bg-history.js` - Browser history synchronization
- `bg-youtube.js` - YouTube API integration
- `bg-search.js` - Search functionality
- `youtube.js` - Content script with YouTubeWatchMarker class
- `content/index.js` - Options page with OptionsPageManager class

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
```

### Key Improvements

1. **Performance**: Optimized DOM queries and batch processing
2. **Maintainability**: Clear separation of concerns and modular design
3. **Error Handling**: Comprehensive error handling with meaningful messages
4. **Modern Syntax**: Arrow functions, destructuring, template literals
5. **Type Safety**: JSDoc annotations for better IDE support
6. **Memory Management**: Proper cleanup of observers and event listeners

## questions

<b>How can the persistence of the database be ensured?</b> There is an export and import feature, which makes it easy to create a backup of the history. This backup can easily be archived such that you can ensure that you never lose your history.

<b>How can I make sure that the database is complete?</b> The automatic synchronization only considers the recent activity. You are thus encouraged to manually initiate a complete synchronization in the settings, which incorporates as much of your history as possible.

## special thanks

I would like to express my gratitude to [XP1](https://github.com/XP1) who has been a significant contributor to this project throughout the years. Not only does he support other users with their issues and opens up pull reuqest to improve this extension, he also comes up with [creative solutions](https://github.com/sniklaus/youtube-watchmarker/pull/126) such as adding a mutation observer to certain objects to detect changes in the Youtube layout.

## links

- 2025.01 - this [project](https://github.com/yutotakano/youtube-takeout-json-to-watchmarker) to import from takeout by [yutotakano](https://github.com/yutotakano)
- 2025.01 - this [project](https://github.com/serossi/YT2Grayjay) to import from takeout and export to grayjay by [serossi](https://github.com/serossi)
- 2021.05 - this [project](https://github.com/janpaul123/youtube-takeout-to-watchmarker) to import from takeout by [janpaul123](https://github.com/janpaul123)

## license

Please refer to the appropriate file within this repository.
