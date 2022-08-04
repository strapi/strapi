'use strict';

const { FOLDER_MODEL_UID, FILE_MODEL_UID } = require('../constants');

const { getService } = require('../utils');

const getFolderPath = async folderId => {
  if (!folderId) return '/';

  const parentFolder = await strapi.entityService.findOne(FOLDER_MODEL_UID, folderId);

  return parentFolder.path;
};

const deleteByIds = async (ids = []) => {
  const filesToDelete = await strapi.db
    .query(FILE_MODEL_UID)
    .findMany({ where: { id: { $in: ids } } });

  await Promise.all(filesToDelete.map(file => getService('upload').remove(file)));

  return filesToDelete;
};

module.exports = {
  getFolderPath,
  deleteByIds,
};
