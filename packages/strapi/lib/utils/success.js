#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fetch = require('node-fetch');

if (process.env.npm_config_global === 'true') {
  fetch('https://analytics.strapi.io/track', {
    method: 'POST',
    body: JSON.stringify({ event: 'didInstallStrapi' }),
    headers: { 'Content-Type': 'application/json' }
  })
    .catch(() => {});
}


