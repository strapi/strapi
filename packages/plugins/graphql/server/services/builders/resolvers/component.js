'use strict';

const { sanitize, validate } = require('@strapi/utils');

module.exports = ({ strapi }) => ({
  buildComponentResolver({ contentTypeUID, attributeName }) {
    const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

    return async (parent, args = {}, ctx) => {
      const contentType = strapi.getModel(contentTypeUID);

      const { component: componentName } = contentType.attributes[attributeName];
      const component = strapi.getModel(componentName);

      const transformedArgs = transformArgs(args, { contentType: component, usePagination: true });
      await validate.contentAPI.query(transformedArgs, contentType, {
        auth: ctx?.state?.auth,
      });
      const sanitizedQuery = await sanitize.contentAPI.query(transformedArgs, contentType, {
        auth: ctx?.state?.auth,
      });
      return strapi.entityService.load(contentTypeUID, parent, attributeName, sanitizedQuery);
    };
  },
});
