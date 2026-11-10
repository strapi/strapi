import authentication from './authentication';
import permission from './permission';
import role from './role';
import user from './user';
import admin from './admin';
import type { Controllers } from '../types/controllers';

// `audit-logs` is added by `getAdminEE()` when audit logs are enabled.
export default {
  authentication,
  permission,
  role,
  user,
  admin,
} satisfies Omit<Controllers, 'audit-logs'>;
