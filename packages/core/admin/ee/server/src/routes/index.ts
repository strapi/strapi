import sso from './sso';
import licenseLimit from './license-limit';
import auditLogs from '../audit-logs/routes/audit-logs';

export default {
  sso,
  'license-limit': licenseLimit,
  'audit-logs': auditLogs,
};
