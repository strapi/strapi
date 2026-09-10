import { DEFAULT_SPACE_SLUG, useCurrentSpaceSlug } from './currentSpace';
import { getTranslation } from './getTranslation';

/**
 * The schema is global: content types are defined from the default workspace.
 * Elsewhere the Content-Type Builder stays browsable but read-only, through
 * the builder's `registerReadOnlyRule` seam; the server refuses the schema
 * writes outside default as the enforcement half.
 */
export const useWorkspaceReadOnlyRule = () => {
  const currentSlug = useCurrentSpaceSlug();

  return {
    readOnly: currentSlug !== DEFAULT_SPACE_SLUG,
    reason: {
      id: getTranslation('ctb.readOnly.reason'),
      defaultMessage:
        'Content types are managed from the Default workspace. Switch to it to edit the schema.',
    },
  };
};
