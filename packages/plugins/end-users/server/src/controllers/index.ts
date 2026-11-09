import auth from './auth';
import condition from './admin/condition';
import connect from './connect';
import me from './me';
import migration from './admin/migration';
import permissionLayout from './admin/permission-layout';
import permissions from './permissions';
import profile from './profile';
import provider from './admin/provider';
import role from './admin/role';
import settings from './admin/settings';
import user from './user';
import userSecurity from './admin/user-security';

export default {
  auth,
  condition,
  connect,
  me,
  migration,
  'permission-layout': permissionLayout,
  permissions,
  profile,
  provider,
  role,
  settings,
  user,
  'user-security': userSecurity,
};
