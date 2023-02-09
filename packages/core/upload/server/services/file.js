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
  const { provider: providerConfig } = strapi.config.get('plugin.upload');

  // Check file provider and if provider is private
  if (file.provider === providerConfig && provider.isPrivate()) {
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

/**
 *
 * Iterate through an entity manager result
 * Check which modelAttributes are media and pre sign the image URLs
 * if they are from the current upload provider
 * @param {Object} entity
 * @param {Object} modelAttributes
 * @param {String} providerConfig
 * @returns
 */
const signEntityMedia = async (entity, modelAttributes, providerConfig) => {
  if (!modelAttributes) {
    return entity;
  }

  for (const [key, value] of Object.entries(entity)) {
    if (!value) continue;

    const isMedia = modelAttributes[key]?.type === 'media';
    if (!isMedia || value.provider !== providerConfig) continue;

    await signFileUrls(value);
  }

  return entity;
};

const addSignedFileUrlsToAdmin = () => {
  const { provider } = strapi.plugins.upload;
  const { provider: providerConfig } = strapi.config.get('plugin.upload');

  // We only need to sign the file urls if the provider is private
  if (!provider.isPrivate()) {
    return;
  }

  strapi.container
    .get('services')
    .extend(`plugin::content-manager.entity-manager`, (entityManager) => {
      const findWithRelationCountsPage = async (opts, uid) => {
        const entityManagerResults = await entityManager.findWithRelationCountsPage(opts, uid);
        const attributes = strapi.getModel(uid)?.attributes;

        await Promise.all(
          entityManagerResults.results.map(async (entity) =>
            signEntityMedia(entity, attributes, providerConfig)
          )
        );

        return entityManagerResults;
      };

      const findOneWithCreatorRolesAndCount = async (id, uid) => {
        const entityManagerResult = await entityManager.findOneWithCreatorRolesAndCount(id, uid);

        await signEntityMedia(
          entityManagerResult,
          strapi.getModel(uid)?.attributes,
          providerConfig
        );

        return entityManagerResult;
      };

      return {
        ...entityManager,
        findOneWithCreatorRolesAndCount,
        findWithRelationCountsPage,
      };
    });
};

module.exports = {
  getFolderPath,
  deleteByIds,
  signFileUrl,
  signFileUrls,
  addSignedFileUrlsToAdmin,
};
