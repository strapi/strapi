'use strict';

const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash');

/**
 * Deletes the API folder of a contentType
 * @param {string} uid content type uid
 */
async function clear(uid) {
  const { apiName, __filename__ } = strapi.contentTypes[uid];

  const apiFolder = path.join(strapi.dir, 'api', apiName);

  // base name of the model file that will be use as comparator
  const baseName = path.basename(__filename__, '.settings.json');

  await recursiveRemoveFiles(apiFolder, createDeleteApiFunction(baseName));
  await deleteBackup(uid);
}

/**
 * Backups the API folder of a contentType
 * @param {string} uid content type uid
 */
async function backup(uid) {
  const { apiName } = strapi.contentTypes[uid];

  const apiFolder = path.join(strapi.dir, 'api', apiName);
  const backupFolder = path.join(strapi.dir, 'api', '.backup', apiName);

  // backup the api folder
  await fse.copy(apiFolder, backupFolder);
}

/**
 * Deletes an API backup folder
 * @param {string} uid content type uid
 */
async function deleteBackup(uid) {
  const { apiName } = strapi.contentTypes[uid];

  const backupFolder = path.join(strapi.dir, 'api', '.backup');
  const apiBackupFolder = path.join(strapi.dir, 'api', '.backup', apiName);

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

  const apiFolder = path.join(strapi.dir, 'api', apiName);
  const backupFolder = path.join(strapi.dir, 'api', '.backup', apiName);

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
  const startWithBaseName = startWithName(baseName + '.');

  /**
   * Delets a file in an api.
   * Will only update routes.json instead of deleting it if other routes are present
   * @param {string} filePath file path to delete
   */
  return async filePath => {
    const fileName = path.basename(filePath);

    if (startWithBaseName(fileName)) return fse.remove(filePath);

    if (fileName === 'routes.json') {
      const { routes } = await fse.readJSON(filePath);

      const routesToKeep = routes.filter(route => !startWithBaseName(route.handler));

      if (routesToKeep.length === 0) {
        return fse.remove(filePath);
      }

      await fse.writeJSON(
        filePath,
        {
          routes: routesToKeep,
        },
        {
          spaces: 2,
        }
      );
    }
  };
};

/**
 * Returns a function that checks if the passed string starts with the name
 * @param {string} prefix
 * @returns {Function} a comparing function
 */
const startWithName = prefix => {
  /**
   * Checks if str starts with prefix case insensitive
   * @param {string} str string to compare
   */
  return str => _.startsWith(_.toLower(str), _.toLower(prefix));
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

module.exports = {
  clear,
  backup,
  rollback,
};
