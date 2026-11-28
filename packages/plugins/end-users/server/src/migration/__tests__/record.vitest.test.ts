// compare-and-swap against a real SQLite table rather than a mock
import knex, { type Knex } from 'knex';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import type { MigrationReport, MigrationReportItem } from '../../../../shared/contracts/migration';
import { MIGRATION_KEY, readLegacyCutover } from '../../compat/legacy-jwt';
import {
  addReportItems,
  claimMigration,
  CLAIM_MS,
  CLAIM_SETTLE_MS,
  readRecord,
  readReport,
  releaseMigration,
  REPORT_KEY,
  updateRecord,
  writeRecord,
  writeReport,
} from '../record';

const PREFIX = 'plugin_end-users_';

let db: Knex;
const warnings = vi.fn();

/** The core store over a real table, as the plugin store reads and writes it */
const makeStrapi = () => {
  const scoped = () => ({
    async get({ key }: { key: string }) {
      const row = await db('strapi_core_store_settings')
        .where({ key: `${PREFIX}${key}` })
        .first();

      return row ? JSON.parse(row.value) : null;
    },
    async set({ key, value }: { key: string; value: unknown }) {
      const where = { key: `${PREFIX}${key}` };
      const data = { value: JSON.stringify(value), type: 'object' };

      if (await db('strapi_core_store_settings').where(where).first()) {
        await db('strapi_core_store_settings').where(where).update(data);
      } else {
        await db('strapi_core_store_settings').insert({ ...where, ...data });
      }
    },
  });

  return {
    store: scoped,
    db: { connection: db },
    log: { warn: warnings },
  } as unknown as Core.Strapi;
};

const NOW = new Date('2026-11-09T10:00:00.000Z');
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

const record = (extra: Record<string, unknown> = {}) => ({
  status: 'in-progress',
  cutoverAt: null,
  attempt: 1,
  startedAt: NOW.toISOString(),
  completedAt: null,
  rolledBackAt: null,
  cleanedUpAt: null,
  completedSteps: [],
  staged: {},
  carried: { defaultRoleDocumentId: null, copied: [], columns: [] },
  rollbackStartedAt: null,
  claim: null,
  ...extra,
});

const put = (key: string, value: unknown) =>
  db('strapi_core_store_settings').insert({
    key: `${PREFIX}${key}`,
    value: JSON.stringify(value),
    type: 'object',
  });

const item = (id: string, message: string): MigrationReportItem => ({
  id,
  kind: 'compat-note',
  severity: 'info',
  message,
  resolved: false,
});

const report = (items: MigrationReportItem[]): MigrationReport => ({
  version: 1,
  source: 'check',
  generatedAt: NOW.toISOString(),
  counts: { users: 0, localUsers: 0, providerUsers: {}, roles: 0, permissions: 0 },
  estimate: null,
  items,
});

beforeEach(async () => {
  db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await db.schema.createTable('strapi_core_store_settings', (table) => {
    table.increments('id');
    table.string('key');
    table.text('value');
    table.string('type');
    table.string('environment');
    table.string('tag');
  });
});

afterEach(async () => {
  await db.destroy();
});

describe('the migration record', () => {
  it('reads a record with extra fields as compat does, and returns null for anything else', async () => {
    const strapi = makeStrapi();

    expect(await readRecord(strapi)).toBeNull();

    await put(MIGRATION_KEY, { status: 'completed', cutoverAt: NOW.toISOString(), extra: 1 });

    const read = await readRecord(strapi);

    expect(read).toMatchObject({ status: 'completed', cutoverAt: NOW.toISOString() });
    // compat reads the same row
    expect(await readLegacyCutover(strapi)).toEqual(NOW);

    await db('strapi_core_store_settings').update({ value: JSON.stringify({ status: 'nope' }) });
    expect(await readRecord(strapi)).toBeNull();
    await db('strapi_core_store_settings').update({ value: JSON.stringify('completed') });
    expect(await readRecord(strapi)).toBeNull();
  });

  it('writes a record that compat reads, and updates it field by field', async () => {
    const strapi = makeStrapi();
    const written = record({ status: 'completed', cutoverAt: NOW.toISOString() });

    await writeRecord(strapi, written as never);
    expect(await readLegacyCutover(strapi)).toEqual(NOW);

    const updated = await updateRecord(strapi, { attempt: 2, completedSteps: ['users'] });

    expect(updated).toMatchObject({ status: 'completed', attempt: 2, completedSteps: ['users'] });
    expect(await readRecord(strapi)).toEqual(updated);
  });

  it('keeps the fields of the stored record it does not know', async () => {
    const strapi = makeStrapi();

    await put(MIGRATION_KEY, record({ extra: 'kept' }));
    await updateRecord(strapi, { attempt: 3 });

    expect(await strapi.store({}).get({ key: MIGRATION_KEY })).toMatchObject({
      extra: 'kept',
      attempt: 3,
    });
  });

  it('refuses to update when there is no record', async () => {
    await expect(updateRecord(makeStrapi(), { attempt: 2 })).rejects.toThrow(/no migration record/);
  });
});

describe('claimMigration', () => {
  it('claims an empty or expired claim, refuses a live one held by another, and renews its own', async () => {
    const strapi = makeStrapi();

    // No record: one is inserted holding the claim
    expect(await claimMigration(strapi, 'a', NOW)).toBe(true);
    expect((await readRecord(strapi))?.claim).toEqual({
      by: 'a',
      until: new Date(NOW.getTime() + CLAIM_MS).toISOString(),
    });
    expect(await db('strapi_core_store_settings').count({ n: '*' }).first()).toEqual({ n: 1 });

    // Held by a, live: b is refused and nothing changes
    expect(await claimMigration(strapi, 'b', minutes(5))).toBe(false);
    expect((await readRecord(strapi))?.claim?.by).toBe('a');

    // a renews its own: until moves to now plus 15 minutes
    expect(await claimMigration(strapi, 'a', minutes(10))).toBe(true);
    expect((await readRecord(strapi))?.claim?.until).toBe(minutes(25).toISOString());

    // Expired: b takes it
    expect(await claimMigration(strapi, 'b', minutes(26))).toBe(true);
    expect((await readRecord(strapi))?.claim?.by).toBe('b');

    // An empty claim on a record that exists
    await updateRecord(strapi, { claim: null });
    expect(await claimMigration(strapi, 'c', minutes(27))).toBe(true);
    expect((await readRecord(strapi))?.claim?.by).toBe('c');
  });

  it('keeps the rest of the record, and the fields it does not know', async () => {
    const strapi = makeStrapi();

    await put(MIGRATION_KEY, { ...record({ status: 'completed', attempt: 3 }), extra: 'kept' });
    expect(await claimMigration(strapi, 'a', NOW)).toBe(true);

    const row = await db('strapi_core_store_settings').first();

    expect(JSON.parse(row.value)).toMatchObject({ status: 'completed', attempt: 3, extra: 'kept' });
  });

  it('lets only one of two claims that read the same value win', async () => {
    const strapi = makeStrapi();

    await put(MIGRATION_KEY, record());

    const results = await Promise.all([
      claimMigration(strapi, 'a', NOW),
      claimMigration(strapi, 'b', NOW),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await readRecord(strapi))?.claim?.by).toBe(results[0] ? 'a' : 'b');
  });

  describe('when two starts insert the first record together', () => {
    const rows = () => db('strapi_core_store_settings').orderBy('id').select('id', 'value');

    afterEach(() => {
      vi.useRealTimers();
    });

    it('loses to an older row and takes its own row back out', async () => {
      const strapi = makeStrapi();

      await db('strapi_core_store_settings').insert({
        id: 1,
        key: `${PREFIX}${MIGRATION_KEY}`,
        value: JSON.stringify(record({ claim: { by: 'other', until: minutes(15).toISOString() } })),
        type: 'object',
      });
      // The older row is invisible to the first read of a start that has inserted, as on Postgres
      // when it is not committed yet: here it is hidden by being read with another key at first
      await db('strapi_core_store_settings').where({ id: 1 }).update({ key: 'hidden' });
      vi.useFakeTimers();

      const result = claimMigration(strapi, 'a', NOW);

      await vi.advanceTimersByTimeAsync(CLAIM_SETTLE_MS);
      // the older row commits between the two reads
      await db('strapi_core_store_settings')
        .where({ id: 1 })
        .update({ key: `${PREFIX}${MIGRATION_KEY}` });
      await vi.advanceTimersByTimeAsync(CLAIM_SETTLE_MS);

      expect(await result).toBe(false);
      expect(await rows()).toHaveLength(1);
      expect((await rows())[0].id).toBe(1);
    });

    it('wins when the same row is the oldest on both reads', async () => {
      const strapi = makeStrapi();

      vi.useFakeTimers();

      const result = claimMigration(strapi, 'a', NOW);

      await vi.advanceTimersByTimeAsync(CLAIM_SETTLE_MS * 2);

      expect(await result).toBe(true);
      expect(await rows()).toHaveLength(1);
    });
  });

  it('refuses a row that is not a record', async () => {
    const strapi = makeStrapi();

    await put(MIGRATION_KEY, 'garbage');
    expect(await claimMigration(strapi, 'a', NOW)).toBe(false);
  });

  it('releases only its own claim', async () => {
    const strapi = makeStrapi();

    await claimMigration(strapi, 'a', NOW);
    await releaseMigration(strapi, 'b');
    expect((await readRecord(strapi))?.claim?.by).toBe('a');

    await releaseMigration(strapi, 'a');
    expect((await readRecord(strapi))?.claim).toBeNull();
    expect(await claimMigration(strapi, 'b', NOW)).toBe(true);
  });

  it('releases nothing when there is no record', async () => {
    await expect(releaseMigration(makeStrapi(), 'a')).resolves.toBeUndefined();
  });
});

describe('the migration report', () => {
  it('reads and writes the report under its own key', async () => {
    const strapi = makeStrapi();

    expect(await readReport(strapi)).toBeNull();
    await writeReport(strapi, report([item('compat-note:a', 'one')]));
    expect((await readReport(strapi))?.items).toHaveLength(1);
    expect(
      await db('strapi_core_store_settings').where({ key: `${PREFIX}${REPORT_KEY}` })
    ).toHaveLength(1);
  });

  it('adds items by id: the same id replaces, a new one is appended, and no report means no write', async () => {
    const strapi = makeStrapi();

    warnings.mockClear();
    await addReportItems(strapi, [item('compat-note:a', 'one')]);
    expect(warnings).toHaveBeenCalledTimes(1);
    expect(await readReport(strapi)).toBeNull();
    expect(await db('strapi_core_store_settings')).toHaveLength(0);

    await writeReport(strapi, report([item('compat-note:a', 'one'), item('compat-note:b', 'two')]));
    await addReportItems(strapi, [
      item('compat-note:b', 'two, again'),
      item('compat-note:c', 'three'),
    ]);

    expect((await readReport(strapi))?.items.map(({ id, message }) => [id, message])).toEqual([
      ['compat-note:a', 'one'],
      ['compat-note:b', 'two, again'],
      ['compat-note:c', 'three'],
    ]);
  });

  it('keeps what was resolved on a replaced item, unless the new item says otherwise', async () => {
    const strapi = makeStrapi();
    const resolvedAt = '2026-11-09T09:00:00.000Z';

    await writeReport(
      strapi,
      report([
        { ...item('compat-note:a', 'one'), resolved: true, resolvedAt },
        { ...item('compat-note:b', 'two'), resolved: true, resolvedAt },
      ])
    );
    await addReportItems(strapi, [
      item('compat-note:a', 'one, again'),
      { ...item('compat-note:b', 'two, again'), resolved: true, resolvedAt: 'later' },
    ]);

    expect((await readReport(strapi))?.items).toMatchObject([
      { id: 'compat-note:a', message: 'one, again', resolved: true, resolvedAt },
      { id: 'compat-note:b', resolved: true, resolvedAt: 'later' },
    ]);
  });
});
