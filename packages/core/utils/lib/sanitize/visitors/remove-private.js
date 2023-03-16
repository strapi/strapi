'use strict';

const { isPrivateAttribute } = require('../../content-types');

module.exports = ({ schema, data, key, attribute }) => {
  if (!attribute) {
    return;
  }

  const isPrivate = isPrivateAttribute(schema, key) || attribute.private === true;

  if (isPrivate) {
    delete data[key];
  }
};
