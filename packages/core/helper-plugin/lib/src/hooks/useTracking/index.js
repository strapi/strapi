import { useContext, useRef } from 'react';
import axios from 'axios';
import TrackingContext from '../../contexts/TrackingContext';
import useAppInfos from '../useAppInfos';

const useTracking = () => {
  const trackRef = useRef();
  const { uuid, telemetryProperties, deviceId } = useContext(TrackingContext);
  const appInfo = useAppInfos();
  const adminUserId = appInfo?.adminUserId;

  console.log(appInfo);

  trackRef.current = (event, properties) => {
    if (uuid) {
      try {
        axios.post('https://analytics.strapi.io/track', {
          event,
          adminUserId,
          deviceId,
          properties: {
            ...telemetryProperties,
            ...properties,
            projectType: strapi.projectType,
            environment: appInfo.currentEnvironment,
            projectId: uuid,
          },
        });
      } catch (err) {
        // Silent
      }
    }
  };

  return { trackUsage: trackRef.current };
};

export default useTracking;
