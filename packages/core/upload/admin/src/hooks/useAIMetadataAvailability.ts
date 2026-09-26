import { useGetUploadSettingsQuery } from '../services/settings';

/**
 * Whether the server has an AI metadata provider registered, either the
 * Strapi-managed one or a custom one.
 */
export const useAIMetadataAvailability = (): boolean => {
  const { data } = useGetUploadSettingsQuery();

  return data?.data?.aiMetadataAvailable === true;
};
