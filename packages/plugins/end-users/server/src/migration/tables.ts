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

/** The columns of a join table, as the database metadata names them */
export interface LinkTable {
  joinColumn: { name: string };
  inverseJoinColumn: { name: string };
  orderColumnName?: string;
  inverseOrderColumnName?: string;
}

/** The snake case the metadata layer gives a singular name, enough for the kebab-case ones */
const snake = (name: string): string =>
  name
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z\d]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

/**
 * The column of Users & Permissions' link table that matches a column of the profile's link table
 * for the same relation. The profile owns the relation, so its own side is `user_id` there. When the
 * other side is named `user_id` too, a relation to the user itself or to a type whose singular name is
 * `user` (the admin's, which review workflows' assignee points at), the metadata layer calls that
 * side `inv_user_id`, and its order column `inv_user_order` on a many-to-many. A relation to a type
 * called profile is the profile's own two sides, `profile_id` and `inv_profile_id`, which Users &
 * Permissions' table calls `user_id` and `profile_id`.
 */
export const upLinkColumn = (
  link: LinkTable,
  column: string,
  relation?: string,
  targetSingularName?: string
): string => {
  if (column === link.joinColumn.name) {
    return 'user_id';
  }

  if (column === link.inverseJoinColumn.name) {
    // A target that is also called profile: the metadata layer prefixes the other side with `inv_`
    // because its plain name equals the join column, and Users & Permissions' table names it like
    // that join column (`profile_id`). The prefix is not enough to tell: a target whose own name is
    // `inv_profile` has a plain inverse column spelled the same way.
    if (
      targetSingularName !== undefined &&
      `${snake(targetSingularName)}_id` === link.joinColumn.name &&
      column === `inv_${link.joinColumn.name}`
    ) {
      return link.joinColumn.name;
    }

    return column === 'user_id' ? 'inv_user_id' : column;
  }

  if (column === link.inverseOrderColumnName) {
    return link.orderColumnName === 'user_order' && relation === 'manyToMany'
      ? 'inv_user_order'
      : 'user_order';
  }

  return column;
};
