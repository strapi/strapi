'use strict';

module.exports = ({ key, attribute }, { remove }, next) => {
  if (attribute.type === 'password') {
    remove(key);
    return;
  }

  return next();
};
