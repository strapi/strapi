import { useCallback, useContext } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';

import { DataManagerContext } from './DataManagerContext';

import type { TrackingEvent } from '@strapi/admin/strapi-admin';

/**
 * Hook that provides tracking functionality with automatic CTB session ID inclusion
 * Use this hook instead of useTracking for all CTB-related tracking events
 *
 * Note: This hook must be used within a DataManagerProvider context.
 * If used outside the context, it will fall back to regular tracking without session ID.
 */
export const useCTBTracking = () => {
  const { trackUsage: originalTrackUsage } = useTracking();
  const context = useContext(DataManagerContext);
  const ctbSessionId = context?.ctbSessionId;

  const trackUsage = useCallback(
    <TEvent extends TrackingEvent>(event: TEvent['name'], properties?: TEvent['properties']) => {
      // Only include session ID if context is available
      if (ctbSessionId) {
        // Merge ctbSessionId into properties
        // Even if the event doesn't accept properties, we still include the session ID
        // using type assertion to bypass TypeScript strict checking
        const propertiesWithSessionId = properties
          ? { ...properties, ctbSessionId }
          : { ctbSessionId };

        // Use type assertion to bypass TypeScript strict checking
        // The session ID will be sent in eventProperties even for events that don't normally accept properties
        return originalTrackUsage(event, propertiesWithSessionId as any);
      }

      // Fall back to regular tracking if context is not available
      return originalTrackUsage(event, properties);
    },
    [originalTrackUsage, ctbSessionId]
  );

  return { trackUsage };
};
