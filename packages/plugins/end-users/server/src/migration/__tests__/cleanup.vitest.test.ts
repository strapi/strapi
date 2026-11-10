import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@strapi/database';

import { runCleanup } from '../cleanup';
import * as ops from '../schema-ops';
import * as store from '../record';

/** The rows the cleanup deletes from a table, with the `where` it gave */
const deleted = vi.hoisted(() => ({ calls: [] as Array<{ table: string; where: unknown[] }> }));

vi.mock('../schema-ops', () => ({
  hasTable: vi.fn().mockResolvedValue(true),
  dropTable: vi.fn().mockResolvedValue(undefined),
  columnsOf: vi.fn().mockResolvedValue(['id', 'company', 'password', 'notes']),
  dropColumn: vi.fn().mockResolvedValue(undefined),
  tableOf: vi.fn((_trx: unknown, _db: unknown, table: string) => ({
    where: (...where: unknown[]) => ({
      async del() {
        deleted.calls.push({ table, where });

        return 2;
      },
    }),
  })),
}));

let record: Record<string, unknown>;
let report: unknown;

vi.mock('../record', () => ({
  readRecord: vi.fn(async () => record),
  readReport: vi.fn(async () => report),
  addReportItems: vi.fn(async () => undefined),
  updateRecord: vi.fn(async (_strapi: unknown, patch: Record<string, unknown>) => {
    Object.assign(record, patch);
  }),
}));

const db = {
  dialect: { client: 'sqlite' },
  metadata: {
    get: (uid: string) =>
      uid === 'plugin::end-users.verification'
        ? {
            tableName: 'eu_verifications',
            attributes: { identifier: { columnName: 'identifier' } },
          }
        : { tableName: 'eu_users', attributes: {} },
    values: () => [{ tableName: 'eu_users', attributes: { id: { columnName: 'id' } } }],
  },
} as unknown as Database;

const ctx = (): Parameters<typeof runCleanup>[2] =>
  ({
    strapi: { log: { info: vi.fn() } },
    now: () => new Date('2026-11-09T10:00:00Z'),
    record,
  }) as never;

describe('runCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleted.calls = [];
    record = {
      cleanedUpAt: null,
      staged: {
        eu_stg_1: 'up_permissions',
        eu_stg_2: 'up_permissions_role_lnk',
        eu_stg_3: 'up_users_favorites_lnk',
      },
      carried: { copied: [], columns: ['company'] },
    };
    report = {
      items: [{ id: 'staged-undeclared:up_users_favorites_lnk', kind: 'staged-undeclared' }],
    };
  });

  it('drops the staged permission tables, link first, and keeps an undeclared one until it is resolved', async () => {
    await runCleanup({} as never, db, ctx());

    expect(vi.mocked(ops.dropTable).mock.calls.map((call) => call[3])).toEqual([
      'eu_stg_2',
      'eu_stg_1',
    ]);
    expect(record.cleanedUpAt).toBe('2026-11-09T10:00:00.000Z');
  });

  it('drops an undeclared staged table once its item is resolved, and the columns the model does not declare', async () => {
    report = {
      items: [
        {
          id: 'staged-undeclared:up_users_favorites_lnk',
          kind: 'staged-undeclared',
          resolved: true,
        },
      ],
    };

    await runCleanup({} as never, db, ctx());

    expect(vi.mocked(ops.dropTable).mock.calls.map((call) => call[3])).toContain('eu_stg_3');
    expect(vi.mocked(ops.dropColumn).mock.calls.map((call) => [call[3], call[4]])).toEqual([
      ['eu_users', 'company'],
      ['eu_users', 'password'],
    ]);
  });

  it('keeps a column that is neither a legacy one nor copied to the profile, and names it in an item', async () => {
    await runCleanup({} as never, db, ctx());

    expect(vi.mocked(ops.dropColumn).mock.calls.map((call) => call[4])).not.toContain('notes');
    expect(vi.mocked(store.addReportItems).mock.calls[0][1]).toEqual([
      expect.objectContaining({
        id: 'staged-undeclared:eu_users.notes',
        severity: 'action',
        refs: ['notes'],
        message: expect.stringContaining('notes'),
      }),
    ]);
    expect(record.cleanedUpAt).toBe('2026-11-09T10:00:00.000Z');
  });

  it('drops the pending provider links: they last only as long as the compatibility mode', async () => {
    const strapiCtx = ctx();

    await runCleanup({} as never, db, strapiCtx);

    expect(deleted.calls).toEqual([
      { table: 'eu_verifications', where: ['identifier', 'like', 'migrated-provider-link:%'] },
    ]);
    expect(
      (strapiCtx as unknown as { strapi: { log: { info: ReturnType<typeof vi.fn> } } }).strapi.log
        .info
    ).toHaveBeenCalledWith(expect.stringContaining('2 pending provider links'));
  });
});
