/* eslint-disable no-await-in-loop -- the steps run in order, one write at a time: each reads what the one before wrote */
import { PLUGIN_ID, USER_UID } from '../constants';
import type { MigrationStepFn } from './control';
import { dropPendingLinks, leftoverColumns } from './rollback';
import { addReportItems, readRecord, readReport, updateRecord } from './record';
import { columnsOf, dropColumn, dropTable, hasTable } from './schema-ops';
import type { DbClient } from './snapshot';

const STAGED_PERMISSIONS: ReadonlySet<string> = new Set([
  'up_permissions',
  'up_permissions_role_lnk',
]);

/** The user columns Users & Permissions made and the compatibility mode kept, which the cleanup drops */
const LEGACY_USER_COLUMNS: ReadonlySet<string> = new Set([
  'provider',
  'password',
  'reset_password_token',
  'confirmation_token',
  'confirmed',
  'blocked',
]);

/**
 * The first start with the compatibility mode off after a completed migration: what the way back
 * needed goes. The staged permission tables go, and a staged table the profile never declared only
 * once its report item is resolved (the others stay, and the log says how many). Columns the
 * models do not declare go from the roles link table, and from the user table when they are
 * Users & Permissions' own or the profile took their values; any other column the models do not
 * declare stays, with an item in the report that names it. After this the way back is a backup.
 */
export const runCleanup: MigrationStepFn = async (trx, db, ctx) => {
  const { strapi } = ctx;
  const record = (await readRecord(strapi)) ?? ctx.record;

  if (!record) {
    return;
  }

  const client = db.dialect.client as DbClient;
  const resolved = new Set(
    ((await readReport(strapi))?.items ?? [])
      .filter((item) => item.kind === 'staged-undeclared' && item.resolved)
      .map((item) => item.id)
  );
  const dropping: string[] = [];
  let keptTables = 0;

  for (const [staged, original] of Object.entries(record.staged)) {
    const copied = record.carried.copied.includes(staged);

    if (
      copied ||
      STAGED_PERMISSIONS.has(original) ||
      resolved.has(`staged-undeclared:${original}`)
    ) {
      dropping.push(staged);
    } else {
      keptTables += 1;
    }
  }

  // A link table points at its permissions: it goes first
  const linksFirst = (name: string) => (record.staged[name]?.endsWith('_lnk') ? 0 : 1);

  for (const table of dropping.sort((a, b) => linksFirst(a) - linksFirst(b))) {
    if (await hasTable(trx, db, table)) {
      await dropTable(trx, db, client, table);
    }
  }

  const user = db.metadata.get(USER_UID) as unknown as {
    tableName: string;
    attributes: Record<string, { joinTable?: { name: string } }>;
  };
  const carried = new Set(record.carried.columns);
  const dropped: string[] = [];
  const kept: string[] = [];

  for (const table of [user.tableName, user.attributes.roles?.joinTable?.name]) {
    // A table that is not there (a record written without a migration) has nothing to drop
    if (table && (await hasTable(trx, db, table))) {
      const leftover = leftoverColumns(db, table, await columnsOf(trx, db, table));
      const isUsers = table === user.tableName;
      const columns = isUsers
        ? leftover.filter((column) => LEGACY_USER_COLUMNS.has(column) || carried.has(column))
        : leftover;

      kept.push(...leftover.filter((column) => !columns.includes(column)));

      for (const column of columns) {
        await dropColumn(trx, db, client, table, column);
      }

      dropped.push(...columns);
    }
  }

  if (kept.length > 0) {
    await addReportItems(
      strapi,
      kept.map((column) => ({
        id: `staged-undeclared:${user.tableName}.${column}`,
        kind: 'staged-undeclared' as const,
        severity: 'action' as const,
        message:
          `The column ${column} of the user table is not declared by the user or profile type and ` +
          'was not copied to the profile, so it was kept. Add the matching field to the profile and ' +
          'copy its values, or drop the column once nothing needs it.',
        refs: [column],
        resolved: false,
      }))
    );
  }
  // A pending link is for the users of the migration's window, which ends with the mode
  const links = await dropPendingLinks(trx, db);

  await updateRecord(strapi, { cleanedUpAt: ctx.now().toISOString() });

  const keptNote = [
    keptTables > 0
      ? `kept ${keptTables} staged ${keptTables === 1 ? 'table' : 'tables'} the profile does not declare, which are dropped once their items in the report are resolved`
      : '',
    kept.length > 0
      ? `kept ${kept.length} ${kept.length === 1 ? 'column' : 'columns'} the models do not declare (${kept.join(', ')}), each with an item in the report`
      : '',
  ]
    .filter(Boolean)
    .map((note) => `; ${note}`)
    .join('');

  strapi.log.info(
    `${PLUGIN_ID}: cleaned up after the migration: dropped ${dropping.length} staged tables, ${dropped.length} columns (${dropped.join(', ') || 'none'}) and ${links} pending provider links${keptNote}`
  );
};
