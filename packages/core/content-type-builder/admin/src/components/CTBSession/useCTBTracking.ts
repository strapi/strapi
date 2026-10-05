import { useCallback } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';

import { useCTBSession } from './useCTBSession';

type TrackUsageWithDynamicEvent = (
  event: string,
  properties: Record<string, unknown>
) => ReturnType<ReturnType<typeof useTracking>['trackUsage']>;

/**
 * Hook that provides tracking functionality with automatic CTB session ID inclusion.
 * This version accepts arbitrary event names (string) to allow feature-specific
 * events that are not yet declared in the central tracking typings.
 *
 * Note: this intentionally relaxes TypeScript restrictions so callers can
 * emit new tracking event names without needing to update the upstream
 * tracking type definitions. The session ID is merged into the properties
 * object before forwarding to the original tracking implementation.
 */
export const useCTBTracking = () => {
  const { trackUsage: originalTrackUsage } = useTracking();
  const { sessionId } = useCTBSession();

  const trackUsage = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      const enhancedProperties = {
        ...properties,
        ctbSessionId: sessionId,
      };

      // The admin tracking API is typed for declared events, but CTB emits extension events too.
      const trackDynamicEvent = originalTrackUsage as unknown as TrackUsageWithDynamicEvent;

      return trackDynamicEvent(event, enhancedProperties);
    },
    [originalTrackUsage, sessionId]
  );

  return { trackUsage };
};
