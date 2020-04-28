'use strict';
/**
 * Database connector registry
 */

const _ = require('lodash');
const requireConnector = require('./require-connector');

const createConnectorRegistry = ({ defaultConnection, connections }) => {
  const _connectors = new Map();

  return {
    /**
     * Load connector modules
     */
    load() {
      for (const connection of Object.values(connections)) {
        const { connector } = connection;
        if (!_connectors.has(connector)) {
          _connectors.set(connector, requireConnector(connector)(strapi));
        }
      }
    },

    /**
     * Initialize connectors
     */
    async initialize() {
      for (const connector of _connectors.values()) {
        await connector.initialize();
      }
    },

    get(key) {
      return _connectors.get(key);
    },

    set(key) {
      return _connectors.get(key);
    },

    get default() {
      const defaultConnector = connections[defaultConnection].connector;

      return _connectors.get(defaultConnector);
    },

    getByConnection(connection) {
      if (!_.has(connections, connection)) {
        throw new Error('Trying to access a connector for an unknow connection');
      }

      const connectorKey = connections[connection].connector;
      return _connectors.get(connectorKey);
    },
  };
};

module.exports = createConnectorRegistry;
