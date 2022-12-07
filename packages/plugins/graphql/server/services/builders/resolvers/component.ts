import { StrapiCTX } from '../../../types/strapi-ctx';

interface BuildComponentResolverArg {
  contentTypeUID: string;
  attributeName: string;
}
export default ({ strapi }: StrapiCTX) => ({
  buildComponentResolver({ contentTypeUID, attributeName }: BuildComponentResolverArg) {
    const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

    return async (parent: any, args = {}) => {
      const contentType = strapi.getModel(contentTypeUID);

      const { component: componentName } = contentType.attributes[attributeName];
      const component = strapi.getModel(componentName);

      const transformedArgs = transformArgs(args, { contentType: component, usePagination: true });

      return strapi.entityService.load(contentTypeUID, parent, attributeName, transformedArgs);
    };
  },
});
