'use strict';

const getTestApps = () => {
  return process.env.TEST_APPS.split(',');
};

module.exports = { getTestApps };
