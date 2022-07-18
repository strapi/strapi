import { useContext, useRef } from 'react';
import axios from 'axios';
import TrackingContext from '../../contexts/TrackingContext';

const useTracking = () => {
  const trackRef = useRef();
  const uuid = useContext(TrackingContext);

  trackRef.current = (event, properties) => {
    if (uuid) {
      try {
        axios.post('https://analytics.strapi.io/track', {
          event,
          properties: { ...properties, projectType: strapi.projectType, environment: process.env.NODE_ENV },
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
