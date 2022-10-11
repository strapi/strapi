'use strict';

const myRoute = require('./my-route');

module.exports = {
  type: 'admin',
  routes: [...myRoute],
};
