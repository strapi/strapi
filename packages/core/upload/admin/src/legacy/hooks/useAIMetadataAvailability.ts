import { useSettings } from './useSettings';

/**
 * Whether the server has an AI metadata provider registered, either the
 * Strapi-managed one or a custom one.
 */
export const useAIMetadataAvailability = (): boolean => {
  const { data } = useSettings();

  return data?.aiMetadataAvailable === true;
};
