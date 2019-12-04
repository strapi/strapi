'use strict';

const { parseType } = require('strapi-utils');

const createParser = () => (type, value) => {
  if (value === null) return null;

  switch (type) {
    case 'json':
      return JSON.stringify(value);
    default:
      return parseType({ type, value });
  }
};

module.exports = { createParser };
