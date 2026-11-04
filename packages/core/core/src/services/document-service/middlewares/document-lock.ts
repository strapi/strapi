import { lockDocumentBeforeRead } from '../document-update-lock';

import type { Middleware } from './middleware-manager';

interface Database {
  dialect: { client: string };
  inTransaction(): boolean;
  lockDocumentId?(documentId: string): Promise<void>;
}

const LOCKED_ACTIONS = ['update', 'delete'];

/**
 * Take the MySQL document lock before any other middleware reads.
 *
 * Plugin middlewares, such as i18n, read the document before the repository
 * runs. When the caller already opened a transaction, that read fixes the
 * REPEATABLE READ snapshot before the repository takes the lock, and a writer
 * that then waits misses the locale the other writer created. Outside a
 * transaction those reads do not share the repository's snapshot, so this
 * does nothing there.
 */
export const createDocumentLockMiddleware =
  (getDb: () => Database): Middleware =>
  async (ctx, next) => {
    const documentId = ctx.params?.documentId;

    if (LOCKED_ACTIONS.includes(ctx.action) && typeof documentId === 'string' && documentId) {
      const db = getDb();
      if (db.inTransaction()) {
        await lockDocumentBeforeRead({ db, documentId });
      }
    }

    return await next();
  };
