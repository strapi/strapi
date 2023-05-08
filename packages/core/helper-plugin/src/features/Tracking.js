import * as React from 'react';

import axios from 'axios';
import PropTypes from 'prop-types';

import { useAppInfo } from './AppInfo';

/**
 * @preserve
 * @typedef {Object} TelemetryProperties
 * @property {boolean} useTypescriptOnServer
 * @property {boolean} useTypescriptOnAdmin
 * @property {boolean} isHostedOnStrapiCloud
 * @property {number} numberOfAllContentTypes
 * @property {number} numberOfComponents
 * @property {number} numberOfDynamicZones
 */

/**
 * @preserve
 * @typedef {Object} TrackingContextValue
 * @property {string | boolean} uuid
 * @property {string | undefined} deviceId
 * @property {TelemetryProperties | undefined} telemetryProperties
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @type {React.Context<TrackingContextValue>}
 */
const TrackingContext = React.createContext({
  uuid: false,
  deviceId: undefined,
  telemetryProperties: undefined,
});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const TrackingProvider = ({ value, children }) => {
  const memoizedValue = React.useMemo(() => value, [value]);

  return <TrackingContext.Provider value={memoizedValue}>{children}</TrackingContext.Provider>;
};

TrackingProvider.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.shape({
    uuid: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    deviceId: PropTypes.string,
    telemetryProperties: PropTypes.object,
  }),
};

TrackingProvider.defaultProps = {
  value: {
    deviceId: undefined,
    uuid: false,
    telemetryProperties: undefined,
  },
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {(event: string, properties: Record<string, any>) => Promise<void>} TrackUsageFn
 */

/**
 * @preserve
 * @description Used to send amplitude events to the Strapi Tracking hub.
 *
 * @returns {{trackUsage: TrackUsageFn}}
 *
 * @example
 * ```tsx
 * import { useTracking } from '@strapi/helper-plugin';
 *
 * const MyComponent = () => {
 *  const { trackUsage } = useTracking();
 *
 *  const handleClick = () => {
 *   trackUsage('my-event', { myProperty: 'myValue' });
 *  }
 *
 *  return <button onClick={handleClick}>Send Event</button>
 * }
 * ```
 */
const useTracking = () => {
  const { uuid, telemetryProperties, deviceId } = React.useContext(TrackingContext);
  const appInfo = useAppInfo();
  const userId = appInfo?.userId;

  /**
   * @type {TrackUsageFn}
   */
  const trackUsage = React.useCallback(
    async (event, properties) => {
      try {
        if (uuid && !window.strapi.telemetryDisabled) {
          const res = await axios.post(
            'https://analytics.strapi.io/api/v2/track',
            {
              event,
              userId,
              deviceId,
              eventProperties: { ...properties },
              userProperties: {},
              groupProperties: {
                ...telemetryProperties,
                projectId: uuid,
                projectType: window.strapi.projectType,
              },
            },
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );

          return res;
        }
      } catch (err) {
        // Silence is golden
      }

      return null;
    },
    [deviceId, telemetryProperties, userId, uuid]
  );

  return { trackUsage };
};

export { TrackingProvider, useTracking, TrackingContext };
