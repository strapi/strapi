'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */

// Imports the Google Cloud client library
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const slugify = require('@sindresorhus/slugify');

// Slugify uploaded filenames
// https://cloud.google.com/storage/docs/naming#requirements
const slugifyFilename = file => {
  const filename = path.basename(file.name, file.ext);
  const ext = file.ext.toLowerCase();
  return `${slugify(filename)}${ext}`;
};

// Add hash to file path
// https://cloud.google.com/storage/docs/request-rate
const createFilePath = file => {
  const filePath = file.path ? `${file.path}/` : `${file.hash}/`;
  return `${filePath}${slugifyFilename(file)}`;
};

module.exports = {
  provider: 'google-cloud-storage',
  name: 'Google Cloud Storage',
  auth: {
    serviceAccount: {
      label: 'Service Account JSON',
      type: 'textarea'
    },
    bucket: {
      label: 'Bucket (Creates multi-regional bucket if doesn\'t already exist)',
      type: 'text'
    }
  },
  // Synchronous
  init: config => {
    if (!config.serviceAccount || !config.bucket) {
      throw new Error(
        '"Service Account JSON" and "Bucket" fields are required!'
      );
    }
    // The name for the new bucket
    const bucketName = config.bucket;
    let serviceAccount = null;

    // Try to parse credentials from service account
    try {
      serviceAccount = JSON.parse(config.serviceAccount);
    } catch (e) {
      throw new Error('Error parsing service account JSON!');
    }

    // Creates an authenticated storage client
    const storage = new Storage({
      projectId: serviceAccount.project_id,
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key
      }
    });

    return {
      // Handle upload
      upload: async file => {
        const bucket = storage.bucket(bucketName);
        const [bucketExists] = await bucket.exists();
        const filePath = createFilePath(file);

        // Create bucket if it doesn't exist
        if (!bucketExists) {
          await bucket
            .create()
            .then(() => {
              bucket.setStorageClass('multi_regional');
              strapi.log.debug(`Bucket ${bucketName} created.`);
            })
            .catch(error => {
              throw error;
            });
        }

        // Creates a PUBLIC remote file reference
        // and saves(pipes) the file buffer to it
        await storage
          .bucket(bucketName)
          .file(filePath)
          .save(file.buffer, {
            contentType: file.mime,
            public: true,
            metadata: {
              // Download as original filename
              contentDisposition: `inline; filename="${file.name}"`
            }
          })
          .catch(error => {
            throw error;
          });

        // Save PUBLIC url to file
        // https://cloud.google.com/storage/docs/access-public-data
        file.url = `https://storage.googleapis.com/${bucketName}/${filePath}`;

        strapi.log.debug(`Uploaded to ${file.url}`);
      },
      // Handle remote deletion
      delete: async file => {
        await storage
          .bucket(bucketName)
          .file(createFilePath(file))
          .delete()
          .catch(error => {
            // Continue deletion if remote file is missing
            if (error.code === 404) {
              return strapi.log.warn(
                'Remote file not found, you may have to delete manually!'
              );
            }
            throw error;
          });

        strapi.log.debug(`Deleted ${file.url}`);
      }
    };
  }
};
