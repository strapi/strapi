'use strict';

const _ = require('lodash');

const fs = require('fs');
const path = require('path');

module.exports = ({ connection }) => {
  const client = _.get(connection, 'settings.client');

  const tmpl = fs.readFileSync(path.join(__dirname, 'database-templates', `${client}.template`));
  const compile = _.template(tmpl);

  const { settings, options } = connection;

  return compile({
    settings: {
      ...settings,
      srv: settings.srv || false,
      ssl: settings.ssl || false,
    },
    options: {
      ...options,
      ssl: settings.ssl || false,
      authenticationDatabase: settings.authenticationDatabase || null,
    },
  });
};
