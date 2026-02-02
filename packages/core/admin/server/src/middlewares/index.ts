import rateLimit from './rateLimit';
import dataTransfer from './data-transfer';

export { default as rateLimit } from './rateLimit';
export { default as dataTransfer } from './data-transfer';

export default {
  rateLimit,
  'data-transfer': dataTransfer,
};
