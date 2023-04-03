'use strict';

/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
// Public node modules.
const { getOr } = require('lodash/fp');
const AWS = require('aws-sdk');
const { isUrlFromBucket } = require('./utils');

function hasUrlProtocol(url) {
  // Regex to test protocol like "http://", "https://"
  return /^\w*:\/\//.test(url);
}

module.exports = {
  init({ baseUrl = null, rootPath = null, s3Options, ...legacyS3Options }) {
    if (legacyS3Options) {
      process.emitWarning(
        "S3 configuration options passed at root level of the plugin's providerOptions is deprecated and will be removed in a future release. Please wrap them inside the 's3Options:{}' property."
      );
    }

    const config = { ...s3Options, ...legacyS3Options };

    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...config,
    });

    const filePrefix = rootPath ? `${rootPath.replace(/\/+$/, '')}/` : '';

    const getFileKey = (file) => {
      const path = file.path ? `${file.path}/` : '';

      return `${filePrefix}${path}${file.hash}${file.ext}`;
    };

    const ACL = getOr('public-read', ['params', 'ACL'], config);

    // if ACL is private and baseUrl is set, we need to warn the user
    // signed url's will not have the baseUrl prefix
    if (ACL === 'private' && baseUrl) {
      process.emitWarning(
        'You are using a private ACL with a baseUrl. This is not recommended as the files will be accessible without the baseUrl prefix.'
      );
    }

    const upload = (file, customParams = {}) =>
      new Promise((resolve, reject) => {
        // upload file on S3 bucket
        const fileKey = getFileKey(file);
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

            if (baseUrl) {
              // Construct the url with the baseUrl
              file.url = `${baseUrl}/${fileKey}`;
            } else {
              // Add the protocol if it is missing
              // Some providers like DigitalOcean Spaces return the url without the protocol
              file.url = hasUrlProtocol(data.Location) ? data.Location : `https://${data.Location}`;
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
      getSignedUrl(file) {
        // Do not sign the url if it does not come from the same bucket.
        if (!isUrlFromBucket(file.url, config.params.Bucket, baseUrl)) {
          return { url: file.url };
        }

        return new Promise((resolve, reject) => {
          const fileKey = getFileKey(file);

          S3.getSignedUrl(
            'getObject',
            {
              Bucket: config.params.Bucket,
              Key: fileKey,
              Expires: getOr(15 * 60, ['params', 'signedUrlExpires'], config), // 15 minutes
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
          const fileKey = getFileKey(file);
          S3.deleteObject(
            {
              Key: fileKey,
              ...customParams,
            },
            (err) => {
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
