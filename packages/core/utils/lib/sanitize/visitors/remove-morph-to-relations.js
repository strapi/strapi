'use strict';

const { isMorphToRelationalAttribute } = require('../../content-types');

module.exports = ({ key, attribute }, { remove }) => {
  if (isMorphToRelationalAttribute(attribute)) {
    remove(key);
  }
};
