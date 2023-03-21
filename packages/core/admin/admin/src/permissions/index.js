import merge from 'lodash/merge';
import customPermissions from 'ee_else_ce/permissions/customPermissions';
import defaultPermissions from './defaultPermissions';

const permissions = merge(defaultPermissions, customPermissions);

export default permissions;
