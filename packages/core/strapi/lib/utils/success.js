'use strict';

/**
 * Module dependencies
 */

const { machineIdSync } = require('node-machine-id');
const { itly } = require('../itly');

/*
 * No need to worry about this file, we only retrieve anonymous data here.
 * It allows us to know on how many times the package has been installed globally.
 */

try {
  if (
    process.env.npm_config_global === 'true' ||
    JSON.parse(process.env.npm_config_argv).original.includes('global')
  ) {
    itly.didInstallStrapi('', {
      deviceId: machineIdSync(),
    });
  }
} catch (e) {
  //...
}
