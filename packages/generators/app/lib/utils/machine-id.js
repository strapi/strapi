'use strict';

const { machineIdSync } = require('node-machine-id');
const { v4: uuidv4 } = require('uuid');

module.exports = () => {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = uuidv4();
    return deviceId;
  }
};
