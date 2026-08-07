/**
 * Vite/esbuild rejects packages that appear in both optimizeDeps.include and
 * optimizeDeps.exclude ("cannot be marked as external"). Prefer include when both apply.
 *
 * @internal exported for tests
 */
export const omitExcludedOptimizeDepsPresentInInclude = (
  include: readonly string[],
  exclude: readonly string[]
): string[] => {
  const includeSet = new Set(include);

  return exclude.filter((name) => !includeSet.has(name));
};
