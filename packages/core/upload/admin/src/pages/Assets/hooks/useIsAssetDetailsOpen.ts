import { useQueryParams } from '@strapi/admin/strapi-admin';

/** Name of the parameter to look for in the URL to open the asset details drawer. */
export const ASSET_DETAILS_URL_PARAM = 'assetId';

/**
 * The asset id in the URL, or `null` when the param is absent or unparseable.
 *
 * One definition shared by the drawer (which needs the id) and the "is it open?"
 * hook below, so the two can never disagree about what counts as open.
 */
export const parseAssetDetailsId = (raw: string | undefined): number | null => {
  const parsed = raw ? parseInt(raw, 10) : NaN;

  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Whether the asset details drawer is open, derived purely from the URL — so it
 * turns false as soon as closing starts, while the drawer is still sliding out.
 */
export const useIsAssetDetailsOpen = (): boolean => {
  const [{ query }] = useQueryParams<{ [ASSET_DETAILS_URL_PARAM]?: string }>();

  return parseAssetDetailsId(query?.[ASSET_DETAILS_URL_PARAM]) !== null;
};
