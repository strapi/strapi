'use strict';

const path = require('path');
const fse = require('fs-extra');

/**
 * Deletes the API folder of a contentType
 * @param {string} uid content type uid
 */
async function clear(uid) {
  const { apiName, modelName } = strapi.contentTypes[uid];

  const apiFolder = path.join(strapi.dirs.api, apiName);

  await recursiveRemoveFiles(apiFolder, createDeleteApiFunction(modelName));
  await deleteBackup(uid);
}

/**
 * Backups the API folder of a contentType
 * @param {string} uid content type uid
 */
async function backup(uid) {
  const { apiName } = strapi.contentTypes[uid];

  const apiFolder = path.join(strapi.dirs.api, apiName);
  const backupFolder = path.join(strapi.dirs.api, '.backup', apiName);

  // backup the api folder
  await fse.copy(apiFolder, backupFolder);
}

/**
 * Deletes an API backup folder
 * @param {string} uid content type uid
 */
async function deleteBackup(uid) {
  const { apiName } = strapi.contentTypes[uid];

  const backupFolder = path.join(strapi.dirs.api, '.backup');
  const apiBackupFolder = path.join(strapi.dirs.api, '.backup', apiName);

  await fse.remove(apiBackupFolder);

  const list = await fse.readdir(backupFolder);
  if (list.length === 0) {
    await fse.remove(backupFolder);
  }
}

/**
 * Rollbacks the API folder of a contentType
 * @param {string} uid content type uid
 */
async function rollback(uid) {
  const { apiName } = strapi.contentTypes[uid];

  const apiFolder = path.join(strapi.dirs.api, apiName);
  const backupFolder = path.join(strapi.dirs.api, '.backup', apiName);

  const exists = await fse.exists(backupFolder);

  if (!exists) {
    throw new Error('Cannot rollback api that was not backed up');
  }

  await fse.remove(apiFolder);
  await fse.copy(backupFolder, apiFolder);
  await deleteBackup(uid);
}

/**
 * Creates a delete function to clear an api folder
 * @param {string} baseName
 */
const createDeleteApiFunction = baseName => {
  /**
   * Delets a file in an api.
   * Will only update routes.json instead of deleting it if other routes are present
   * @param {string} filePath file path to delete
   */
  return async filePath => {
    const fileName = path.basename(filePath, path.extname(filePath));

    const isSchemaFile = filePath.endsWith(`${baseName}/schema.json`);
    if (fileName === baseName || isSchemaFile) {
      return fse.remove(filePath);
    }
  };
};

/**
 * Deletes a folder recursively using a delete function
 * @param {string} folder folder to delete
 * @param {Function} deleteFn function to call with the file path to delete
 */
const recursiveRemoveFiles = async (folder, deleteFn) => {
  const filesName = await fse.readdir(folder);

  for (const fileName of filesName) {
    const filePath = path.join(folder, fileName);

    const stat = await fse.stat(filePath);

    if (stat.isDirectory()) {
      await recursiveRemoveFiles(filePath, deleteFn);
    } else {
      await deleteFn(filePath);
    }
  }

  const files = await fse.readdir(folder);
  if (files.length === 0) {
    await fse.remove(folder);
  }
};

module.exports = () => ({
  clear,
  backup,
  rollback,
});
