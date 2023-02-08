'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const { pipeline } = require('stream');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const {
  errors: { PayloadTooLargeError },
  file: { kbytesToBytes, bytesToHumanReadable },
} = require('@strapi/utils');

const UPLOADS_FOLDER_NAME = 'uploads';

module.exports = {
  init({ sizeLimit: providerOptionsSizeLimit } = {}) {
    // TODO V5: remove providerOptions sizeLimit
    if (providerOptionsSizeLimit) {
      process.emitWarning(
        `[deprecated] In future versions, "sizeLimit" argument will be ignored from upload.config.providerOptions. Move it to upload.config`
      );
    }

    // Ensure uploads folder exists
    const uploadPath = path.resolve(strapi.dirs.static.public, UPLOADS_FOLDER_NAME);
    if (!fse.pathExistsSync(uploadPath)) {
      throw new Error(
        `The upload folder (${uploadPath}) doesn't exist or is not accessible. Please make sure it exists.`
      );
    }

    return {
      checkFileSize(file, { sizeLimit } = {}) {
        // TODO V5: remove providerOptions sizeLimit
        if (providerOptionsSizeLimit) {
          if (kbytesToBytes(file.size) > providerOptionsSizeLimit)
            throw new PayloadTooLargeError(
              `${file.name} exceeds size limit of ${bytesToHumanReadable(
                providerOptionsSizeLimit
              )}.`
            );
        } else if (sizeLimit) {
          if (kbytesToBytes(file.size) > sizeLimit)
            throw new PayloadTooLargeError(
              `${file.name} exceeds size limit of ${bytesToHumanReadable(sizeLimit)}.`
            );
        }
      },
      uploadStream(file) {
        return new Promise((resolve, reject) => {
          pipeline(
            file.stream,
            fs.createWriteStream(path.join(uploadPath, `${file.hash}${file.ext}`)),
            (err) => {
              if (err) {
                return reject(err);
              }

              file.url = `/uploads/${file.hash}${file.ext}`;

              resolve();
            }
          );
        });
      },
      upload(file) {
        return new Promise((resolve, reject) => {
          // write file in public/assets folder
          fs.writeFile(path.join(uploadPath, `${file.hash}${file.ext}`), file.buffer, (err) => {
            if (err) {
              return reject(err);
            }

            file.url = `/${UPLOADS_FOLDER_NAME}/${file.hash}${file.ext}`;

            resolve();
          });
        });
      },
      delete(file) {
        return new Promise((resolve, reject) => {
          const filePath = path.join(uploadPath, `${file.hash}${file.ext}`);

          if (!fs.existsSync(filePath)) {
            // eslint-disable-next-line no-promise-executor-return
            return resolve("File doesn't exist");
          }

          // remove file from public/assets folder
          fs.unlink(filePath, (err) => {
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
