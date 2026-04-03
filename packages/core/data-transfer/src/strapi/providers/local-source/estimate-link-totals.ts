import type { Core } from '@strapi/types';

import type { StageTotalsEstimate } from '../../../../types';
import { createLinkQuery } from '../../queries/link';

/**
 * Count links the same scope as {@link createLinksStream} (content types + components, owner relations).
 */
export async function estimateLinkTotals(strapi: Core.Strapi): Promise<StageTotalsEstimate> {
  const query = createLinkQuery(strapi)();
  const uids = [...Object.keys(strapi.contentTypes), ...Object.keys(strapi.components)] as string[];

  let totalCount = 0;

  for (const uid of uids) {
    try {
      totalCount += await query.countAllForUid(uid);
    } catch {
      // Match createLinksStream: skip uids that fail
    }
  }

  return { totalCount };
}
