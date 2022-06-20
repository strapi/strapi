'use strict';

const { ampli } = require('./ampli');
const createCoreTelemetryInstance = require('./create-telemetry-instance');

// Loads ampli sdk for the correct environment, checks if processing should be disabled or not
if (!ampli.amplitude) ampli.load({ environment: 'development' });

console.log(ampli);

const ampliBackendTelemetryMiddleware = async payload => {
  console.log(payload);

  switch (payload.extra.source) {
    case 'core':
      payload.extra.send(payload.event.event_type, payload.event.event_properties);
      break;
    case 'generators':
      await payload.extra.send({
        event: payload.event.event_type,
        scope: payload.extra.scope,
        error: payload.extra.error,
      });
      break;
  }
  // send(payload.event_type, payload.event_properties)
  // no 'next()' function is called here because we want to stop middleware from executing ampli after sending event to our tracker
};

ampli.client.addEventMiddleware(ampliBackendTelemetryMiddleware);

module.exports = {
  ampli,
  createCoreTelemetryInstance,
};
