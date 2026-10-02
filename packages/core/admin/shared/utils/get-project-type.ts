type ProjectType = 'Community' | 'Growth' | 'Enterprise';

/**
 * Resolves the plan label displayed across the admin panel, and reported in
 * the support debug dump, from the license information returned by the
 * `/admin/project-type` endpoint (browser) or `strapi.ee` (server).
 *
 * The label is intentionally limited to three values:
 * - `Community`  when there is no license (Community Edition).
 * - `Growth`     when the licensed plan price id contains "growth".
 * - `Enterprise` for any other licensed plan.
 */
const getProjectType = ({
  isEE,
  planPriceId,
}: {
  isEE: boolean;
  planPriceId?: string;
}): ProjectType => {
  if (!isEE) {
    return 'Community';
  }

  if (planPriceId?.toLowerCase().includes('growth')) {
    return 'Growth';
  }

  return 'Enterprise';
};

// The statuses a license can be in once it has been read. `none` (never licensed) is left out
// on purpose, and so is a missing status, which a mixed-version install can produce.
const LICENSED_STATUSES: readonly string[] = ['active', 'expired', 'unknown'];

/**
 * Resolves the plan a license was issued for, including one that has lapsed or can no longer
 * be read, so Support links, the Plan card and the debug dump can still name it. It unlocks
 * nothing: feature gating stays on `isEE`.
 *
 * A plan is only reported when a type was verified at some point (live, or retained once the
 * license lapsed) AND the status is licensed. A corrupt license file sets `unknown` before any
 * type is stored, and with no price id `getProjectType` would fall through to Enterprise, so
 * both conditions are required. Every caller that derives a plan should go through here.
 */
const getLicensedPlan = ({
  licenseStatus,
  type,
  planPriceId,
}: {
  licenseStatus: string | null | undefined;
  type: string | null | undefined;
  planPriceId?: string | null;
}): ProjectType =>
  getProjectType({
    isEE: Boolean(type) && LICENSED_STATUSES.includes(licenseStatus ?? ''),
    planPriceId: planPriceId ?? undefined,
  });

export { getLicensedPlan, getProjectType };
export type { ProjectType };
