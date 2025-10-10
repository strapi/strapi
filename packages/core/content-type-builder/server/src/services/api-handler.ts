import * as path from 'path';
import * as fse from 'fs-extra';
import type { Internal } from '@strapi/types';

/**
 * Deletes the API folder of a contentType
 */
export async function clear(uid: Internal.UID.ContentType) {
  // TODO double check if this is the correct way to get the apiName
  const { apiName, modelName } = strapi.contentTypes[uid] as any;

  const apiFolder = path.join(strapi.dirs.app.api, apiName);

  await recursiveRemoveFiles(apiFolder, createDeleteApiFunction(modelName));
  await deleteBackup(uid);
}

/**
 * Backups the API folder of a contentType
 * @param {string} uid content type uid
 */
export async function backup(uid: Internal.UID.ContentType) {
  const { apiName } = strapi.contentTypes[uid] as any;

  const apiFolder = path.join(strapi.dirs.app.api, apiName);
  const backupFolder = path.join(strapi.dirs.app.api, '.backup', apiName);

  // backup the api folder
  await fse.copy(apiFolder, backupFolder);
}

/**
 * Deletes an API backup folder
 */
async function deleteBackup(uid: Internal.UID.ContentType) {
  const { apiName } = strapi.contentTypes[uid] as any;

  const backupFolder = path.join(strapi.dirs.app.api, '.backup');
  const apiBackupFolder = path.join(strapi.dirs.app.api, '.backup', apiName);

  await fse.remove(apiBackupFolder);

  const list = await fse.readdir(backupFolder);
  if (list.length === 0) {
    await fse.remove(backupFolder);
  }
}

/**
 * Rollbacks the API folder of a contentType
 */
export async function rollback(uid: Internal.UID.ContentType) {
  const { apiName } = strapi.contentTypes[uid] as any;

  const apiFolder = path.join(strapi.dirs.app.api, apiName);
  const backupFolder = path.join(strapi.dirs.app.api, '.backup', apiName);

  try {
    await fse.access(backupFolder);
  } catch {
    throw new Error('Cannot rollback api that was not backed up');
  }

  await fse.remove(apiFolder);
  await fse.copy(backupFolder, apiFolder);
  await deleteBackup(uid);
}

/**
 * Creates a delete function to clear an api folder
 */
const createDeleteApiFunction = (baseName: string) => {
  /**
   * Delets a file in an api.
   * Will only update routes.json instead of deleting it if other routes are present
   */
  return async (filePath: string) => {
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
 */
const recursiveRemoveFiles = async (folder: string, deleteFn: (file: string) => unknown) => {
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
