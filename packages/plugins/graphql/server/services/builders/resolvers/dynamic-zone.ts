import { StrapiCTX } from '../../../types/strapi-ctx';

interface BuildDynamicZoneArg {
  contentTypeUID: string;
  attributeName: string;
}
export default ({ strapi }: StrapiCTX) => ({
  buildDynamicZoneResolver({ contentTypeUID, attributeName }: BuildDynamicZoneArg) {
    return async (parent: any) => {
      return strapi.entityService.load(contentTypeUID, parent, attributeName);
    };
  },
});
