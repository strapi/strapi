import type { Core } from '@strapi/types';

import { SPACE_ATTRIBUTE } from '../../shared/constants';
import { withoutSpace } from './document-service';

/**
 * What the plugin does when the feature is off.
 *
 * The `space` column is registered either way — schema sync removes columns it
 * is not told about, and dropping this one would lose every record of which
 * tenant owned what. But a project that is not using Spaces should not see it:
 * it sits on the row, so a plain read brings it along, and the Content Manager
 * hands `private` attributes to administrators rather than stripping them.
 *
 * So the column stays and the attribute is taken back off on the way out.
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.documents.use(async (context, next) => {
    const { uid } = context as unknown as { uid: string };

    if (!strapi.contentType(uid as never)?.attributes?.[SPACE_ATTRIBUTE]) {
      return next();
    }

    return withoutSpace(await next());
  });
};
