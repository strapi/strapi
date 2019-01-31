#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

module.exports = function (name, cliArguments) {
  console.log('🚀 Start creating your Strapi application. It might take a minute, please take a coffee ☕️');

  const developerMode = cliArguments.dev !== undefined;

  if (developerMode) {
    console.log('🦄 Dev mode is activated!');
  }

  console.log();

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    generatorType: 'new',
    name,
    strapiPackageJSON: packageJSON,
    developerMode,
    debug: cliArguments.debug !== undefined
  };

  const dbArguments = ['dbclient', 'dbhost', 'dbport', 'dbname', 'dbusername', 'dbpassword'];
  const matchingDbArguments = _.intersection(_.keys(cliArguments), dbArguments);

  if (matchingDbArguments.length) {
    if (matchingDbArguments.length !== dbArguments.length && cliArguments.dbclient !== 'sqlite') {
      console.log(`⛔️ Some database arguments are missing. Required arguments list: ${dbArguments}`);
      return process.exit(1);
    }

    scope.dbforce = cliArguments.dbforce !== undefined;

    scope.database = {
      settings: {
        client: cliArguments.dbclient,
        host: cliArguments.dbhost,
        srv: cliArguments.dbsrv,
        port: cliArguments.dbport,
        database: cliArguments.dbname,
        username: cliArguments.dbusername,
        password: cliArguments.dbpassword,
        filename: cliArguments.dbfile
      },
      options: {
        authenticationDatabase: cliArguments.dbauth,
        ssl: cliArguments.dbssl
      }
    };
  }

  // Return the scope and the response (`error` or `success`).
  return generate(scope, {

    // Log and exit the REPL in case there is an error
    // while we were trying to generate the new app.
    error: function returnError(err) {
      console.log(err);
      process.exit(1);
    }
  });
};
