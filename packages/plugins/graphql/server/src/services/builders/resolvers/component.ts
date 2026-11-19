import type { Internal, Schema, Struct } from '@strapi/types';

import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  buildComponentResolver({
    contentTypeUID,
    attributeName,
  }: {
    contentTypeUID: Internal.UID.ContentType;
    attributeName: string;
  }) {
    const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

    return async (parent: any, args: any, ctx: any) => {
      const contentType = strapi.getModel(contentTypeUID);

      const { component: componentName } = contentType.attributes[
        attributeName
      ] as Schema.Attribute.Component;

      const component = strapi.getModel(componentName);

      // `transformArgs` keeps its published content type parameter; components share the shape.
      const transformedArgs = transformArgs(args, {
        contentType: component as unknown as Struct.ContentTypeSchema,
        usePagination: true,
      });
      await strapi.contentAPI.validate.query(transformedArgs, component, {
        auth: ctx?.state?.auth,
      });

      const sanitizedQuery = await strapi.contentAPI.sanitize.query(transformedArgs, component, {
        auth: ctx?.state?.auth,
      });

      const dbQuery = strapi.get('query-params').transform(component.uid, sanitizedQuery);

      return strapi.db?.query(contentTypeUID).load(parent, attributeName, dbQuery);
    };
  },
});
