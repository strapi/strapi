'use strict';

const { isPrivateAttribute } = require('../../content-types');

module.exports = ({ schema, key }, { remove }, next) => {
  const isPrivate = isPrivateAttribute(schema, key);

  if (isPrivate) {
    remove(key);
    return;
  }

  return next();
};
