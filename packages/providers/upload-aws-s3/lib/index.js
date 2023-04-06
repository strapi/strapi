'use strict';

/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
const { getOr } = require('lodash/fp');
const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getBucketFromUrl } = require('./utils');

function assertUrlProtocol(url) {
  // Regex to test protocol like "http://", "https://"
  return /^\w*:\/\//.test(url);
}

function getConfig({ baseUrl = null, rootPath = null, s3Options, ...legacyS3Options }) {
  if (legacyS3Options) {
    process.emitWarning(
      "S3 configuration options passed at root level of the plugin's providerOptions is deprecated and will be removed in a future release. Please wrap them inside the 's3Options:{}' property."
    );
  }

  // TODO: Check config compat between v2 and v3, credentials params are not the same in v3
  const config = { ...s3Options, ...legacyS3Options };
  config.ACL = getOr('public-read', ['params', 'ACL'], config);

  return config;
}

module.exports = {
  init({ baseUrl = null, rootPath = null, s3Options, ...legacyS3Options }) {
    const config = getConfig({ baseUrl, rootPath, s3Options, ...legacyS3Options });

    const S3 = new S3Client({
      apiVersion: '2006-03-01',
      ...config,
    });

    const getFileKey = (file) => {
      const filePrefix = rootPath ? `${rootPath.replace(/\/+$/, '')}/` : '';
      const path = file.path ? `${file.path}/` : '';
      return `${filePrefix}${path}${file.hash}${file.ext}`;
    };

    const upload = async (file, customParams = {}) => {
      const fileKey = getFileKey(file);
      const parallelUpload = new Upload({
        client: S3,
        params: {
          Bucket: config.params.Bucket,
          Key: fileKey,
          Body: file.stream || Buffer.from(file.buffer, 'binary'),
          ACL: config.ACL,
          ContentType: file.mime,
          ...customParams,
        },
      });

      const upload = await parallelUpload.done();

      if (assertUrlProtocol(upload.Location)) {
        file.url = baseUrl ? `${baseUrl}/${fileKey}` : upload.Location;
      } else {
        // Default protocol to https protocol
        file.url = `https://${upload.Location}`;
      }
    };
    return {
      isPrivate() {
        return config.ACL === 'private';
      },
      /**
       * @param {Object} file
       * @param {string} file.path
       * @param {string} file.hash
       * @param {string} file.ext
       * @param {Object} customParams
       * @returns {Promise<{url: string}>}
       */
      async getSignedUrl(file, customParams = {}) {
        // Do not sign the url if it does not come from the same bucket.
        const { bucket } = getBucketFromUrl(file.url);
        if (bucket !== config.params.Bucket) {
          return { url: file.url };
        }

        const fileKey = getFileKey(file);

        const url = await getSignedUrl(
          S3,
          new GetObjectCommand({
            Bucket: config.params.Bucket,
            Key: fileKey,
            ...customParams,
          }),
          {
            expiresIn: getOr(15 * 60, ['params', 'signedUrlExpires'], config),
          }
        );

        return { url };
      },
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file, customParams = {}) {
        const command = new DeleteObjectCommand({
          Bucket: config.params.Bucket,
          Key: getFileKey(file),
          ...customParams,
        });
        return S3.send(command);
      },
    };
  },
};
