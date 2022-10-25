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
  init({ baseUrl = null, rootPath = null, s3Options, ...legacyS3Options }) {
    if (legacyS3Options && process.env.NODE_ENV !== 'production')
      console.log(
        "S3 configuration options passed at root level of the plugin's providerOptions is deprecated and will be removed in a future release. You wrap them inside the 's3Options:{}' property."
      );

    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...s3Options,
      ...legacyS3Options,
    });

    const upload = (file, customParams = {}) =>
      new Promise((resolve, reject) => {
        // upload file on S3 bucket
        const path = file.path ? `${file.path}/` : '';
        const fileKey = `${rootPath ? `${rootPath.replace(/\/+$/, '')}/` : ''}${path}${file.hash}${
          file.ext
        }`;
        S3.upload(
          {
            Key: fileKey,
            Body: file.stream || Buffer.from(file.buffer, 'binary'),
            ACL: 'public-read',
            ContentType: file.mime,
            ...customParams,
          },
          (err, data) => {
            if (err) {
              return reject(err);
            }

            // set the bucket file url
            if (assertUrlProtocol(data.Location)) {
              file.url = baseUrl ? `${baseUrl}/${fileKey}` : data.Location;
            } else {
              // Default protocol to https protocol
              file.url = `https://${data.Location}`;
            }

            resolve();
          }
        );
      });

    return {
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
              Key: `${rootPath}${path}${file.hash}${file.ext}`,
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
