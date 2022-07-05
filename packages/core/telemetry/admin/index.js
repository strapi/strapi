import { ampli } from './src/ampli/index.js'; // eslint-disable-line

// Loads ampli sdk for the correct environment, checks if processing should be disabled or not
if (!ampli.amplitude) ampli.load({ environment: 'production' });

const ampliAdminTelemetryMiddleware = async payload => {
  try {
    fetch('http://localhost:3300/track', {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.log(err);
  }
  // send(payload.event_type, payload.event_properties)
  // no 'next()' function is called here because we want to stop middleware from executing ampli after sending event to our tracker
};

ampli.addEventMiddleware(ampliAdminTelemetryMiddleware);

export default ampli;
