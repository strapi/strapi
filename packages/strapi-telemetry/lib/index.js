'use strict';
/**
 * Strapi telemetry package.
 * You can learn more at https://strapi.io/documentation/3.0.0-beta.x/global-strapi/usage-information.html#commitment-to-our-users-data-collection
 */

const fetch = require('node-fetch');
const os = require('os');

const sendEvent = async (event, payload) => {
  try {
    const res = await fetch('https://analytics.strapi.io/track', {
      method: 'POST',
      body: JSON.stringify({
        event,
        ...payload,
      }),
      timeout: 1000,
      headers: { 'Content-Type': 'application/json' },
    });

    return res.ok;
  } catch (err) {
    return false;
  }
};

const createTelemetryInstance = () => {
  return {
    middleware: ctx => {},
    track(event) {
      return sendEvent(event, {
        uuid: process.env.STRAPI_UUID,
        deviceId: process.env.DEVICE_ID,
        properties: {
          os: os.type(),
          os_platform: os.platform(),
          os_release: os.release(),
          node_version: process.version,
          version: process.env.STRAPI_VERSION,
          docker: process.env.DOCKER,
        },
      });
    },
  };
};

module.exports = createTelemetryInstance();
