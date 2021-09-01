'use strict';

const { omit } = require('lodash/fp');

module.exports = ({ strapi }) => ({
  buildComponentResolver: ({ contentTypeUID, attributeName }) => {
    const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

    return async (parent, args = {}) => {
      const contentType = strapi.contentTypes[contentTypeUID];
      const transformedArgs = transformArgs(args, { contentType, usePagination: true });

      // Since we're using the entity-manager & not the entity-service to load the
      // association, we need to apply some transformation to the transformed args object
      const entityManagerArgs = {
        ...omit(['start', 'filters'], transformedArgs),
        where: transformedArgs.filters,
        offset: transformedArgs.start,
      };

      // todo[v4]: should we move the .load to the entity service so we can use the same args everywhere?
      return strapi.db.entityManager.load(contentTypeUID, parent, attributeName, entityManagerArgs);
    };
  },
});
