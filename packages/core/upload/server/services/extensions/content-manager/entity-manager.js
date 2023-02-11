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
  // Test for every case in the Content manager so we don't miss any
  // Can we simplify the way to extend the content manager?
  // Documentation
  strapi.container
    .get('services')
    .extend(`plugin::content-manager.entity-manager`, (entityManager) => {
      const update = async (entity, body, uid) => {
        const updatedEntity = await entityManager.update(entity, body, uid);
        return signEntityMedia(updatedEntity, uid);
      };

      const publish = async (entity, body, uid) => {
        const publishedEntity = await entityManager.publish(entity, body, uid);
        return signEntityMedia(publishedEntity, uid);
      };

      const unpublish = async (entity, body, uid) => {
        const unpublishedEntity = await entityManager.unpublish(entity, body, uid);
        return signEntityMedia(unpublishedEntity, uid);
      };

      const findOneWithCreatorRolesAndCount = async (id, uid) => {
        // TODO: What if the entity is not found?
        const entity = await entityManager.findOneWithCreatorRolesAndCount(id, uid);
        return signEntityMedia(entity, uid);
      };

      const findWithRelationCountsPage = async (opts, uid) => {
        const entities = await entityManager.findWithRelationCountsPage(opts, uid);
        const results = await mapAsync(entities.results, async (entity) =>
          signEntityMedia(entity, uid)
        );

        return { ...entities, results };
      };

      return {
        ...entityManager,
        findOneWithCreatorRolesAndCount,
        findWithRelationCountsPage,
        update,
        publish,
        unpublish,
      };
    });
};

module.exports = {
  addSignedFileUrlsToAdmin,
};
