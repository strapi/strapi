import { useContext, useRef } from 'react';
import axios from 'axios';
import TrackingContext from '../../contexts/TrackingContext';

const useTracking = () => {
  const trackRef = useRef();
  const { uuid, telemetryProperties } = useContext(TrackingContext);

  trackRef.current = (event, properties) => {
    if (uuid) {
      try {
        axios.post('https://analytics.strapi.io/track', {
          event,
          properties: { ...telemetryProperties, ...properties, projectType: strapi.projectType },
          uuid,
        });
      } catch (err) {
        // Silent
      }
    }
  };

  return { trackUsage: trackRef.current };
};

export default useTracking;
