'use strict';

module.exports = ({ strapi }) => ({
  buildComponentResolver({ contentTypeUID, attributeName }) {
    const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

    return async (parent, args = {}) => {
      const contentType = strapi.contentTypes[contentTypeUID];
      const transformedArgs = transformArgs(args, { contentType, usePagination: true });

      return strapi.entityService.load(contentTypeUID, parent, attributeName, transformedArgs);
    };
  },
});
