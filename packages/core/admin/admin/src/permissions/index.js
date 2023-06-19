import customPermissions from 'ee_else_ce/permissions/customPermissions';
import merge from 'lodash/merge';

import defaultPermissions from './defaultPermissions';

const permissions = merge(defaultPermissions, customPermissions);

export default permissions;
