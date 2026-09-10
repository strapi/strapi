import { useGetSpaceLimitsQuery } from '../services/spaces';
import { DEFAULT_SPACE_SLUG, useCurrentSpaceSlug } from './currentSpace';

/**
 * The instance-level workspace cap, for the surfaces that create workspaces.
 * Only asked from the default workspace (the endpoint is default-only, and
 * sub-workspaces never see licence information).
 */
export const useSpaceLimits = () => {
  const isDefault = useCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;
  const { data } = useGetSpaceLimitsQuery(undefined, { skip: !isDefault });

  return {
    limits: isDefault ? data : undefined,
    isAtLimit: isDefault && data !== undefined && !data.canCreate,
  };
};
