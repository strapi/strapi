'use strict';

const register = require('./register');
const bootstrap = require('./bootstrap');
const services = require('./services');
const config = require('./config');

module.exports = () => ({
  register,
  bootstrap,
  config,
  services,
});
