'use strict';

/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
// Public node modules.
const get = require('lodash/get');
const AWS = require('aws-sdk');
const { getBucketFromUrl } = require('./utils');

function assertUrlProtocol(url) {
  // Regex to test protocol like "http://", "https://"
  return /^\w*:\/\//.test(url);
}

module.exports = {
  init(config) {
    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...config,
    });

    const ACL = get(config, ['params', 'ACL'], 'public-read');

    const upload = (file, customParams = {}) =>
      new Promise((resolve, reject) => {
        // upload file on S3 bucket
        const path = file.path ? `${file.path}/` : '';
        const fileKey = `${path}${file.hash}${file.ext}`;
        S3.upload(
          {
            Key: fileKey,
            Body: file.stream || Buffer.from(file.buffer, 'binary'),
            ACL,
            ContentType: file.mime,
            ...customParams,
          },
          (err, data) => {
            if (err) {
              return reject(err);
            }

            // set the bucket file url
            if (assertUrlProtocol(data.Location)) {
              file.url = data.Location;
            } else {
              // Default protocol to https protocol
              file.url = `https://${data.Location}`;
            }
            resolve();
          }
        );
      });

    return {
      isPrivate() {
        return ACL === 'private';
      },
      /**
       * @param {Object} file
       * @param {string} file.path
       * @param {string} file.hash
       * @param {string} file.ext
       * @param {Object} customParams
       * @returns {Promise<{url: string}>}
       */
      getSignedUrl(file, customParams = {}) {
        // Do not sign the url if it does not come from the same bucket.
        const { bucket } = getBucketFromUrl(file.url);
        if (bucket !== config.params.Bucket) {
          return { url: file.url };
        }

        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : '';
          const fileKey = `${path}${file.hash}${file.ext}`;

          S3.getSignedUrl(
            'getObject',
            {
              Bucket: config.params.Bucket,
              Key: fileKey,
              Expires: get(config, ['params', 'signedUrlExpires'], 60 * 60 * 24 * 7), // 7 days
            },
            (err, url) => {
              if (err) {
                return reject(err);
              }
              resolve({ url });
            }
          );
        });
      },
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          const path = file.path ? `${file.path}/` : '';
          S3.deleteObject(
            {
              Key: `${path}${file.hash}${file.ext}`,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              resolve();
            }
          );
        });
      },
    };
  },
};
