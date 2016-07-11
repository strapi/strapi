'use strict';

/**
 * Use `server.js` to run your application without `$ strapi start`.
 * To start the server, run: `$ npm start`.
 *
 * This is handy in situations where the Strapi CLI is not relevant or useful.
 */

process.chdir(__dirname);

(() => {
  const strapi = require('strapi');
  strapi.start();
})();
