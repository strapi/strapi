import type { Core } from '@strapi/types';

import type { StageTotalsEstimate } from '../../../../types';

/**
 * Count configuration rows the same scope as {@link createConfigurationStream} (core store + webhooks).
 */
export async function estimateConfigurationTotals(
  strapi: Core.Strapi
): Promise<StageTotalsEstimate> {
  let totalCount = 0;

  try {
    totalCount += await strapi.db.query('strapi::core-store').count();
  } catch {
    // Match configuration stream: skip if unavailable
  }

  try {
    totalCount += await strapi.db.query('strapi::webhook').count();
  } catch {
    // skip
  }

  return { totalCount };
}
