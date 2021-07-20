'use strict';

const permission = require('../../models/Permission.settings');
const role = require('../../models/Role.settings');
const user = require('../../models/User.settings');

module.exports = [
  {
    schema: permission,
  },
  {
    schema: role,
  },
  {
    schema: user,
  },
];
