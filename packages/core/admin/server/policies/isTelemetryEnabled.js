'use strict';

const { createPolicy } = require('@strapi/utils').policy;

/**
 * This policy is used for routes dealing with telemetry and analytics content.
 * It will fails when the telemetry has been disabled on the server.
 */
module.exports = createPolicy({
  name: 'admin::isTelemetryEnabled',
  handler(_ctx, _config, { strapi }) {
    if (strapi.telemetry.isDisabled) {
      return false;
    }
  },
});
