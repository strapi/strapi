'use strict';

const { mapAsync } = require('@strapi/utils');
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

// TODO: Make this non mutating?
const signFileUrls = async (file) => {
  const { provider } = strapi.plugins.upload;
  const { provider: providerConfig } = strapi.config.get('plugin.upload');

  // Check file provider and if provider is private
  if (file.provider !== providerConfig || !provider.isPrivate()) {
    return;
  }

  const signUrl = async (file) => {
    const signedUrl = await provider.getSignedUrl(file);
    file.url = signedUrl.url;
  };

  // Sign each file format
  await signUrl(file);
  if (file.formats) {
    await mapAsync(Object.values(file.formats), signUrl);
  }
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
const signEntityMedia = async (entity, uid) => {
  const model = strapi.getModel(uid);

  for (const [key, value] of Object.entries(entity)) {
    // eslint-disable-next-line no-continue
    if (!value) continue;

    const attribute = model.attributes[key];

    switch (attribute?.type) {
      case 'media':
        await signFileUrls(value);
        break;
      case 'component':
        if (attribute.repeatable) {
          await Promise.all(
            value.map((component) => signEntityMedia(component, attribute.component))
          );
        } else {
          await signEntityMedia(value, attribute.component);
        }
        break;
      case 'dynamiczone':
        await Promise.all(
          value.map((component) => signEntityMedia(component, component.__component))
        );
        break;
      default:
        break;
    }
  }

  return entity;
};

const addSignedFileUrlsToAdmin = () => {
  const { provider } = strapi.plugins.upload;

  // We only need to sign the file urls if the provider is private
  if (!provider.isPrivate()) {
    return;
  }

  // TOPICS:
  // What about the webhooks emitted by the entity manager?
  //   Do we want to sign the file urls in the event payload?
  // We need to do this for create/update/delete/publish/unpublish too no?
  strapi.container
    .get('services')
    .extend(`plugin::content-manager.entity-manager`, (entityManager) => {
      const findWithRelationCountsPage = async (opts, uid) => {
        const entities = await entityManager.findWithRelationCountsPage(opts, uid);
        await mapAsync(entities.results, async (entity) => signEntityMedia(entity, uid));
        return entities;
      };

      const findOneWithCreatorRolesAndCount = async (id, uid) => {
        // TODO: What if the entity is not found?
        const entity = await entityManager.findOneWithCreatorRolesAndCount(id, uid);
        await signEntityMedia(entity, uid);
        return entity;
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
