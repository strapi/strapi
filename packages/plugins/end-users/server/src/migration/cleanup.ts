import { PLUGIN_ID, USER_UID } from '../constants';
import type { MigrationStepFn } from './control';
import { leftoverColumns } from './rollback';
import { readRecord, readReport, updateRecord } from './record';
import { columnsOf, dropColumn, dropTable, hasTable } from './schema-ops';
import type { DbClient } from './snapshot';

const STAGED_PERMISSIONS = ['up_permissions', 'up_permissions_role_lnk'];

/**
 * The first start with the compatibility mode off after a completed migration: what the way back
 * needed goes. The staged permission tables go, and a staged table the profile never declared only
 * once its report item is resolved (the others stay, and the log says how many). Columns the
 * models do not declare go from the user table (the values moved to the profile, the reset token,
 * the compatibility mode's own) and from the roles link table. After this the way back is a backup.
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
  let kept = 0;

  for (const [staged, original] of Object.entries(record.staged)) {
    const copied = record.carried.copied.includes(staged);

    if (
      copied ||
      STAGED_PERMISSIONS.includes(original) ||
      resolved.has(`staged-undeclared:${original}`)
    ) {
      dropping.push(staged);
    } else {
      kept += 1;
    }
  }

  // A link table points at its permissions: it goes first
  const linksFirst = (name: string) => (record.staged[name]?.endsWith('_lnk') ? 0 : 1);

  for (const table of dropping.sort((a, b) => linksFirst(a) - linksFirst(b))) {
    // eslint-disable-next-line no-await-in-loop
    if (await hasTable(trx, db, table)) {
      // eslint-disable-next-line no-await-in-loop
      await dropTable(trx, db, client, table);
    }
  }

  const user = db.metadata.get(USER_UID) as unknown as {
    tableName: string;
    attributes: Record<string, { joinTable?: { name: string } }>;
  };
  let dropped = 0;

  for (const table of [user.tableName, user.attributes.roles?.joinTable?.name]) {
    // A table that is not there (a record written without a migration) has nothing to drop
    // eslint-disable-next-line no-await-in-loop
    if (table && (await hasTable(trx, db, table))) {
      // eslint-disable-next-line no-await-in-loop
      const columns = leftoverColumns(db, table, await columnsOf(trx, db, table));

      for (const column of columns) {
        // eslint-disable-next-line no-await-in-loop
        await dropColumn(trx, db, client, table, column);
      }

      dropped += columns.length;
    }
  }

  await updateRecord(strapi, { cleanedUpAt: ctx.now().toISOString() });

  const keptNote =
    kept > 0
      ? `; kept ${kept} staged ${kept === 1 ? 'table' : 'tables'} the profile does not declare, which are dropped once their items in the report are resolved`
      : '';

  strapi.log.info(
    `${PLUGIN_ID}: cleaned up after the migration: dropped ${dropping.length} staged tables and ${dropped} columns${keptNote}`
  );
};
