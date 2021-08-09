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

  return (parent, args = {}) => {
    const transformedArgs = transformArgs(args, {
      contentType: targetContentType,
      usePagination: true,
    });

    // todo[v4]: move the .load to the entity service?
    const hotFixedArgs = {
      ...omit(['start', 'filters'], transformedArgs),
      where: transformedArgs.filters,
      offset: transformedArgs.start,
    };

    // todo[v4]: Should we be able to run policies here too?
    return entityManager.load(contentTypeUID, parent, attributeName, hotFixedArgs);
  };
};

module.exports = { buildAssociationResolver };
