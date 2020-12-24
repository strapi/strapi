import customPermissions from 'ee_else_ce/permissions/customPermissions';
import defaultPermissions from './defaultPermissions';

export default { ...defaultPermissions, ...customPermissions };
