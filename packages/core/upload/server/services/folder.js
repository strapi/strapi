'use strict';

const uuid = require('uuid/v4');
const { trimChars, trimCharsEnd, trimCharsStart } = require('lodash/fp');

// TODO: to use once https://github.com/strapi/strapi/pull/12534 is merged
// const { joinBy } = require('@strapi/utils');

const folderModel = 'plugin::upload.folder';

const joinBy = (joint, ...args) => {
  const trim = trimChars(joint);
  const trimEnd = trimCharsEnd(joint);
  const trimStart = trimCharsStart(joint);

  return args.reduce((url, path, index) => {
    if (args.length === 1) return path;
    if (index === 0) return trimEnd(path);
    if (index === args.length - 1) return url + joint + trimStart(path);
    return url + joint + trim(path);
  }, '');
};

const generateUID = () => uuid();

const setPathAndUID = async folder => {
  let parentPath = '/';
  if (folder.parent) {
    const parentFolder = await strapi.entityService.findOne(folderModel, folder.parent);
    parentPath = parentFolder.path;
  }

  return Object.assign(folder, {
    uid: generateUID(),
    path: joinBy('/', parentPath, folder.name),
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
