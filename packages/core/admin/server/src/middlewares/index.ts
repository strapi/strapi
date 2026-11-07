import rateLimit from './rateLimit';
import mfaRateLimit from './mfa-rate-limit';
import dataTransfer from './data-transfer';

export { default as rateLimit } from './rateLimit';
export { default as mfaRateLimit } from './mfa-rate-limit';
export { default as dataTransfer } from './data-transfer';

export default {
  rateLimit,
  'mfa-rate-limit': mfaRateLimit,
  'data-transfer': dataTransfer,
};
