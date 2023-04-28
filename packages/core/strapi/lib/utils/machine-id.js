'use strict';

const { machineIdSync } = require('node-machine-id');
const { randomUUID } = require('crypto');

module.exports = () => {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = randomUUID();
    return deviceId;
  }
};
