import { useContext, useRef } from 'react';
import axios from 'axios';
import TrackingContext from '../../contexts/TrackingContext';

const useTracking = () => {
  const trackRef = useRef();
  const { uuid, telemetryDisabled } = useContext(TrackingContext);

  trackRef.current = (event, properties) => {
    if (telemetryDisabled || !uuid) {
      return;
    }

    try {
      axios.post('https://analytics.strapi.io/track', {
        event,
        properties: { ...properties, projectType: strapi.projectType },
        uuid,
      });
    } catch (err) {
      // Silent
    }
  };

  return { trackUsage: trackRef.current };
};

export default useTracking;
