import { policy } from '@strapi/utils';

// TODO: TS - Try to make { policy: { createPolicy } } from '@strapi/utils'; work
const { createPolicy } = policy;

/**
 * This policy is used for routes dealing with telemetry and analytics content.
 * It will fails when the telemetry has been disabled on the server.
 */
export default createPolicy({
  name: 'admin::isTelemetryEnabled',
  handler(_ctx, _config, { strapi }) {
    if (strapi.telemetry.isDisabled) {
      return false;
    }
  },
});
