'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-vars */
// Public node modules.
const { URL } = require('url');
const MinioSDK = require('minio');

module.exports = {
  provider: 'minio',
  name: 'Minio Server',
  auth: {
    public: {
      label: 'Access API Token',
      type: 'text'
    },
    private: {
      label: 'Secret Access Token',
      type: 'text'
    },
    bucket: {
      label: 'Bucket',
      type: 'text'
    },
    endpoint: {
      label: 'Endpoint',
      type: 'text'
    }
  },
  init: (config) => {
    // configure Minio bucket connection
    const endPoint = new URL(config.endpoint);
    const useSSL = endPoint.protocol && endPoint.protocol === 'https:';

    const Minio = new MinioSDK.Client({
      endPoint: endPoint.hostname,
      port: parseInt(endPoint.port) || (useSSL ? 443 : 80),
      useSSL: useSSL,
      accessKey: config.public,
      secretKey: config.private
    });

    return {
      upload: (file) => {
        return new Promise((resolve, reject) => {
          const filename = (file.path ? `${file.path}.` : '') + `${file.hash}${file.ext}`;
          const buffer = new Buffer(file.buffer, 'binary');

          Minio.putObject(config.bucket, filename, buffer, (err, tag) => {
            if(err) {
              reject(err);
            }

            file.url = `${Minio.protocol}//${Minio.host}:${Minio.port}/${config.bucket}/${filename}`;

            resolve();
          });
        });
      },
      delete: (file) => {
        return new Promise((resolve, reject) => {
          const filename = (file.path ? `${file.path}.` : '') + `${file.hash}${file.ext}`;

          Minio.removeObject(config.bucket, filename, (err) => {
            if(err) {
              reject(err);
            }

            resolve();
          });
        });
      }
    };
  }
};
