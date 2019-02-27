'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const fs = require('fs');
const path = require('path');
/* eslint-disable no-unused-vars */
module.exports = {
  provider: 'local',
  name: 'Local server',
  init: (config) => {
    // write file in public/assets folder
    const write = (file, dirPath) => {
      return new Promise((resolve, reject) => {
        fs.writeFile(path.join(dirPath, `${file.hash}${file.ext}`), file.buffer, (err) => {
          if (err) {
            return reject(err);
          }

          file.url = `/uploads/${file.hash}${file.ext}`;

          resolve();
        });
      });
    };

    return {
      upload: (file) => {
        return new Promise((resolve, reject) => {
          const dirPath = path.join(strapi.config.appPath, 'public', 'uploads');
          
          // Check if directory exists
          fs.exists(dirPath, (exists) => {
            if (exists) {
              resolve(write(file, dirPath));
            } else {
              // Create directory if not exists
              fs.mkdir(dirPath, {recursive: true}, (err) => {
                if (err) {
                  return reject(err);
                }

                resolve(write(file, dirPath));
              });
            }
          });
          
          
        });
      },
      delete: (file) => {
        return new Promise((resolve, reject) => {
          const filePath = path.join(strapi.config.appPath, 'public', `uploads/${file.hash}${file.ext}`);

          if (!fs.existsSync(filePath)) {
            return resolve('File doesn\'t exist');
          }

          // remove file from public/assets folder
          fs.unlink(filePath, (err) => {
            if (err) {
              return reject(err);
            }

            resolve();
          });
        });
      }
    };
  }
};
