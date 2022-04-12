'use strict';

const uuid = require('uuid/v4');
const { joinBy } = require('@strapi/utils');

const folderModel = 'plugin::upload.folder';

const generateUID = () => uuid();

const setPathAndUID = async folder => {
  const uid = generateUID();
  let parentPath = '/';
  if (folder.parent) {
    const parentFolder = await strapi.entityService.findOne(folderModel, folder.parent);
    parentPath = parentFolder.path;
  }

  return Object.assign(folder, {
    uid,
    path: joinBy('/', parentPath, uid),
  });
};

const deleteByIds = async ids => {
  const deletedFolders = [];
  for (const id of ids) {
    const deletedFolder = await strapi.entityService.delete(folderModel, id);

    deletedFolders.push(deletedFolder);
  }

  return deletedFolders;
};

/**
 * Check if a folder exists in database
 * @param params query params to find the folder
 * @returns {Promise<boolean>}
 */
const exists = async (params = {}) => {
  const count = await strapi.query(folderModel).count({ where: params });
  return count > 0;
};

module.exports = {
  exists,
  deleteByIds,
  setPathAndUID,
};
