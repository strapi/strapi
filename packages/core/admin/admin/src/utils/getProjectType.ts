type ProjectType = 'Community' | 'Growth' | 'Enterprise';

/**
 * Resolves the plan label displayed across the admin panel from the license
 * information returned by the `/admin/project-type` endpoint.
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

export { getProjectType };
export type { ProjectType };
