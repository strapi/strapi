'use strict';

module.exports = ({ key, attribute }, { remove }) => {
  if (attribute.type === 'password') {
    remove(key);
  }
};
