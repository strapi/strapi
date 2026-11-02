import { describe, expect, it } from 'vitest';

import { lockDocumentForUpdate } from '../document-update-lock';

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
