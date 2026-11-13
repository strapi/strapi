'use strict';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import type { Core } from '@strapi/types';

const CREATE = 'plugin::content-manager.explorer.create';
const READ = 'plugin::content-manager.explorer.read';
const UPDATE = 'plugin::content-manager.explorer.update';
const DELETE = 'plugin::content-manager.explorer.delete';
const PUBLISH = 'plugin::content-manager.explorer.publish';
const ARTICLE = 'api::default-role-article.default-role-article';

type StoredPermission = { action: string; properties: { locales?: unknown } };

/**
 * Starts Strapi and records the warnings the boot logs, from the register phase on.
 */
const startStrapi = async (warnings: string[] = []) =>
  createStrapiInstance({
    async register({ strapi }: { strapi: Core.Strapi }) {
      const warn = strapi.log.warn.bind(strapi.log);

      strapi.log.warn = ((message: unknown, ...rest: unknown[]) => {
        warnings.push(String(message));

        return warn(message as string, ...(rest as []));
      }) as typeof strapi.log.warn;
    },
  });

type Row = Record<string, unknown>;

type RolesSnapshot = {
  roles: Row[];
  permissions: Row[];
  permissionRoleLinks: Row[];
  userRoleLinks: Row[];
};

/**
 * The tables that hold the admin roles, their permissions and their users
 */
const getRoleTables = (strapi: Core.Strapi) => {
  const { metadata } = strapi.db;
  const permissionRole = (metadata.get('admin::permission').attributes.role as any).joinTable;
  const userRoles = (metadata.get('admin::user').attributes.roles as any).joinTable;

  return {
    roles: metadata.get('admin::role').tableName,
    permissions: metadata.get('admin::permission').tableName,
    permissionRoleLinks: permissionRole.name as string,
    permissionColumn: permissionRole.joinColumn.name as string,
    userRoleLinks: userRoles.name as string,
  };
};

const findRolePermissionIds = async (strapi: Core.Strapi) => {
  const tables = getRoleTables(strapi);
  const links: Row[] = await strapi.db.connection(tables.permissionRoleLinks).select();

  return links.map((link) => link[tables.permissionColumn] as number);
};

/**
 * Deletes every admin role and its permissions, so the next boot seeds the default roles as a
 * first boot on a fresh database does. The admin users keep existing.
 */
const deleteAllRoles = async (strapi: Core.Strapi) => {
  const tables = getRoleTables(strapi);
  const knex = strapi.db.connection;
  const permissionIds = await findRolePermissionIds(strapi);

  await knex(tables.permissionRoleLinks).del();
  await knex(tables.userRoleLinks).del();
  await knex(tables.permissions).whereIn('id', permissionIds).del();
  await knex(tables.roles).del();
};

/**
 * Other test files read the roles by id (e.g. the Super Admin role is id 1), so the test puts
 * back the exact rows it deleted.
 */
const snapshotRoles = async (strapi: Core.Strapi): Promise<RolesSnapshot> => {
  const tables = getRoleTables(strapi);
  const knex = strapi.db.connection;

  return {
    roles: await knex(tables.roles).select(),
    permissions: await knex(tables.permissions).whereIn('id', await findRolePermissionIds(strapi)),
    permissionRoleLinks: await knex(tables.permissionRoleLinks).select(),
    userRoleLinks: await knex(tables.userRoleLinks).select(),
  };
};

// Postgres and MySQL read JSON columns as objects: write them back as JSON text
const toInsertableRow = (row: Row): Row =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value !== null && typeof value === 'object' && !(value instanceof Date)
        ? JSON.stringify(value)
        : value,
    ])
  );

const restoreRoles = async (strapi: Core.Strapi, snapshot: RolesSnapshot) => {
  const tables = getRoleTables(strapi);
  const knex = strapi.db.connection;

  await deleteAllRoles(strapi);

  const insert = (table: string, rows: Row[]) =>
    knex.batchInsert(table, rows.map(toInsertableRow) as any[], 100);

  await insert(tables.roles, snapshot.roles);
  await insert(tables.permissions, snapshot.permissions);
  await insert(tables.permissionRoleLinks, snapshot.permissionRoleLinks);
  await insert(tables.userRoleLinks, snapshot.userRoleLinks);
};

const findRolePermissions = async (strapi: Core.Strapi, code: string) =>
  (await strapi.db.query('admin::permission').findMany({
    where: { subject: ARTICLE, role: { code } },
    orderBy: { id: 'asc' },
  })) as StoredPermission[];

describe('Default roles seeded at first boot, with a localized draft & publish content type', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  const warnings: string[] = [];
  let defaultLocale: string;
  let rolesSnapshot: RolesSnapshot;

  beforeAll(async () => {
    await builder
      .addContentType({
        singularName: 'default-role-article',
        pluralName: 'default-role-articles',
        displayName: 'DefaultRoleArticle',
        draftAndPublish: true,
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
        },
      })
      .build();

    strapi = await startStrapi();
    rolesSnapshot = await snapshotRoles(strapi);
    await deleteAllRoles(strapi);
    await strapi.destroy();

    strapi = await startStrapi(warnings);
    defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
  });

  afterAll(async () => {
    if (rolesSnapshot !== undefined) {
      await restoreRoles(strapi, rolesSnapshot);
    }
    await strapi.destroy();
    await builder.cleanup();
  });

  test('The first boot removes none of the permissions it seeded', () => {
    expect(warnings.filter((message) => message.includes('stored admin permission'))).toEqual([]);
  });

  test('The Editor gets every content-manager action on the default locale', async () => {
    const permissions = await findRolePermissions(strapi, 'strapi-editor');

    expect(permissions.map(({ action }) => action)).toEqual([
      CREATE,
      READ,
      UPDATE,
      DELETE,
      PUBLISH,
    ]);
    permissions.forEach(({ properties }) => {
      expect(properties.locales).toEqual([defaultLocale]);
    });
  });

  test('The Author gets every content-manager action but publish on the default locale', async () => {
    const permissions = await findRolePermissions(strapi, 'strapi-author');

    expect(permissions.map(({ action }) => action)).toEqual([CREATE, READ, UPDATE, DELETE]);
    permissions.forEach(({ properties }) => {
      expect(properties.locales).toEqual([defaultLocale]);
    });
  });
});
