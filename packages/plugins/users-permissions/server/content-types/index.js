'use strict';

const permissionModel = require('../../models/Permission.settings');
const roleModel = require('../../models/Role.settings');
const userModel = require('../../models/User.settings');

module.exports = {
  [permissionModel.info.singularName]: { schema: permissionModel },
  [roleModel.info.singularName]: { schema: roleModel },
  [userModel.info.singularName]: { schema: userModel },
};
