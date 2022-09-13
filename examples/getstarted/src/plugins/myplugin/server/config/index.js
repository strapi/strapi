'use strict';

module.exports = {
  default: {
    testConf: 1,
  },
  validator: (config) => {
    if (typeof config.testConf !== 'number') {
      throw new Error('testConfig has to be a number');
    }
  },
};
