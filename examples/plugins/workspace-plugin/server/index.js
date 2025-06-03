'use strict';

const config = require('./config');
const register = require('./register');

module.exports = () => {
  return {
    register,
    config,
  };
};
