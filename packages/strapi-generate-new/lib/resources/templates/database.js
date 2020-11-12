'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

module.exports = ({ connection, client }) => {
  const { settings, options } = connection;

  const tmpl = fs.readFileSync(path.join(__dirname, 'database-templates', `${client}.template`));
  const compile = _.template(tmpl);

  return compile({
    settings: {
      ...settings,
      srv: settings.srv || false,
      ssl: settings.ssl || false,
    },
    options: {
      ...options,
      ssl: options.ssl || false,
      authenticationDatabase: options.authenticationDatabase || null,
    },
  });
};
