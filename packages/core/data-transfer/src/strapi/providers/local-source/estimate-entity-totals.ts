import type { Core } from '@strapi/types';

import type { StageTotalsEstimate } from '../../../../types';

/**
 * Count entities the same scope as {@link createEntitiesStream} (all content types), for progress totals / ETA.
 */
export async function estimateEntityTotals(strapi: Core.Strapi): Promise<StageTotalsEstimate> {
  let totalCount = 0;

  for (const contentType of Object.values(strapi.contentTypes)) {
    try {
      totalCount += await strapi.db.query(contentType.uid).count();
    } catch {
      // Match createEntitiesStream: skip content types that fail to stream
    }
  }

  return { totalCount };
}
