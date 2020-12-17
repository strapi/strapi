'use strict';

const database = ({ scope }) => ({
  type: 'input',
  name: 'database',
  message: 'Database name:',
  default: scope.name,
  validate: value => {
    if (value.includes('.')) {
      return `The database name can't contain a "."`;
    }

    return true;
  },
});

const host = () => ({
  type: 'input',
  name: 'host',
  message: 'Host:',
  default: '127.0.0.1',
});

const srv = () => ({
  type: 'boolean',
  name: 'srv',
  message: '+srv connection:',
  default: false,
});

const port = ({ client }) => ({
  type: 'input',
  name: 'port',
  message: `Port${client === 'mongo' ? ' (It will be ignored if you enable +srv)' : ''}:`,
  default: () => {
    const ports = {
      mongo: 27017,
      postgres: 5432,
      mysql: 3306,
    };

    return ports[client];
  },
});

const username = () => ({
  type: 'input',
  name: 'username',
  message: 'Username:',
});

const password = () => ({
  type: 'password',
  name: 'password',
  message: 'Password:',
  mask: '*',
});

const authenticationDatabase = () => ({
  type: 'input',
  name: 'authenticationDatabase',
  message: 'Authentication database (Maybe "admin" or blank):',
});

const ssl = () => ({
  type: 'confirm',
  name: 'ssl',
  message: 'Enable SSL connection:',
  default: false,
});

const filename = () => ({
  type: 'input',
  name: 'filename',
  message: 'Filename:',
  default: '.tmp/data.db',
});

module.exports = {
  sqlite: [filename],
  postgres: [database, host, port, username, password, ssl],
  mysql: [database, host, port, username, password, ssl],
  mongo: [database, host, srv, port, username, password, authenticationDatabase, ssl],
};
