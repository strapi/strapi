#!/usr/bin/env node --harmony

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

// Public node modules.
const _ = require('lodash');
const winston = require('winston');

// Logger.
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: 'level'
    })
  ]
});

/**
 * `$ strapi update`
 *
 * Pull latest update from custom generators
 * readed from the RC file at $HOME.
 */

module.exports = function () {
  const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

  fs.access(path.resolve(HOME, '.strapirc'), fs.F_OK | fs.R_OK | fs.W_OK, function (err) {
    if (err) {
      if (err.code === 'ENOENT') {
        logger.error('No `.strapirc` file detected at `' + HOME + '`');
        logger.error('Execute `$ strapi config` to create one');
      } else if (err.code === 'EACCES') {
        logger.error('Impossible to access the `.strapirc` file at `' + HOME + '`');
        logger.error('Please check read/write permissions before execute `$ strapi update`');
      }
      process.exit(1);
    } else {
      const config = JSON.parse(fs.readFileSync(path.resolve(HOME, '.strapirc')));
      _.forEach(config.repositories, function (info, name) {
        try {
          process.chdir(path.resolve(__dirname, '..', 'node_modules', name));
          logger.debug('Pulling the latest updates of `' + name + '`');
          exec('git pull ' + info.remote + ' ' + info.branch, function (err) {
            if (err) {
              logger.error('Impossible to update `' + name + '`');
            } else {
              logger.info('Successfully updated `' + name + '`');
            }
          });
        } catch (err) {
          process.chdir(path.resolve(__dirname, '..', 'node_modules'));
          logger.debug('Cloning the `' + name + '` repository for the first time...');
          exec('git clone ' + info.repository + ' ' + name, function (err) {
            if (err) {
              logger.error('Impossible to clone the `' + name + '` repository');
              console.log(err);
            } else {
              logger.info('Successfully cloned the `' + name + '` repository');
              process.chdir(path.resolve(__dirname, '..', 'node_modules', name));
              logger.debug('Installing dependencies for `' + name + '`...');
              exec('npm install', function (err) {
                if (err) {
                  logger.error('Impossible to install dependencies for `' + name + '`');
                  console.log(err);
                } else {
                  logger.info('Successfully installed dependencies for `' + name + '`');
                }
              });
            }
          });
        }
      });
    }
  });
};
