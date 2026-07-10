/**
 * Consumer-side contract for the published @strapi/design-system bundle.
 * Mirrors design-system bundle-contract.config.json — update both when extending.
 *
 * @internal
 */
export const DESIGN_SYSTEM_BUNDLE_MUST_BE_EXTERNAL = [
  '@codemirror/state',
  '@codemirror/view',
  '@tanstack/react-virtual',
] as const;

export const DESIGN_SYSTEM_BUNDLE_MUST_NOT_CONTAIN = [
  'Unrecognized extension value in extension set',
] as const;

export const DESIGN_SYSTEM_BUNDLE_DIST_FILES = ['dist/index.mjs', 'dist/index.js'] as const;
