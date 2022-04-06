'use strict';

const folderModel = 'plugin::upload.folder';

const getLocation = async folderId => {
  if (!folderId) return '/';

  const parentFolder = await strapi.entityService.findOne(folderModel, folderId);

  return parentFolder.location;
};

module.exports = {
  getLocation,
};
