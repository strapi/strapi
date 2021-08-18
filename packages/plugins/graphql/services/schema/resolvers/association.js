'use strict';

const { omit } = require('lodash/fp');

const { transformArgs } = require('../builders/utils');
const { utils } = require('../../types');

const buildAssociationResolver = ({ contentTypeUID, attributeName, strapi }) => {
  const { entityManager } = strapi.db;

  const contentType = strapi.getModel(contentTypeUID);
  const attribute = contentType.attributes[attributeName];

  if (!attribute) {
    throw new Error(
      `Failed to build an association resolver for ${contentTypeUID}::${attributeName}`
    );
  }

  const isMedia = utils.isMedia(attribute);
  const isMorph = utils.isMorphRelation(attribute);

  const targetUID = isMedia ? 'plugins::upload.file' : attribute.target;
  const isToMany = isMedia ? attribute.multiple : attribute.relation.endsWith('Many');

  const targetContentType = strapi.getModel(targetUID);

  return async (source, args = {}) => {
    const transformedArgs = transformArgs(args, {
      contentType: targetContentType,
      usePagination: true,
    });

    // Since we're using the entity-manager & not the entity-service to load the
    // association, we need to apply some transformation to the transformed args object
    const entityManagerArgs = {
      ...omit(['start', 'filters'], transformedArgs),
      where: transformedArgs.filters,
      offset: transformedArgs.start,
    };

    // todo[v4]: should we move the .load to the entity service so we can use the same args everywhere?
    const data = await entityManager.load(contentTypeUID, source, attributeName, entityManagerArgs);

    // If this a polymorphic association, it returns the raw data
    if (isMorph) {
      return data;
    }

    // If this is a to-many relation, it returns an object that
    // matches what the entity-response-collection's resolvers expect
    else if (isToMany) {
      return { nodes: data, info: { args: transformedArgs, resourceUID: targetUID } };
    }

    // Else, it returns an object that matches
    // what the entity-response's resolvers expect
    return { value: data };
  };
};

module.exports = { buildAssociationResolver };
