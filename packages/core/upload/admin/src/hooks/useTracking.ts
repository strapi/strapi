import { useTracking as useStrapiTracking, TrackingEvent } from '@strapi/admin/strapi-admin';

import { useAIMetadataAvailability } from '../hooks/useAIMetadataAvailability';
import { useSettings } from '../hooks/useSettings';

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
    } as TEvent['properties']);
  };

  return { trackUsage };
};
