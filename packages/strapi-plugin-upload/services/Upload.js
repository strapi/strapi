'use strict';

/**
 * Upload.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const toArray = require('stream-to-array');
const uuid = require('uuid/v4');

module.exports = {
  getFiles: async values => {
    if (_.size(values.files) === 0) {
      throw 'Missing files.';
    }

    const files = _.isArray(values.files) ? values.files : [values.files];

    return Promise.all(
      files.map(async stream => {
        const parts = await toArray(fs.createReadStream(stream.path));
        const buffers = parts.map(
          part => _.isBuffer(part) ? part : Buffer.from(part)
        );

        return {
          key: `uploads/${uuid().replace(/-/g, '')}.${_.last(stream.name.split('.'))}`,
          buffer: Buffer.concat(buffers),
          mime: stream.type
        };
      })
    );
  },

  upload: (files) => {
    return Promise.all(
      files.map(async file => {
        await new Promise((resolve, reject) => {
          fs.writeFile(path.join(strapi.config.appPath, 'public', file.key), file.buffer, (err) => {
            if (err) {
              return reject(err);
            }

            resolve();
          });
        });
      })
    );
  }
};
