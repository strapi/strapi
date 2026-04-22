import { useTracking as useStrapiTracking, TrackingEvent } from '@strapi/admin/strapi-admin';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';

import { useMediaLibraryPermissions } from './useMediaLibraryPermissions';
import { useSettings } from './useSettings';

export const useTracking = () => {
  const { trackUsage: trackStrapiUsage } = useStrapiTracking();
  const isAiAvailable = useAIAvailability();
  const { canSettings } = useMediaLibraryPermissions();
  const { data } = useSettings(isAiAvailable && canSettings);

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
