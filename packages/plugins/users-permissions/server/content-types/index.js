'use strict';

const permission = require('./permission');
const role = require('./role');
const user = require('./user');

module.exports = {
  permission: { schema: permission },
  role: { schema: role },
  user: { schema: user },
};
