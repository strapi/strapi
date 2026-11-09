import type { Core } from '@strapi/types';

import type {
  MigrationRecord,
  MigrationReport,
  MigrationReportItem,
  MigrationStatus,
  MigrationStep,
} from '../../../shared/contracts/migration';
import { PLUGIN_ID } from '../constants';
import { MIGRATION_KEY } from '../compat/legacy-jwt';

export type {
  MigrationRecord,
  MigrationStatus,
  MigrationStep,
} from '../../../shared/contracts/migration';

/** Where the report is kept, next to the record (`MIGRATION_KEY`, which compat reads) */
export const REPORT_KEY = 'migration-report';

/** How long a claim holds the migration before another start may take it */
export const CLAIM_MS = 15 * 60 * 1000;

const STORE_TABLE = 'strapi_core_store_settings';

/** The row's own key: the core store prefixes a plugin's key with its type and name */
const rowKey = (key: string) => `plugin_${PLUGIN_ID}_${key}`;

const STATUSES: readonly MigrationStatus[] = ['in-progress', 'completed', 'rolled-back'];

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const parseClaim = (value: unknown): MigrationRecord['claim'] => {
  if (!isPlain(value) || typeof value.by !== 'string' || typeof value.until !== 'string') {
    return null;
  }

  return { by: value.by, until: value.until };
};

/**
 * The stored value as a record, or `null` when it is not one. Read the way compat reads it: other
 * fields beside the ones listed are fine, and a field that is missing or of the wrong type takes
 * its empty value. Only a status that is not one of the three makes it no record.
 */
const parseRecord = (value: unknown): MigrationRecord | null => {
  if (!isPlain(value) || !STATUSES.includes(value.status as MigrationStatus)) {
    return null;
  }

  const staged = isPlain(value.staged) ? value.staged : {};
  const carried = isPlain(value.carried) ? value.carried : {};

  return {
    status: value.status as MigrationStatus,
    cutoverAt: text(value.cutoverAt),
    attempt: typeof value.attempt === 'number' ? value.attempt : 0,
    startedAt: text(value.startedAt) ?? '',
    completedAt: text(value.completedAt),
    rolledBackAt: text(value.rolledBackAt),
    cleanedUpAt: text(value.cleanedUpAt),
    completedSteps: textList(value.completedSteps) as MigrationStep[],
    staged: Object.fromEntries(
      Object.entries(staged).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    ),
    carried: {
      defaultRoleDocumentId: text(carried.defaultRoleDocumentId),
      copied: textList(carried.copied),
    },
    claim: parseClaim(value.claim),
  };
};

const store = (strapi: Core.Strapi) => strapi.store({ type: 'plugin', name: PLUGIN_ID });

export const readRecord = async (strapi: Core.Strapi): Promise<MigrationRecord | null> =>
  parseRecord(await store(strapi).get({ key: MIGRATION_KEY }));

export const writeRecord = async (strapi: Core.Strapi, record: MigrationRecord): Promise<void> => {
  await store(strapi).set({ key: MIGRATION_KEY, value: record });
};

/** Writes `patch` over the stored record and returns the result. There must be a record. */
export const updateRecord = async (
  strapi: Core.Strapi,
  patch: Partial<MigrationRecord>
): Promise<MigrationRecord> => {
  const current = await readRecord(strapi);

  if (!current) {
    throw new Error('There is no migration record to update.');
  }

  // Fields of the stored record this code does not know are kept, as `claimMigration` keeps them
  const raw = await store(strapi).get({ key: MIGRATION_KEY });
  const next = { ...(isPlain(raw) ? raw : {}), ...current, ...patch } as MigrationRecord;

  await writeRecord(strapi, next);

  return next;
};

const freshRecord = (claim: MigrationRecord['claim'], now: Date): MigrationRecord => ({
  status: 'in-progress',
  cutoverAt: null,
  attempt: 1,
  startedAt: now.toISOString(),
  completedAt: null,
  rolledBackAt: null,
  cleanedUpAt: null,
  completedSteps: [],
  staged: {},
  carried: { defaultRoleDocumentId: null, copied: [] },
  claim,
});

const rowOf = (strapi: Core.Strapi) =>
  strapi.db
    .connection(STORE_TABLE)
    .where({ key: rowKey(MIGRATION_KEY) })
    .whereNull('environment')
    .whereNull('tag');

/** `value` of the record's row, exactly as stored, or `null` when there is no row */
const readRaw = async (strapi: Core.Strapi): Promise<string | null> => {
  const row = (await rowOf(strapi).first('value')) as { value: string | null } | undefined;

  return row ? (row.value ?? '') : null;
};

/**
 * Replaces the row's value with `next` only if it still holds `current`: a compare-and-swap, so
 * of two starts that read the same value only one write lands. The affected row count decides.
 */
const swap = async (strapi: Core.Strapi, current: string, next: unknown): Promise<boolean> => {
  const affected = await rowOf(strapi)
    .where({ value: current })
    .update({ value: JSON.stringify(next), type: 'object' });

  return affected === 1;
};

/**
 * Takes the migration for `by` for 15 minutes. Wins when the claim is empty, expired or already
 * `by`'s, and then sets `until` to now plus 15 minutes; a live claim of someone else is refused.
 * With no record yet it inserts one that holds the claim. Two starts that race for the same
 * moment cannot both win.
 */
export const claimMigration = async (
  strapi: Core.Strapi,
  by: string,
  now: Date = new Date()
): Promise<boolean> => {
  const claim = { by, until: new Date(now.getTime() + CLAIM_MS).toISOString() };
  const current = await readRaw(strapi);

  if (current === null) {
    return insertClaimed(strapi, freshRecord(claim, now));
  }

  let value: unknown;

  try {
    value = JSON.parse(current);
  } catch {
    return false;
  }

  if (!isPlain(value)) {
    return false;
  }

  const held = parseClaim(value.claim);

  if (held && held.by !== by && new Date(held.until).getTime() > now.getTime()) {
    return false;
  }

  return swap(strapi, current, { ...value, claim });
};

/** Inserts the first record. Two starts that insert together leave two rows: the older one wins. */
const insertClaimed = async (strapi: Core.Strapi, record: MigrationRecord): Promise<boolean> => {
  const value = JSON.stringify(record);

  await strapi.db.connection(STORE_TABLE).insert({
    key: rowKey(MIGRATION_KEY),
    value,
    type: 'object',
    environment: null,
    tag: null,
  });

  const rows = (await strapi.db
    .connection(STORE_TABLE)
    .where({ key: rowKey(MIGRATION_KEY) })
    .orderBy('id', 'asc')
    .select('id', 'value')) as Array<{ id: number; value: string }>;

  if (rows.length < 2 || rows[0].value === value) {
    return true;
  }

  const ours = rows.find((row) => row.value === value);

  if (ours) {
    await strapi.db.connection(STORE_TABLE).where({ id: ours.id }).delete();
  }

  return false;
};

/** Gives the claim up if it is `by`'s, so the next start need not wait for it to run out */
export const releaseMigration = async (strapi: Core.Strapi, by: string): Promise<void> => {
  const current = await readRaw(strapi);

  if (current === null) {
    return;
  }

  try {
    const value: unknown = JSON.parse(current);

    if (isPlain(value) && parseClaim(value.claim)?.by === by) {
      await swap(strapi, current, { ...value, claim: null });
    }
  } catch {
    // Not a record: nothing of ours to release
  }
};

export const readReport = async (strapi: Core.Strapi): Promise<MigrationReport | null> => {
  const value = await store(strapi).get({ key: REPORT_KEY });

  return isPlain(value) && value.version === 1 && Array.isArray(value.items)
    ? (value as unknown as MigrationReport)
    : null;
};

export const writeReport = async (strapi: Core.Strapi, report: MigrationReport): Promise<void> => {
  await store(strapi).set({ key: REPORT_KEY, value: report });
};

/**
 * Merges `items` into the stored report by `id`: an item with an id the report has replaces it, a
 * new one is appended. Logs and does nothing when no report is stored.
 */
export const addReportItems = async (
  strapi: Core.Strapi,
  items: MigrationReportItem[]
): Promise<void> => {
  const report = await readReport(strapi);

  if (!report) {
    strapi.log.warn('The migration report is not stored, so its new items were not recorded.');

    return;
  }

  const merged = new Map(report.items.map((item) => [item.id, item]));

  for (const item of items) {
    const old = merged.get(item.id);

    // A replaced item keeps what an administrator already resolved, unless the new one says otherwise
    merged.set(
      item.id,
      old?.resolved
        ? {
            ...item,
            resolved: item.resolved || old.resolved,
            resolvedAt: item.resolvedAt ?? old.resolvedAt,
          }
        : item
    );
  }

  await writeReport(strapi, { ...report, items: [...merged.values()] });
};
