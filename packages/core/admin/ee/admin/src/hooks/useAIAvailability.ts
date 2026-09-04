export const useAIAvailability = (): boolean => {
  // TODO the per-feature entitlement (cms-ai / cms-ai-byok) is resolved server-side and
  // collapsed into ai.enabled. The isEE guard stays because window.strapi.ai defaults to
  // { enabled: true } and is only corrected once /admin/project-type resolves.
  return window.strapi?.isEE === true && window.strapi.ai?.enabled === true;
};
