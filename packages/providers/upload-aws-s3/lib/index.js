'use strict';

/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
// Public node modules.
const _ = require('lodash');
const AWS = require('aws-sdk');

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

    const upload = (file, customParams = {}) =>
      new Promise((resolve, reject) => {
        // upload file on S3 bucket
        const path = file.path ? `${file.path}/` : '';
        const fileKey = `${path}${file.hash}${file.ext}`;
        S3.upload(
          {
            Key: fileKey,
            Body: file.stream || Buffer.from(file.buffer, 'binary'),
            ACL: 'private',
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
        return true;
      },
      /**
       *
       * @param {string} fileIdentifier
       * @param {*} customParams
       * @returns
       */
      getSignedUrl(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : '';
          const fileKey = `${path}${file.hash}${file.ext}`;
          S3.getSignedUrl(
            'getObject',
            {
              Bucket: config.params.Bucket,
              Key: fileKey,
              Expires: 60 * 60 * 24 * 7, // TODO: Make this configurable.
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
