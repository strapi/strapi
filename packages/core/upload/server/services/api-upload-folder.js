'use strict';

const { isNil, get } = require('lodash/fp');
const { getService } = require('../utils');

const folderModel = 'plugin::upload.folder';
const API_UPLOAD_FOLDER_BASE_NAME = 'Uploads';

const getStore = () => strapi.store({ type: 'plugin', name: 'upload', key: 'api-folder' });

const createApiUploadFolder = async () => {
  let name = API_UPLOAD_FOLDER_BASE_NAME;
  const folderService = getService('folder');

  let exists = true;
  let index = 1;
  while (exists) {
    exists = await folderService.exists({ name, parent: null }); // TODO: check if works
    if (exists) {
      name = `${API_UPLOAD_FOLDER_BASE_NAME} (${index})`;
      index += 1;
    }
  }

  const folder = await folderService.create({ name, parent: null });

  await getStore().set({ value: { id: folder.id } });

  return folder;
};

const getAPIUploadFolder = async () => {
  const storeValue = await getStore().get();
  const folderId = get('id', storeValue);

  const folder = folderId ? await strapi.entityService.findOne(folderModel, folderId) : null;

  return isNil(folder) ? createApiUploadFolder() : folder;
};

module.exports = {
  getAPIUploadFolder,
};
