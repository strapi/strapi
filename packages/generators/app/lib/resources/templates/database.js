'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const createDatabaseConfig = ({ useTypescript }) => {
  const language = useTypescript ? 'ts' : 'js';
  const tmpl = fs.readFileSync(
    path.join(__dirname, 'database-templates', language, `database.template`)
  );
  const compile = _.template(tmpl);

  return compile();
};

const generateDbEnvariables = ({ connection, client }) => {
  const tmpl = fs.readFileSync(path.join(__dirname, 'database-templates', `${client}.template`));
  const compile = _.template(tmpl);

  return compile({
    client,
    connection: {
      ...connection.connection,
      ssl: connection.connection.ssl || false,
    },
  });
};

module.exports = { createDatabaseConfig, generateDbEnvariables };
