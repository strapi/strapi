'use strict';

/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
// Public node modules.
const AWS = require('aws-sdk');

function assertUrlProtocol(url) {
  // Regex to test protocol like "http://", "https://"
  return /^\w*:\/\//.test(url);
}

function buildPath(file, pathPrefix) {
  const path = file.path ? `${file.path}/` : '';

  return pathPrefix ? `${pathPrefix}/${path}` : path;
}

module.exports = {
  init(providerOptions) {
    // config is the fallback if no s3 property is given
    const { s3, pathPrefix, ...config } = providerOptions;

    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...(s3 ?? config),
    });

    const upload = (file, customParams = {}) =>
      new Promise((resolve, reject) => {
        // upload file on S3 bucket
        const path = buildPath(file, pathPrefix);
        S3.upload(
          {
            Key: `${path}${file.hash}${file.ext}`,
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
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          const path = buildPath(file, pathPrefix);
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
