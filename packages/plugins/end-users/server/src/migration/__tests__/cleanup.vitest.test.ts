import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@strapi/database';

import { runCleanup } from '../cleanup';
import * as ops from '../schema-ops';

vi.mock('../schema-ops', () => ({
  hasTable: vi.fn().mockResolvedValue(true),
  dropTable: vi.fn().mockResolvedValue(undefined),
  columnsOf: vi.fn().mockResolvedValue(['id', 'company']),
  dropColumn: vi.fn().mockResolvedValue(undefined),
}));

let record: Record<string, unknown>;
let report: unknown;

vi.mock('../record', () => ({
  readRecord: vi.fn(async () => record),
  readReport: vi.fn(async () => report),
  updateRecord: vi.fn(async (_strapi: unknown, patch: Record<string, unknown>) => {
    Object.assign(record, patch);
  }),
}));

const db = {
  dialect: { client: 'sqlite' },
  metadata: {
    get: () => ({ tableName: 'eu_users', attributes: {} }),
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
    record = {
      cleanedUpAt: null,
      staged: {
        eu_stg_1: 'up_permissions',
        eu_stg_2: 'up_permissions_role_lnk',
        eu_stg_3: 'up_users_favorites_lnk',
      },
      carried: { copied: [] },
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
    ]);
  });
});
