'use strict';

const { isPrivateAttribute } = require('../../content-types');

module.exports = ({ schema, key }, { remove }) => {
  const isPrivate = isPrivateAttribute(schema, key);

  if (isPrivate) {
    remove(key);
  }
};
