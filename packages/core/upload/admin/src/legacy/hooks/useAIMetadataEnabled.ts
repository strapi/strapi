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
  const { status, data } = useSettings();
  const isAvailable = useAIMetadataAvailability();

  return { status, isEnabled: isAvailable && data?.aiMetadata === true };
};
