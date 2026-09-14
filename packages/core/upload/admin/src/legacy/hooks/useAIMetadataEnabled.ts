import { isFetchError } from '@strapi/admin/strapi-admin';

import { useAIMetadataAvailability } from './useAIMetadataAvailability';
import { useSettings } from './useSettings';

/**
 * Whether the Media Library will actually generate AI metadata: a provider is
 * registered (`useAIMetadataAvailability`) and the stored `aiMetadata` toggle
 * is on. The server ANDs the same two conditions in `aiMetadata.isEnabled()`.
 *
 * `status` is the settings query status, so the page can show its skeleton
 * while the answer is still unknown.
 */
export const useAIMetadataEnabled = () => {
  const { status, data, error } = useSettings();
  const isAvailable = useAIMetadataAvailability();

  // TODO: editors without `settings.read` get a 403 here (strapi/strapi#25131); once the fix lands there, also make sure editors get access to the AI features here.
  if (isFetchError(error) && error.status === 403) {
    return { status: 'success' as const, isEnabled: false };
  }

  return { status, isEnabled: isAvailable && data?.aiMetadata === true };
};
