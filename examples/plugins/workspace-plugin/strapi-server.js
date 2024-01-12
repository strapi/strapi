'use strict';

const config = require('./server/config');
const register = require('./server/register');
module.exports = () => {
  return {
    register,
    config,
  };
};
