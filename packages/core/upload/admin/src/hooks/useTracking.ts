import { useTracking as useStrapiTracking, TrackingEvent } from '@strapi/admin/strapi-admin';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';

import { useSettings } from '../hooks/useSettings';

export const useTracking = () => {
  const { trackUsage: trackStrapiUsage } = useStrapiTracking();
  const { data } = useSettings();
  const isAiAvailable = useAIAvailability();

  const trackUsage = <TEvent extends TrackingEvent>(
    event: TEvent['name'],
    properties?: TEvent['properties']
  ) => {
    return trackStrapiUsage(event, {
      ...properties,
      ...(isAiAvailable ? { isAIMediaLibraryConfigured: Boolean(data?.aiMetadata) } : {}),
    } as TEvent['properties']);
  };

  return { trackUsage };
};
