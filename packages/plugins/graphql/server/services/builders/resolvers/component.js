'use strict';

module.exports = ({ strapi }) => ({
  buildComponentResolver({ contentTypeUID, attributeName }) {
    const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

    return async (parent, args = {}) => {
      const contentType = strapi.getModel(contentTypeUID);

      const { component: componentName } = contentType.attributes[attributeName];
      const component = strapi.getModel(componentName);

      const transformedArgs = transformArgs(args, { contentType: component, usePagination: true });

      return strapi.entityService.load(contentTypeUID, parent, attributeName, transformedArgs);
    };
  },
});
