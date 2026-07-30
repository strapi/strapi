/**
 * Content-type ↔ space visibility binding.
 *
 * A space-scoped CT can restrict which spaces it appears in via
 * `pluginOptions.spaces.visibleIn: string[]` (space slugs) in its schema.json.
 * Convention shared with the locale binding in `settings-visibility`:
 * an empty or missing array = visible in **every** space (platform-wide).
 */
const isCTVisibleInSpace = (model: unknown, spaceSlug: string): boolean => {
  const visibleIn = (model as { pluginOptions?: { spaces?: { visibleIn?: unknown } } })
    ?.pluginOptions?.spaces?.visibleIn;

  if (!Array.isArray(visibleIn) || visibleIn.length === 0) {
    return true;
  }

  return visibleIn.includes(spaceSlug);
};

const visibility = () => ({
  isCTVisibleInSpace,
});

type VisibilityService = typeof visibility;

export default visibility;
export { VisibilityService, isCTVisibleInSpace };
