'use strict';

const { AsyncLocalStorage } = require('async_hooks');

module.exports = new AsyncLocalStorage();
