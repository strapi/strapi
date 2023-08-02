'use strict';

const { randomUUID } = require('crypto');
const { machineIdSync } = require('node-machine-id');

module.exports = () => {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = randomUUID();
    return deviceId;
  }
};
