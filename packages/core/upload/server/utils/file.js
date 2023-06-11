'use strict';

const os = require('os');
const path = require('path');
const fse = require('fs-extra');
const crypto = require('crypto');
const { fromStream } = require('file-type');
const { nameToSlug } = require('@strapi/utils');

/**
 * Get the file type from a file stream.
 * @param {File} file
 * @returns {Promise<string>}
 */
const getFileType = async (file) => {
  const fileType = await fromStream(file.getStream());
  return fileType?.ext;
};

/**
 * Generate a random file name based on the original file name.
 */
const generateFileName = (name) => {
  const baseName = nameToSlug(name, { separator: '_', lowercase: false });
  const randomSuffix = crypto.randomBytes(5).toString('hex');
  return `${baseName}_${randomSuffix}`;
};

/**
 * Creates a temporary directory and deletes it after the callback is executed.
 * @param {*} callback
 * @returns
 */
async function withTempDirectory(callback) {
  const folderPath = path.join(os.tmpdir(), 'strapi-upload-');
  const folder = await fse.mkdtemp(folderPath);

  try {
    const res = await callback(folder);
    return res;
  } finally {
    await fse.remove(folder);
  }
}

module.exports = {
  getFileType,
  generateFileName,
  withTempDirectory,
};
