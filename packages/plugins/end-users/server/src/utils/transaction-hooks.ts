/**
 * What `strapi.db.transaction` hands its callback that the plugin's services use: `onCommit` runs
 * its callback once the outermost transaction has committed (a transaction inside another one
 * commits with it), and never when it rolls back.
 */
export interface TransactionHooks {
  onCommit: (callback: () => void) => void;
}
