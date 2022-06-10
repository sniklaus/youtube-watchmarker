'use strict';

const Utils = {
  urlIsVideo: (url) => {
    return url.includes('https://www.youtube.com/watch?v=') || url.includes('https://www.youtube.com/shorts/');
  },

  getVideoIdByUrl: (url) => {
    const lastSlashIndex = url.lastIndexOf('/');
    const idPart = url.substring(lastSlashIndex).replace('/', '').replace('watch?v=', '');

    return idPart.substring(0, 11);
  }
}
