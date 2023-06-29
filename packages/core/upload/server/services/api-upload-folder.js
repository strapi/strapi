'use strict';

const { isNil, get } = require('lodash/fp');
const { getService } = require('../utils');
const { FOLDER_MODEL_UID, API_UPLOAD_FOLDER_BASE_NAME } = require('../constants');

const getStore = () => strapi.store({ type: 'plugin', name: 'upload', key: 'api-folder' });

const createApiUploadFolder = async () => {
  const name = API_UPLOAD_FOLDER_BASE_NAME;
  const folderService = getService('folder');

  // Folder could exist because of:
  // - concurrent requests
  // - other instances of the app
  let folder = await strapi.db.query(FOLDER_MODEL_UID).findOne({ where: { name, parent: null } });

  if (!folder) {
    folder = await folderService.create({ name, parent: null });
  }

  await getStore().set({ value: { id: folder.id } });

  return folder;
};

const getAPIUploadFolder = async () => {
  const storeValue = await getStore().get();
  const folderId = get('id', storeValue);

  // Wrap in transaction to lock folder table and prevent race conditions
  return strapi.db.transaction(async () => {
    const folder = folderId ? await strapi.entityService.findOne(FOLDER_MODEL_UID, folderId) : null;
    return isNil(folder) ? createApiUploadFolder() : folder;
  });
};

module.exports = {
  getAPIUploadFolder,
};
