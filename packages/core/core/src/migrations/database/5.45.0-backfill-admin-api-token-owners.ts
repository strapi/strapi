import type { Database, Migration } from '@strapi/database';

type Knex = Parameters<Migration['up']>[0];

const SUPER_ADMIN_ROLE_CODE = 'strapi-super-admin';

/** Narrow relation attributes enough for join column / join table checks (no admin imports into @strapi/database). */
type RelationalAttr = {
  type: 'relation';
  relation: string;
  joinColumn?: { name: string };
  joinTable?: {
    name: string;
    joinColumn: { name: string };
    inverseJoinColumn: { name: string };
  };
};

const isRelational = (attr: unknown): attr is RelationalAttr =>
  typeof attr === 'object' && attr !== null && (attr as { type?: string }).type === 'relation';

const hasManyToOneJoinColumn = (
  attr: RelationalAttr
): attr is RelationalAttr & { joinColumn: { name: string } } =>
  attr.relation === 'manyToOne' &&
  'joinColumn' in attr &&
  typeof attr.joinColumn === 'object' &&
  attr.joinColumn !== null &&
  'name' in attr.joinColumn;

const hasManyToManyJoinTable = (
  attr: RelationalAttr
): attr is RelationalAttr & {
  joinTable: {
    name: string;
    joinColumn: { name: string };
    inverseJoinColumn: { name: string };
  };
} =>
  attr.relation === 'manyToMany' &&
  'joinTable' in attr &&
  typeof attr.joinTable === 'object' &&
  attr.joinTable !== null &&
  'name' in attr.joinTable &&
  'joinColumn' in attr.joinTable &&
  'inverseJoinColumn' in attr.joinTable;

/**
 * Assigns `adminUserOwner` on `admin::api-token` rows that are `kind: 'admin'` but have a null owner.
 * Uses the smallest-id user that has the super-admin role when multiple exist.
 *
 * Idempotent. Skips when metadata/tables/columns are missing (e.g. admin plugin not loaded).
 */
export const backfillAdminApiTokenOwners = async (knex: Knex, db: Database): Promise<void> => {
  if (!db.metadata.has('admin::api-token')) {
    return;
  }

  const apiTokenMeta = db.metadata.get('admin::api-token');
  const tokenTable = apiTokenMeta.tableName;

  if (!(await knex.schema.hasTable(tokenTable))) {
    return;
  }

  const ownerAttr = apiTokenMeta.attributes.adminUserOwner;
  if (!isRelational(ownerAttr) || !hasManyToOneJoinColumn(ownerAttr)) {
    return;
  }

  const ownerColumn = ownerAttr.joinColumn.name;

  const kindAttr = apiTokenMeta.attributes.kind;
  const kindColumn =
    kindAttr && 'columnName' in kindAttr && kindAttr.columnName ? kindAttr.columnName : 'kind';

  if (!(await knex.schema.hasColumn(tokenTable, ownerColumn))) {
    return;
  }

  if (!(await knex.schema.hasColumn(tokenTable, kindColumn))) {
    return;
  }

  if (!db.metadata.has('admin::user') || !db.metadata.has('admin::role')) {
    return;
  }

  const userMeta = db.metadata.get('admin::user');
  const roleMeta = db.metadata.get('admin::role');
  const rolesAttr = userMeta.attributes.roles;

  if (!isRelational(rolesAttr) || !hasManyToManyJoinTable(rolesAttr)) {
    return;
  }

  const { name: joinTable, joinColumn, inverseJoinColumn } = rolesAttr.joinTable;
  const userLinkColumn = joinColumn.name;
  const roleLinkColumn = inverseJoinColumn.name;
  const roleTable = roleMeta.tableName;
  const roleCodeAttr = roleMeta.attributes.code;
  const roleCodeColumn =
    roleCodeAttr && 'columnName' in roleCodeAttr && roleCodeAttr.columnName
      ? roleCodeAttr.columnName
      : 'code';

  if (!(await knex.schema.hasTable(joinTable)) || !(await knex.schema.hasTable(roleTable))) {
    return;
  }

  const ownerRow = await knex(joinTable)
    .select(`${joinTable}.${userLinkColumn} as owner_id`)
    .innerJoin(roleTable, `${joinTable}.${roleLinkColumn}`, `${roleTable}.id`)
    .where(`${roleTable}.${roleCodeColumn}`, SUPER_ADMIN_ROLE_CODE)
    .orderBy(`${joinTable}.${userLinkColumn}`, 'asc')
    .first();

  const ownerId = ownerRow?.owner_id;

  if (ownerId === undefined || ownerId === null) {
    return;
  }

  await knex(tokenTable)
    .where(kindColumn, 'admin')
    .whereNull(ownerColumn)
    .update({
      [ownerColumn]: ownerId,
    });
};

/**
 * Registered from `providers/registries.ts` (same pattern as `discardDocumentDrafts`), not in
 * `@strapi/database` internal-migrations, so admin-domain policy stays in core.
 */
export const backfillAdminApiTokenOwnersMigration: Migration = {
  name: 'core::5.45.0-backfill-admin-api-token-owners',
  async up(knex, db) {
    await backfillAdminApiTokenOwners(knex, db);
  },
  async down() {
    throw new Error('Down migration not supported');
  },
};
