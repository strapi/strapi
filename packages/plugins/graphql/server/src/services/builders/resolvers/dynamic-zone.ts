import type { UID } from '@strapi/types';

import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  buildDynamicZoneResolver({
    contentTypeUID,
    attributeName,
  }: {
    contentTypeUID: UID.ContentType;
    attributeName: string;
  }) {
    return async (parent: any) => {
      return strapi.entityService!.load(contentTypeUID, parent, attributeName);
    };
  },
});
