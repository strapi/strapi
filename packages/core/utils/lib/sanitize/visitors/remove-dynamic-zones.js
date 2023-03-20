'use strict';

const { isDynamicZoneAttribute } = require('../../content-types');

module.exports = ({ key, attribute }, { remove }) => {
  if (isDynamicZoneAttribute(attribute)) {
    remove(key);
  }
};
