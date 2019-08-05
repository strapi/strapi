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
      type: 'text',
    },
    api_key: {
      label: 'API Key',
      type: 'text',
    },
    api_secret: {
      label: 'API Secret',
      type: 'password',
    },
  },
  init: config => {
    cloudinary.config({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret,
    });

    return {
      upload(file) {
        return new Promise((resolve, reject) => {
          const upload_stream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto' },
            (err, image) => {
              if (err) {
                return reject(err);
              }
              file.url = image.secure_url;
              file.provider_metadata = {
                public_id: image.public_id,
                resource_type: image.resource_type,
              };
              resolve();
            }
          );
          intoStream(file.buffer).pipe(upload_stream);
        });
      },
      async delete(file) {
        try {
          const { resource_type, public_id } = file.provider_metadata;
          const response = await cloudinary.uploader.destroy(public_id, {
            invalidate: true,
            resource_type: resource_type || 'image',
          });
          if (response.result !== 'ok') {
            throw {
              error: new Error(response.result),
            };
          }
        } catch (error) {
          throw error.error;
        }
      },
    };
  },
};
