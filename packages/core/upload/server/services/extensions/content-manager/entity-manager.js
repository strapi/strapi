'use strict';

const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../../utils');

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
  const { signFileUrls } = getService('file');

  for (const [key, value] of Object.entries(entity)) {
    // eslint-disable-next-line no-continue
    if (!value) continue;

    const attribute = model.attributes[key];

    switch (attribute?.type) {
      case 'media':
        if (attribute.multiple) {
          await mapAsync(value, signFileUrls);
        } else {
          await signFileUrls(value);
        }
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

/**
 * Sign media urls from entity manager results
 * @param {Array|Object} result from the entity manager
 * @param {string} uid of the model
 */
const fileSigningExtension = async (result, uid) => {
  if (Array.isArray(result?.results)) {
    await mapAsync(result.results, async (entity) => signEntityMedia(entity, uid));
  } else {
    await signEntityMedia(result, uid);
  }
};

const addSignedFileUrlsToAdmin = () => {
  const { provider } = strapi.plugins.upload;

  // We only need to sign the file urls if the provider is private
  if (!provider.isPrivate()) {
    return;
  }

  // TODO:
  // Test for private providers
  // Make an impact analysis of this feature
  //  - What about the webhooks emitted by the entity manager?
  //  - Do we want to sign the file urls in the event payload?
  // Test for every case in the Content manager so we don't miss any
  // Make entity file signing non mutating
  // Move this extend into a folder called /extensions
  // Can we simplify the way to extend the content manager?

  // TOPICS:
  // What about the webhooks emitted by the entity manager?
  //   Do we want to sign the file urls in the event payload?
  // We need to do this for create/update/delete/publish/unpublish too no?
  strapi.container
    .get('services')
    .extend('plugin::content-manager.entity-manager', (entityManager) => {
      const functionsToExtend = [
        'update',
        'publish',
        'unpublish',
        'findOneWithCreatorRolesAndCount',
        'findWithRelationCountsPage',
      ];

      const extendedFunctions = {};
      functionsToExtend.reduce((acc, functionName) => {
        acc[functionName] = async (...args) => {
          const result = await entityManager[functionName](...args);
          await fileSigningExtension(result, args.at(-1));

          return result;
        };

        return acc;
      }, extendedFunctions);

      return { ...entityManager, ...extendedFunctions };
    });
};

module.exports = {
  addSignedFileUrlsToAdmin,
};
