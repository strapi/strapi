const _ = require('lodash');
const path = require('path');
const { __IS_ADMIN__, __IS_MONOREPO__, __NPM_START_EVENT__, __PROD__, __PWD__ } = require('./globals');
const paths = require('./paths');

const URLs = {
  host: '/admin',
  backend: '/',
  publicPath: null,
  mode: 'host',
};

const configurationUrl = () => {
  if (__IS_ADMIN__ && !__IS_MONOREPO__) {
    // Load server configuration.
    const serverConfig = paths.serverJson;

    try {
      let server;
      const { templateConfiguration } = require(path.join(paths.pwd, 'node_modules', 'strapi-utils'));

      server = __PROD__ ? require(serverConfig) : templateConfiguration(require(serverConfig));
      
      if (__PWD__.indexOf('/admin') !== -1) {
        if (_.get(server, 'admin.build.host')) {
          URLs.host = _.get(server, 'admin.build.host', '/admin').replace(/\/$/, '') || '/';
        } else {
          URLs.host = _.get(server, 'admin.path', '/admin');
        }
        if (!__PROD__ && _.get(server, 'admin.build.plugins.source') === 'backend') {
          URLs.mode = 'backend';
        }

        if (!__PROD__ && __NPM_START_EVENT__) {
          URLs.backend = `http://${_.get(server, 'host', 'localhost')}:${_.get(server, 'port', 1337)}`;
        }
      }
    } catch (e) {
      throw new Error(`Impossible to access to ${serverConfig}`);
    }
  }

  return URLs;
};

module.exports = configurationUrl();
