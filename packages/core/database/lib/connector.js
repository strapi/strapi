'use strict';

const { UnknownConnector, InvalidConnector } = require('./errors');

/**
 * Loads the required connector
 * @param {Configuration} config
 */
function resolveConnector(config) {
  const connector = config.get('connector');

  try {
    require.resolve(connector);
  } catch (error) {
    throw new UnknownConnector();
  }

  try {
    const constructor = require(connector);

    return new constructor(config);
  } catch (error) {
    throw new InvalidConnector();
  }
}

module.exports = {
  resolveConnector,
};
