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

  // todo[v4]: make sure polymorphic relations aren't breaking here
  const targetUID = utils.isMedia(attribute) ? 'plugins::upload.file' : attribute.target;
  const targetContentType = strapi.getModel(targetUID);

  return async (parent, args = {}) => {
    const transformedArgs = transformArgs(args, {
      contentType: targetContentType,
      usePagination: true,
    });

    // todo[v4]: move the .load to the entity service?
    const entityManagerArgs = {
      ...omit(['start', 'filters'], transformedArgs),
      where: transformedArgs.filters,
      offset: transformedArgs.start,
    };

    const data = await entityManager.load(contentTypeUID, parent, attributeName, entityManagerArgs);

    // todo[v4]: Replace with a check on the attribute (handle case where data is null but for an array
    if (Array.isArray(data)) {
      return { nodes: data, info: { args: transformedArgs, resourceUID: targetUID } };
    }

    return { value: data };
  };
};

module.exports = { buildAssociationResolver };
