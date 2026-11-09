import type { Database } from '@strapi/database';

/** The Users & Permissions tables the move renames: their rows and ids are the end-users ones */
export const RENAMED: Readonly<Record<string, string>> = {
  up_users: 'eu_users',
  up_roles: 'eu_roles',
  up_users_role_lnk: 'eu_users_roles_lnk',
};

const STAGING_PREFIX = 'eu_stg_';

/** Where every other `up_*` table waits until the step that carries it copies it back */
export const stagingName = (n: number): string => `${STAGING_PREFIX}${n}`;

/** The number in a staging table's name, or `null` when the name is not one */
export const stagingNumber = (name: string): number | null => {
  const match = /^eu_stg_(\d+)$/.exec(name);

  return match ? Number(match[1]) : null;
};

/**
 * The link table Users & Permissions' own metadata gave a relation the user owns, named by the
 * same rule (and shortened the same way past the identifier limit).
 */
export const upJoinTableName = (db: Database, attribute: string): string =>
  db.metadata.naming.joinTableName('up_users', attribute);

/**
 * The staging name each table in `tables` gets: the `up_*` tables that are not renamed and not
 * staged yet, in name order, numbered after the highest number in use.
 */
export const planStaging = (
  tables: readonly string[],
  staged: Readonly<Record<string, string>>,
  existing: readonly string[]
): Record<string, string> => {
  const taken = [...Object.keys(staged), ...existing]
    .map(stagingNumber)
    .filter((n): n is number => n !== null);
  const alreadyStaged = new Set(Object.values(staged));
  let next = Math.max(0, ...taken) + 1;
  const plan: Record<string, string> = {};

  for (const table of [...tables].sort((a, b) => a.localeCompare(b))) {
    if (table.startsWith('up_') && !(table in RENAMED) && !alreadyStaged.has(table)) {
      plan[stagingName(next)] = table;
      next += 1;
    }
  }

  return plan;
};
