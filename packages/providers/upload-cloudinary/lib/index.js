'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const cloudinary = require('cloudinary').v2;
const intoStream = require('into-stream');
const { PayloadTooLargeError } = require('@strapi/utils').errors;

module.exports = {
  init(config) {
    cloudinary.config(config);

    const upload = (file, customConfig = {}) =>
      new Promise((resolve, reject) => {
        const config = {
          resource_type: 'auto',
          public_id: file.hash,
        };

        if (file.ext) {
          config.filename = `${file.hash}${file.ext}`;
        }

        const upload_stream = cloudinary.uploader.upload_stream(
          { ...config, ...customConfig },
          (err, image) => {
            if (err) {
              if (err.message.includes('File size too large')) {
                reject(new PayloadTooLargeError());
              }
              reject(new Error(`Error uploading to cloudinary: ${err.message}`));
            }

            if (image.resource_type === 'video') {
              file.previewUrl = cloudinary.url(`${image.public_id}.gif`, {
                video_sampling: 6,
                delay: 200,
                width: 250,
                crop: 'scale',
                resource_type: 'video',
              });
            }

            file.url = image.secure_url;
            file.provider_metadata = {
              public_id: image.public_id,
              resource_type: image.resource_type,
            };
            resolve();
          }
        );

        file.stream ? file.stream.pipe(upload_stream) : intoStream(file.buffer).pipe(upload_stream);
      });

    return {
      uploadStream(file, customConfig = {}) {
        return upload(file, customConfig);
      },
      upload(file, customConfig = {}) {
        return upload(file, customConfig);
      },
      async delete(file, customConfig = {}) {
        try {
          const { resource_type, public_id } = file.provider_metadata;
          const response = await cloudinary.uploader.destroy(public_id, {
            invalidate: true,
            resource_type: resource_type || 'image',
            ...customConfig,
          });

          if (response.result !== 'ok' && response.result !== 'not found') {
            throw new Error(`Error deleting on cloudinary: ${response.result}`);
          }
        } catch (error) {
          throw new Error(`Error deleting on cloudinary: ${error.message}`);
        }
      },
    };
  },
};
