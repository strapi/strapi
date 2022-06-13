'use strict';

const { ampli } = require('./ampli');
const createCoreTelemetryInstance = require('./create-telemetry-instance');
// const generatorsTelemetryInstance = require('./generators/index');

// Loads ampli sdk for the correct environment, checks if processing should be disabled or not
if (!ampli.amplitude) ampli.load({ environment: 'development' });

console.log(ampli);

const ampliBackendTelemetryMiddleware = payload => {
  console.log(payload);

  const track = {
    event: payload.event.event_type,
    scope: payload.extra.scope,
    error: payload.extra.error,
  };

  switch (payload.extra.source) {
    case 'core':
      payload.extra.send(payload.event.event_type, payload.event.event_properties);
      break;
    case 'generators':
      payload.extra.trackUsage({ ...track });
      break;
  }
  // send(payload.event_type, payload.event_properties)
  // no 'next()' function is called here because we want to stop middleware from executing ampli after sending event to our tracker
};

ampli.client.addEventMiddleware(ampliBackendTelemetryMiddleware);

module.exports = {
  ampli,
  createCoreTelemetryInstance,
  // generatorsTelemetryInstance,
};
