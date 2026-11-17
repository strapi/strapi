import Permission from './Permission';
import User from './User';
import Role from './Role';
import apiToken from './api-token';
import apiTokenPermission from './api-token-permission';
import transferToken from './transfer-token';
import transferTokenPermission from './transfer-token-permission';
import session from './session';
import mfaChallenge from './mfa-challenge';
import mfaRecoveryCode from './mfa-recovery-code';
import mfaEvent from './mfa-event';
import mfaTrustedDevice from './mfa-trusted-device';
import mfaPasskey from './mfa-passkey';
import { auditLog } from '../../../ee/server/src/audit-logs/content-types/audit-log';

export default {
  permission: { schema: Permission },
  user: { schema: User },
  role: { schema: Role },
  'api-token': { schema: apiToken },
  'api-token-permission': { schema: apiTokenPermission },
  'transfer-token': { schema: transferToken },
  'transfer-token-permission': { schema: transferTokenPermission },
  session: { schema: session },
  'mfa-challenge': { schema: mfaChallenge },
  'mfa-recovery-code': { schema: mfaRecoveryCode },
  'mfa-event': { schema: mfaEvent },
  'mfa-trusted-device': { schema: mfaTrustedDevice },
  'mfa-passkey': { schema: mfaPasskey },
  // Registered in every edition, like content releases and review workflows, so audit log data
  // survives a license change
  'audit-log': auditLog,
};
