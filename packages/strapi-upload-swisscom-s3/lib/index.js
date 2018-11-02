'use strict';

/* eslint-disable import/no-unresolved */
/* eslint-disable no-unused-vars */
const _ = require('lodash');
const AWS = require('aws-sdk');

module.exports = {
  provider: 'swisscom-s3',
  name: 'Swisscom Dynamic Storage',
  auth: {
    host: {
      label: 'Access Host',
      type: 'text'
    },
    namespaceHost: {
      label: 'Namespace Host',
      type: 'text'
    },
    key: {
      label: 'Access Key',
      type: 'text'
    },
    secret: {
      label: 'Shared Secret',
      type: 'text'
    },
    bucket: {
      label: 'Bucket Name',
      type: 'text'
    }
  },

  init: config => {
    AWS.config.update({
      accessKeyId: config.key,
      secretAccessKey: config.secret
    });

    const S3 = new AWS.S3({
      endpoint: new AWS.Endpoint(config.host),
      apiVersion: '2006-03-01',
      params: {
        Bucket: config.bucket
      }
    });

    return {
      upload: file => {
        return new Promise((resolve, reject) => {
          const path = file.path ? `${file.path}/` : '';
          S3.upload(
            {
              Key: `${path}${file.hash}${file.ext}`,
              Body: new Buffer(file.buffer, 'binary'),
              ACL: 'public-read',
              ContentType: file.mime
            },
            (err, data) => {
              if (err) return reject(err);

              file.url =
                'https://' +
                config.namespaceHost +
                '/' +
                config.bucket +
                '/' +
                data.key;

              resolve();
            }
          );
        });
      },

      delete: file => {
        return new Promise((resolve, reject) => {
          S3.deleteObject(
            {
              Bucket: config.bucket,
              Key: `${file.hash}${file.ext}`
            },
            (err, data) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      }
    };
  }
};
