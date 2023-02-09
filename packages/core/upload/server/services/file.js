'use strict';

const { FOLDER_MODEL_UID, FILE_MODEL_UID } = require('../constants');

const { getService } = require('../utils');

const getFolderPath = async (folderId) => {
  if (!folderId) return '/';

  const parentFolder = await strapi.entityService.findOne(FOLDER_MODEL_UID, folderId);

  return parentFolder.path;
};

const deleteByIds = async (ids = []) => {
  const filesToDelete = await strapi.db
    .query(FILE_MODEL_UID)
    .findMany({ where: { id: { $in: ids } } });

  await Promise.all(filesToDelete.map((file) => getService('upload').remove(file)));

  return filesToDelete;
};

const signFileUrl = async (fileIdentifier) => {
  const { provider } = strapi.plugins.upload;

  const { url } = await provider.getSignedUrl(fileIdentifier);

  return url;
};

const signFileUrls = async (file) => {
  const { provider } = strapi.plugins.upload;

  // Check file provider and if provider is private
  if (file.provider === provider.name && provider.isPrivate()) {
    file.url = (await provider.getSignedUrl(file)).url;

    // Sign each file format
    if (file.formats) {
      // File formats is an object with keys as format name and values the file object defintion
      // We need to sign each file format
      file.formats = await Promise.all(
        Object.keys(file.formats).map(async (format) => {
          const formatFile = file.formats[format];
          const signedURL = await provider.getSignedUrl(formatFile);
          formatFile.url = signedURL.url;
          return formatFile;
        })
      );
    }
  }
  return file;
};

const addSignedFileUrlsToAdmin = () => {
  const { provider } = strapi.plugins.upload;

  // Only if provider is private, we need to sign the file urls
  if (provider.isPrivate()) {
    strapi.container
      .get('services')
      .extend(`plugin::content-manager.entity-manager`, (entityManager) => {
        const find = (opts, uid) => {
          return entityManager.find(opts, uid).then((results) => {
            return results;
          });
        };

        return {
          ...entityManager,
          find,
        };
      });
  }
};

module.exports = {
  getFolderPath,
  deleteByIds,
  signFileUrl,
  signFileUrls,
  addSignedFileUrlsToAdmin,
};
