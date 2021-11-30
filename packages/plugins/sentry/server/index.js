'use strict';

const bootstrap = require('./bootstrap');
const services = require('./services');
const config = require('./config');

module.exports = () => ({
  bootstrap,
  config,
  services,
});
