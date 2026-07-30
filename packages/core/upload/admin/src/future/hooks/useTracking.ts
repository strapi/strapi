import { useCallback } from 'react';

import { useTracking as useStrapiTracking, type TrackingEvent } from '@strapi/admin/strapi-admin';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';

import { useGetSettingsQuery } from '../services/settings';

/**
 * Media Library version tag stamped on every event fired from the new
 * (`src/future`) Media Library. Legacy events omit it, so analytics can filter
 * new usage from the old plan while both trees emit the SAME event names (see
 * CMS-246). Bump this if a future revamp ever needs its own bucket.
 */
export const MEDIA_LIBRARY_VERSION = 'v2';

/**
 * `location` value for every new Media Library event. The new tree is the
 * standalone Media Library page, which the legacy plan tags `'upload'` (as
 * opposed to `'content-manager'` for the asset-picker modal). Kept identical so
 * migrated events line up with the legacy ones on the `location` axis.
 */
export const MEDIA_LIBRARY_LOCATION = 'upload';

/**
 * Tracking wrapper scoped to the new Media Library. Mirrors the legacy
 * `admin/src/hooks/useTracking` — it forwards to the admin `trackUsage` and
 * injects `isAiMediaLibraryConfigured` when AI is available — and additionally
 * stamps `mediaLibraryVersion` on every event so the migrated plan stays
 * distinguishable from the legacy one.
 *
 * The cast mirrors the legacy wrapper: these two properties are cross-cutting
 * media-tracking metadata that the admin `TrackingEvent` type does not (and
 * should not) enumerate per event.
 */
export const useTracking = () => {
  const { trackUsage: trackStrapiUsage } = useStrapiTracking();
  const { data } = useGetSettingsQuery();
  const isAiAvailable = useAIAvailability();

  // Memoised so consumers can safely list `trackUsage` in effect deps (the
  // search-input debounce commit does) without re-firing every render.
  const trackUsage = useCallback(
    <TEvent extends TrackingEvent>(event: TEvent['name'], properties?: TEvent['properties']) => {
      return trackStrapiUsage(event, {
        ...properties,
        ...(isAiAvailable ? { isAiMediaLibraryConfigured: Boolean(data?.data?.aiMetadata) } : {}),
        mediaLibraryVersion: MEDIA_LIBRARY_VERSION,
      } as TEvent['properties']);
    },
    [trackStrapiUsage, isAiAvailable, data]
  );

  return { trackUsage };
};
