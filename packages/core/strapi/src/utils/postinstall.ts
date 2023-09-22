import fetch from 'node-fetch';
import machineID from './machine-id';

/*
 * No need to worry about this file, we only retrieve anonymous data here.
 * It allows us to know on how many times the package has been installed globally.
 */

try {
  if (
    process.env.npm_config_global === 'true' ||
    JSON.parse(process.env.npm_config_argv as any).original.includes('global')
  ) {
    const event = 'didInstallStrapi';
    fetch('https://analytics.strapi.io/api/v2/track', {
      method: 'POST',
      body: JSON.stringify({
        event,
        deviceId: machineID(),
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Strapi-Event': event,
      },
    }).catch(() => {});
  }
} catch (e) {
  // ...
}
