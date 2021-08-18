'use strict';

const { omit } = require('lodash/fp');
const { transformArgs } = require('../builders/utils');

const buildComponentResolver = ({ contentTypeUID, attributeName, strapi }) => {
  return async (source, args = {}) => {
    const contentType = strapi.getModel(contentTypeUID);
    const transformedArgs = transformArgs(args, { contentType, usePagination: true });

    // Since we're using the entity-manager & not the entity-service to load the
    // association, we need to apply some transformation to the transformed args object
    const entityManagerArgs = {
      ...omit(['start', 'filters'], transformedArgs),
      where: transformedArgs.filters,
      offset: transformedArgs.start,
    };

    // todo[v4]: should we move the .load to the entity service so we can use the same args everywhere?
    return strapi.db.entityManager.load(contentTypeUID, source, attributeName, entityManagerArgs);
  };
};

module.exports = { buildComponentResolver };
