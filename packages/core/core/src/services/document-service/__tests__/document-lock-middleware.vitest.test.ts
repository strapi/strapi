import { describe, expect, it } from 'vitest';

import { createDocumentLockMiddleware } from '../middlewares/document-lock';
import { createMiddlewareManager } from '../middlewares/middleware-manager';

const createDatabase = ({ client = 'mysql', inTransaction = true } = {}) => {
  const calls: string[] = [];
  const db = {
    dialect: { client },
    inTransaction: () => inTransaction,
    async lockDocumentId(documentId: string) {
      calls.push(`lock ${documentId}`);
    },
  };

  return { db, calls };
};

const run = async (
  db: ReturnType<typeof createDatabase>['db'],
  calls: string[],
  action: string,
  params: Record<string, unknown>
) => {
  const manager = createMiddlewareManager();
  manager.use(createDocumentLockMiddleware(() => db));
  // Stands in for a plugin middleware, such as i18n, that reads first.
  manager.use(async (_ctx, next) => {
    calls.push('plugin read');
    return next();
  });

  await manager.run({ action, params }, () => {
    calls.push('repository');
  });
};

describe('document lock middleware', () => {
  it.each(['update', 'delete'])(
    'locks on MySQL before plugin middlewares read inside a transaction (%s)',
    async (action) => {
      const { db, calls } = createDatabase();

      await run(db, calls, action, { documentId: 'doc' });

      expect(calls).toEqual(['lock doc', 'plugin read', 'repository']);
    }
  );

  it('leaves the lock to the repository outside a transaction', async () => {
    const { db, calls } = createDatabase({ inTransaction: false });

    await run(db, calls, 'update', { documentId: 'doc' });

    expect(calls).toEqual(['plugin read', 'repository']);
  });

  it.each(['postgres', 'sqlite'])('does nothing on %s', async (client) => {
    const { db, calls } = createDatabase({ client });

    await run(db, calls, 'update', { documentId: 'doc' });

    expect(calls).toEqual(['plugin read', 'repository']);
  });

  it('ignores other actions and calls without a documentId', async () => {
    const { db, calls } = createDatabase();

    await run(db, calls, 'findOne', { documentId: 'doc' });
    await run(db, calls, 'update', {});

    expect(calls).toEqual(['plugin read', 'repository', 'plugin read', 'repository']);
  });
});
