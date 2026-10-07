import { useTracking as useStrapiTracking, TrackingEvent } from '@strapi/admin/strapi-admin';

import { getMediaLibraryVersion } from '../../utils/mediaLibraryVersion';

import { useAIMetadataAvailability } from './useAIMetadataAvailability';
import { useSettings } from './useSettings';

export const useTracking = () => {
  const { trackUsage: trackStrapiUsage } = useStrapiTracking();
  const { data } = useSettings();
  const isAiAvailable = useAIMetadataAvailability();

  const trackUsage = <TEvent extends TrackingEvent>(
    event: TEvent['name'],
    properties?: TEvent['properties']
  ) => {
    return trackStrapiUsage(event, {
      ...properties,
      ...(isAiAvailable ? { isAiMediaLibraryConfigured: Boolean(data?.aiMetadata) } : {}),
      mediaLibraryVersion: getMediaLibraryVersion(),
    } as TEvent['properties']);
  };

  return { trackUsage };
};
