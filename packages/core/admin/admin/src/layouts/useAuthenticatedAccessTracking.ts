import * as React from 'react';

import { useStrapiApp } from '../features/StrapiApp';
import { useTracking } from '../features/Tracking';

/**
 * Sends `didAccessAuthenticatedAdministration` once per mount, and only after
 * the Strapi version is ready to be attached. `trackUsage` changes identity
 * when that version arrives; depending on it alone sends the event twice.
 */
const useAuthenticatedAccessTracking = (projectId?: string | null) => {
  const { trackUsage, isStrapiVersionReady } = useTracking();
  const getAllWidgets = useStrapiApp('TrackingProvider', (state) => state.widgets.getAll);
  const didTrackAccess = React.useRef(false);

  React.useEffect(() => {
    if (!projectId || !isStrapiVersionReady || didTrackAccess.current) {
      return;
    }

    didTrackAccess.current = true;
    trackUsage('didAccessAuthenticatedAdministration', {
      registeredWidgets: getAllWidgets().map((widget) => widget.uid),
      projectId,
    });
  }, [projectId, isStrapiVersionReady, getAllWidgets, trackUsage]);
};

export { useAuthenticatedAccessTracking };
