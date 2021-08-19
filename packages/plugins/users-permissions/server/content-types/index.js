'use strict';

const permission = require('./permission');
const role = require('./role');
const user = require('./user');

module.exports = {
  [permission.schema.info.singularName]: permission,
  [role.schema.info.singularName]: role,
  [user.schema.info.singularName]: user,
};
