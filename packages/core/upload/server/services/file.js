'use strict';

const folderModel = 'plugin::upload.folder';
const { getService } = require('../utils');

const fileModel = 'plugin::upload.file';

const getFolderPath = async folderId => {
  if (!folderId) return '/';

  const parentFolder = await strapi.entityService.findOne(folderModel, folderId);

  return parentFolder.path;
};

const deleteByIds = async (ids = []) => {
  const filesToDelete = await strapi.db.query(fileModel).findMany({ where: { id: { $in: ids } } });

  await Promise.all(filesToDelete.map(file => getService('upload').remove(file)));

  return filesToDelete;
};

module.exports = {
  getFolderPath,
  deleteByIds,
};
