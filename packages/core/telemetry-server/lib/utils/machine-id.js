'use strict';

const { machineIdSync } = require('node-machine-id');
const uuid = require('uuid');

module.exports = () => {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = uuid();
    return deviceId;
  }
};
