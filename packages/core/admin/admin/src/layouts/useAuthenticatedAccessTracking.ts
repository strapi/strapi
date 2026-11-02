import * as React from 'react';

import { useStrapiApp } from '../features/StrapiApp';
import { useTracking, useStrapiVersionReady } from '../features/Tracking';
import { useTelemetryPropertiesQuery } from '../services/admin';

/**
 * Sends `didAccessAuthenticatedAdministration` once per mount, after the Strapi
 * version is ready and the telemetry-properties query has settled.
 */
const useAuthenticatedAccessTracking = (projectId?: string | null) => {
  const { trackUsage } = useTracking();
  const isStrapiVersionReady = useStrapiVersionReady();
  const { isSuccess: hasTelemetryProperties, isError: didTelemetryPropertiesFail } =
    useTelemetryPropertiesQuery(undefined, {
      skip: !isStrapiVersionReady,
    });
  const getAllWidgets = useStrapiApp('TrackingProvider', (state) => state.widgets.getAll);
  const didTrackAccess = React.useRef(false);
  const hasTelemetryPropertiesSettled = hasTelemetryProperties || didTelemetryPropertiesFail;

  React.useEffect(() => {
    if (
      !projectId ||
      !isStrapiVersionReady ||
      !hasTelemetryPropertiesSettled ||
      didTrackAccess.current
    ) {
      return;
    }

    didTrackAccess.current = true;
    trackUsage('didAccessAuthenticatedAdministration', {
      registeredWidgets: getAllWidgets().map((widget) => widget.uid),
      projectId,
    });
  }, [projectId, isStrapiVersionReady, hasTelemetryPropertiesSettled, getAllWidgets, trackUsage]);
};

export { useAuthenticatedAccessTracking };
