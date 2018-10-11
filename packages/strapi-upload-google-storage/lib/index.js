'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */

// Imports the Google Cloud client library
const { Storage } = require('@google-cloud/storage');

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
  init: config => {
    if (!config.serviceAccount || !config.bucket) {
      throw new Error(
        '"Service Account JSON" and "Bucket" fields are required!'
      );
    }

    // The name for the new bucket
    const bucketName = config.bucket;
    let serviceAccount = null;

    // try to parse service account
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

    // Checks for existing bucket
    const bucket = storage.bucket(bucketName);

    bucket.exists().then(([bucketExists]) => {
      if (!bucketExists) {
        // Creates the new bucket
        bucket
          .create()
          .then(() => {
            bucket.setStorageClass('multi_regional');
            strapi.log.debug(`Bucket ${bucketName} created.`);
          })
          .catch(error => {
            throw error;
          });
      }
    });

    return {
      upload: async file => {
        const path = file.path ? `${file.path}/` : '';
        const filename = `${path}${file.hash}${file.ext}`;
        await storage
          .bucket(bucketName)
          .file(filename)
          .save(file.buffer, {
            contentType: file.mime,
            public: true,
            metadata: {
              contentDisposition: `inline; filename="${file.name}"`
            }
          })
          .catch(error => {
            throw error;
          });

        // Save url to file
        file.url = `https://storage.googleapis.com/${bucketName}/${filename}`;

        strapi.log.debug(`Uploaded to ${file.url}`);
      },
      delete: async file => {
        const path = file.path ? `${file.path}/` : '';
        const filename = `${path}${file.hash}${file.ext}`;
        await storage
          .bucket(bucketName)
          .file(filename)
          .delete()
          .catch(error => {
            if (error.code === 404) return; // skip not found files
            throw error;
          });

        strapi.log.debug(`Deleted ${file.url}`);
      }
    };
  }
};
