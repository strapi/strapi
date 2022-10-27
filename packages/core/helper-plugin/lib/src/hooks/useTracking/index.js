import { useContext, useRef } from 'react';
import axios from 'axios';
import TrackingContext from '../../contexts/TrackingContext';
import useAppInfos from '../useAppInfos';

const useTracking = () => {
  const trackRef = useRef();
  const { uuid, telemetryProperties } = useContext(TrackingContext);
  const appInfo = useAppInfos();

  trackRef.current = async (event, properties) => {
    if (uuid && !window.strapi.telemetryDisabled) {
      try {
        await axios.post('https://analytics.strapi.io/track', {
          event,
          properties: {
            ...telemetryProperties,
            ...properties,
            projectType: window.strapi.projectType,
            environment: appInfo.currentEnvironment,
          },
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
