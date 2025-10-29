import { useTracking as useStrapiTracking, TrackingEvent } from '@strapi/admin/strapi-admin';

import { useSettings } from '../hooks/useSettings';

export const useTracking = () => {
  const { trackUsage: trackStrapiUsage } = useStrapiTracking();
  const { data } = useSettings();

  const trackUsage = <TEvent extends TrackingEvent>(
    event: TEvent['name'],
    properties?: TEvent['properties']
  ) => {
    return trackStrapiUsage(event, {
      ...properties,
      isAIMediaLibraryConfigured: data?.aiMetadata,
    } as TEvent['properties']);
  };

  return { trackUsage };
};
