'use strict';

const Utils = {
  urlIsVideo: (url) => {
    return url.includes('https://www.youtube.com/watch?v=') || url.includes('https://www.youtube.com/shorts/');
  },

  getVideoIdByUrl: (url) => {
    const lastSlashIndex = url.lastIndexOf('/');
    return url.substring(lastSlashIndex).replace('/', '').replace('watch?v=', '');
  }
}
