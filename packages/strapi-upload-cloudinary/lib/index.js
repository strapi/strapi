'use strict';

/**
 * Module dependencies
 */

// Public node modules.
/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */
const cloudinary = require('cloudinary').v2;
const intoStream = require('into-stream');

module.exports = {
  provider: 'cloudinary',
  name: 'Cloudinary',
  auth: {
    cloud_name: {
      label: 'Cloud name',
      type: 'text'
    },
    api_key: {
      label: 'API Key',
      type: 'text'
    },
    api_secret: {
      label: 'API Secret',
      type: 'text'
    }
  },
  init: (config) => {
    cloudinary.config({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret
    });

    return {
      upload (file) {
        return new Promise((resolve, reject) => {
          const upload_stream = cloudinary.uploader.upload_stream({}, (err, image) => {
            if (err) {
              return reject(err);
            }
            file.public_id = image.public_id;
            file.url = image.secure_url;
            resolve();
          });
          intoStream(file.buffer).pipe(upload_stream);
        });
      },
      async delete (file) {
        try {
          const response = await cloudinary.uploader.destroy(file.public_id + '3', {
            invalidate: true
          });
          if (response.result !== 'ok') {
            throw {
              error: new Error(response.result)
            };
          }
        } catch (error) {
          throw error.error;
        }
      }
    };
  }
};
