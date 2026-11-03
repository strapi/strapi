import { describe, expect, it, vi } from 'vitest';

import { lockDocumentForUpdate, releaseDocumentLock } from '../document-update-lock';

const createQueryBuilder = (results: unknown[]) => {
  const calls: Array<Record<string, unknown>> = [];

  const queryBuilder = () => {
    const call: Record<string, unknown> = {};
    const builder = {
      select() {
        return builder;
      },
      where(where: Record<string, unknown>) {
        call.where = where;
        return builder;
      },
      orderBy(orderBy: { id: 'asc' }) {
        call.orderBy = orderBy;
        return builder;
      },
      limit(limit: number) {
        call.limit = limit;
        return builder;
      },
      forNoKeyUpdate() {
        return builder;
      },
      async execute() {
        calls.push({ ...call });
        return results.shift() ?? [];
      },
    };

    return builder;
  };

  return { queryBuilder, calls };
};

const draftLookup = { locale: 'fr', publishedAt: { $null: true } };

const createDatabase = (client = 'postgres') => {
  const lockedDocumentIds: string[] = [];

  return {
    db: {
      dialect: { client },
      async lockDocumentId(documentId: string) {
        lockedDocumentIds.push(documentId);
      },
    },
    lockedDocumentIds,
  };
};

describe('lockDocumentForUpdate', () => {
  it('locks only the draft row of the locale being written', async () => {
    const { queryBuilder, calls } = createQueryBuilder([[{ id: 4 }]]);
    const { db } = createDatabase();

    await lockDocumentForUpdate({
      db,
      queryBuilder,
      uid: 'api::article.article',
      documentId: 'doc',
      lookup: draftLookup,
    });

    expect(calls).toEqual([
      {
        where: {
          documentId: 'doc',
          locale: 'fr',
          publishedAt: { $null: true },
        },
      },
    ]);
  });

  it('locks one existing row when the locale does not exist yet', async () => {
    const { queryBuilder, calls } = createQueryBuilder([[], [{ id: 1 }]]);
    const { db } = createDatabase();

    await lockDocumentForUpdate({
      db,
      queryBuilder,
      uid: 'api::article.article',
      documentId: 'doc',
      lookup: draftLookup,
    });

    expect(calls).toEqual([
      {
        where: {
          documentId: 'doc',
          locale: 'fr',
          publishedAt: { $null: true },
        },
      },
      {
        where: { documentId: 'doc' },
        orderBy: { id: 'asc' },
        limit: 1,
      },
    ]);
  });

  it('locks the MySQL document sentinel without locking a locale row', async () => {
    const { queryBuilder, calls } = createQueryBuilder([]);
    const { db, lockedDocumentIds } = createDatabase('mysql');

    await lockDocumentForUpdate({
      db,
      queryBuilder,
      uid: 'api::article.article',
      documentId: 'doc',
      lookup: draftLookup,
    });

    expect(lockedDocumentIds).toEqual(['doc']);
    expect(calls).toEqual([]);
  });
});

describe('releaseDocumentLock', () => {
  const createReleaseDatabase = (client: string) => {
    const deleted: string[] = [];

    return {
      db: {
        dialect: { client },
        async deleteDocumentLock(documentId: string) {
          deleted.push(documentId);
        },
      },
      deleted,
    };
  };

  it('deletes the MySQL lock row', async () => {
    const { db, deleted } = createReleaseDatabase('mysql');

    await releaseDocumentLock({ db, documentId: 'doc' });

    expect(deleted).toEqual(['doc']);
  });

  it('keeps the MySQL lock row while the document still has rows', async () => {
    const { db, deleted } = createReleaseDatabase('mysql');

    await releaseDocumentLock({ db, documentId: 'doc', keepIf: async () => true });

    expect(deleted).toEqual([]);
  });

  it('skips the row check on other dialects', async () => {
    const { db, deleted } = createReleaseDatabase('postgres');
    const keepIf = vi.fn(async () => false);

    await releaseDocumentLock({ db, documentId: 'doc', keepIf });

    expect(keepIf).not.toHaveBeenCalled();
    expect(deleted).toEqual([]);
  });
});
