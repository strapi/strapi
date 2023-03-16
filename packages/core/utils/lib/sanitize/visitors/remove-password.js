'use strict';

module.exports = ({ data, key, attribute }) => {
  if (attribute?.type === 'password') {
    delete data[key];
  }
};
