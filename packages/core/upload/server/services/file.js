'use strict';

const folderModel = 'plugin::upload.folder';

const getFolderPath = async folderId => {
  if (!folderId) return '/';

  const parentFolder = await strapi.entityService.findOne(folderModel, folderId);

  return parentFolder.path;
};

module.exports = {
  getFolderPath,
};
