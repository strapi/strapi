'use strict';

class Dialect {
  useReturning() {
    return false;
  }
}

class PGDialect {
  useReturning() {
    return true;
  }
}

const getDialect = connection => {
  const { client } = connection.client.config;

  switch (client) {
    case 'postgres':
      return new PGDialect();
    default:
      return new Dialect();
  }
};

module.exports = {
  getDialect,
};
