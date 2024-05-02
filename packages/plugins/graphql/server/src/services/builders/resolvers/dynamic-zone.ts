import type { CacheHint } from 'apollo-server-types';
import type { UID } from '@strapi/types';

import type { Context } from '../../types';
import { FieldResolver } from 'nexus';

export default ({ strapi }: Context) => ({
  buildDynamicZoneResolver({
    contentTypeUID,
    attributeName,
    cacheHint,
  }: {
    contentTypeUID: UID.ContentType;
    attributeName: string;
    cacheHint: CacheHint;
  }): FieldResolver<string, string> {
    return async (parent, _args, _context, info) => {
      info.cacheControl.setCacheHint(cacheHint);
      return strapi.entityService!.load(contentTypeUID, parent, attributeName);
    };
  },
});
