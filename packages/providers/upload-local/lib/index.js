'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const fs = require('fs');
const path = require('path');
const { PayloadTooLargeError } = require('@strapi/utils').errors;

module.exports = {
  init({ sizeLimit = 1000000 } = {}) {
    const verifySize = file => {
      if (file.size > sizeLimit) {
        throw new PayloadTooLargeError();
      }
    };

    const publicDir = strapi.dirs.public;

    return {
      upload(file) {
        verifySize(file);

        return new Promise((resolve, reject) => {
          // write file in public/assets folder
          fs.writeFile(
            path.join(publicDir, `/uploads/${file.hash}${file.ext}`),
            file.buffer,
            err => {
              if (err) {
                return reject(err);
              }

              file.url = `/uploads/${file.hash}${file.ext}`;

              resolve();
            }
          );
        });
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          const filePath = path.join(publicDir, `/uploads/${file.hash}${file.ext}`);

          if (!fs.existsSync(filePath)) {
            return resolve("File doesn't exist");
          }

          // remove file from public/assets folder
          fs.unlink(filePath, err => {
            if (err) {
              return reject(err);
            }

            resolve();
          });
        });
      },
    };
  },
};
