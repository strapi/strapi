import { useGetUploadSettingsQuery } from '../services/settings';

import { useMediaLibraryPermissions } from './useMediaLibraryPermissions';

/**
 * Whether the server has an AI metadata provider registered, either the
 * Strapi-managed one or a custom one.
 */
export const useAIMetadataAvailability = (): boolean => {
  const { canRead } = useMediaLibraryPermissions();
  const { data } = useGetUploadSettingsQuery(undefined, { skip: !canRead });

  return data?.data?.aiMetadataAvailable === true;
};
