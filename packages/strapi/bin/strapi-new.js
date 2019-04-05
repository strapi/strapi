#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const os = require('os');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const fetch = require('node-fetch');
const { machineIdSync } = require('node-machine-id');
const shell = require('shelljs');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

module.exports = function(name, cliArguments) {
  console.log('🚀 Starting to create your Strapi application.');

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
    debug: cliArguments.debug !== undefined,
    quick: cliArguments.quickstart !== undefined,
  };

  const dbArguments = [
    'dbclient',
    'dbhost',
    'dbport',
    'dbname',
    'dbusername',
    'dbpassword',
  ];
  const matchingDbArguments = _.intersection(_.keys(cliArguments), dbArguments);

  if (matchingDbArguments.length) {
    if (
      matchingDbArguments.length !== dbArguments.length &&
      cliArguments.dbclient !== 'sqlite'
    ) {
      console.log(
        `⛔️ Some database arguments are missing. Required arguments list: ${dbArguments}`
      );
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
        filename: cliArguments.dbfile,
      },
      options: {
        authenticationDatabase: cliArguments.dbauth,
        ssl: cliArguments.dbssl,
      },
    };
  }

  const error = error => {
    fetch('https://analytics.strapi.io/track', {
      method: 'POST',
      body: JSON.stringify({
        event: 'didNotStartAutomatically',
        deviceId: machineIdSync(),
        properties: {
          error,
          os: os.type(),
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  };

  // Return the scope and the response (`error` or `success`).
  return generate(scope, {
    // Log and exit the REPL in case there is an error
    // while we were trying to generate the new app.
    error: function returnError(err) {
      error(err);
      console.log(err);
      process.exit(1);
    },

    success: () => {
      if (scope.quick) {
        try {
          // Enter inside the project folder.
          // shell.cd(scope.rootPath);
          // Empty log.
          console.log();
          // Create interface for windows user to let them quit the program.
          if (process.platform === 'win32') {
            const rl = require('readline').createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            rl.on('SIGINT', function() {
              process.emit('SIGINT');
            });
          }
          // Listen Ctrl+C / SIGINT event to close the process.
          process.on('SIGINT', function() {
            process.exit();
          });

          shell.exec('strapi start', {
            stdio: 'inherit',
            env: {
              ...process.env,
              FORCE_COLOR: 1,
            },
          });
        } catch (e) {
          console.log(e);
          error(e);
        }
      }
    },
  });
};
