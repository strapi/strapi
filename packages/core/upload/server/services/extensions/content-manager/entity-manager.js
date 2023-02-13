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

  // TOPICS:
  // What about the webhooks emitted by the entity manager?
  //   Do we want to sign the file urls in the event payload?
  // We need to do this for create/update/delete/publish/unpublish too no?
  strapi.container
    .get('services')
    .extend('plugin::content-manager.entity-manager', (entityManager) => {
      /**
       * Map entity manager responses to sign private media URLs
       * @param {Object} entity
       * @param {string} uid
       * @returns
       */
      const mapEntity = async (entity, uid) => {
        await signEntityMedia(entity, uid);
        return entity;
      };

      return { ...entityManager, mapEntity };
    });
};

module.exports = {
  addSignedFileUrlsToAdmin,
};
