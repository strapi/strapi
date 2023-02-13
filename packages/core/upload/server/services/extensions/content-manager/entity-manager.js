'use strict';

const { mapAsync } = require('@strapi/utils');
const { getService } = require('../../../utils');

const getSignedAttribute = (attributeName, entity, model) => {
  const { signFileUrls } = getService('file');

  if (!entity) return entity;

  const attribute = model.attributes[attributeName];

  switch (attribute?.type) {
    case 'media':
      if (attribute.multiple) {
        return mapAsync(entity, signFileUrls);
      }
      return signFileUrls(entity);
    case 'component':
      if (attribute.repeatable) {
        return mapAsync(entity, (component) => signEntityMedia(component, attribute.component));
      }
      return signEntityMedia(entity, attribute.component);
    case 'dynamiczone':
      return mapAsync(entity, (component) => signEntityMedia(component, component.__component));
    default:
      return entity;
  }
};

/**
 *
 * Iterate through an entity manager result
 * Check which modelAttributes are media and pre sign the image URLs
 * if they are from the current upload provider
 *
 * TODO: Create a strapi-utils function to iterate through an entity
 * and apply a function on each attribute type
 *
 * @param {Object} entity
 * @param {Object} modelAttributes
 * @returns
 */
const signEntityMedia = async (entity, uid) => {
  const model = strapi.getModel(uid);

  const signedEntity = {};

  // TODO: Use asyncReduce
  for (const attributeName of Object.keys(entity)) {
    signedEntity[attributeName] = await getSignedAttribute(
      attributeName,
      entity[attributeName],
      model
    );
  }

  return signedEntity;
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
  // Documentation
  strapi.container
    .get('services')
    .extend('plugin::content-manager.entity-manager', (entityManager) => {
      /**
       * Map entity manager responses to sign private media URLs
       * @param {Object} entity
       * @param {string} uid
       * @returns
       */
      const mapEntity = (entity, uid) => signEntityMedia(entity, uid);

      return { ...entityManager, mapEntity };
    });
};

module.exports = {
  addSignedFileUrlsToAdmin,
};
