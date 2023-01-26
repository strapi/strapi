'use strict';

const { pick, mapKeys } = require('lodash/fp');

const getService = (name) => {
  return strapi.service(`admin::${name}`);
};

function mapObject(obj, mapper) {
  const picked = pick(obj, mapper.pick);
  return mapKeys(picked, (value, key) => mapper.rename[key] || key);
}

module.exports = {
  getService,
  mapObject,
};
