'use strict';

const db = require('mime-db');
const mime = require('mime-type')(db);

module.exports = {
  async getMediaTypes(ctx) {
    const data = {
      types: ['images', 'videos', 'files'],
      mimeTypes: {
        images: mime.glob('image/*'),
        videos: mime.glob('video/*'),
      },
    };

    ctx.body = { data };
  },
};
