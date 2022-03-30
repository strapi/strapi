'use strict';

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

const getPath = async (folderId, fileName) => {
  if (!folderId) return joinBy('/', '/', fileName);

  const parentFolder = await strapi.entityService.findOne(folderModel, folderId);
  return joinBy('/', parentFolder.path, fileName);
};

module.exports = {
  getPath,
};
