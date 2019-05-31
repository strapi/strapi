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
const execa = require('execa');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Local Strapi dependencies.
const packageJSON = require('../../package.json');

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

const logError = error => {
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

module.exports = function(name, cliArguments) {
  console.log('🚀 Creating your Strapi application.\n');

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    generatorType: 'new',
    name,
    strapiPackageJSON: packageJSON,
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

  // Return the scope and the response (`error` or `success`).
  return generate(scope, {
    // Log and exit the REPL in case there is an error
    // while we were trying to generate the new app.
    error(err) {
      logError(err);
      console.log(err);
      process.exit(1);
    },

    success: async () => {
      if (scope.quick) {
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

        await execa('npm', ['run', 'develop'], {
          stdio: 'inherit',
          cwd: scope.rootPath,
          env: {
            FORCE_COLOR: 1,
          },
        });
      }
    },
  });
};
