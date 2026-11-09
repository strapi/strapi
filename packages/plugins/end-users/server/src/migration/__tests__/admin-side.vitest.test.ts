import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { adminStep, mapAdminAction } from '../admin-side';

vi.mock('../record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../record')>()),
  claimMigration: vi.fn().mockResolvedValue(true),
  addReportItems: vi.fn(),
}));

const UP = 'plugin::users-permissions';
const CM_READ = 'plugin::content-manager.explorer.read';

describe('mapAdminAction', () => {
  it('maps roles, providers and settings actions and the templates read, and not the templates update', () => {
    expect(mapAdminAction(`${UP}.roles.read`)).toBe('plugin::end-users.roles.read');
    expect(mapAdminAction(`${UP}.roles.delete`)).toBe('plugin::end-users.roles.delete');
    expect(mapAdminAction(`${UP}.providers.update`)).toBe('plugin::end-users.providers.update');
    expect(mapAdminAction(`${UP}.advanced-settings.read`)).toBe('plugin::end-users.settings.read');
    expect(mapAdminAction(`${UP}.advanced-settings.update`)).toBe(
      'plugin::end-users.settings.update'
    );
    expect(mapAdminAction(`${UP}.email-templates.read`)).toBe('plugin::email.templates.read');
    expect(mapAdminAction(`${UP}.email-templates.update`)).toBeNull();
    expect(mapAdminAction(`${UP}.something.else`)).toBeNull();
  });
});

type Row = Record<string, any>;

/** An in-memory `admin::permission` table behind the query the step uses */
const fakeStrapi = (rows: Row[]) => {
  let nextId = 100;
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([key, want]) => {
      if (key === 'role') {
        return row.role?.id === want;
      }

      if (want && typeof want === 'object' && '$startsWith' in want) {
        return String(row[key]).startsWith(want.$startsWith);
      }

      return (row[key] ?? null) === want;
    });

  const query = {
    findMany: async ({ where }: { where: Row }) => rows.filter((row) => matches(row, where)),
    findOne: async ({ where }: { where: Row }) => rows.find((row) => matches(row, where)) ?? null,
    async create({ data }: { data: Row }) {
      rows.push({ id: nextId, ...data, role: { id: data.role } });
      nextId += 1;
    },
    async update({ where, data }: { where: Row; data: Row }) {
      Object.assign(
        rows.find((row) => row.id === where.id)!,
        data
      );
    },
    async delete({ where }: { where: Row }) {
      rows.splice(
        rows.findIndex((row) => row.id === where.id),
        1
      );
    },
  };

  return {
    log: { info: vi.fn(), warn: vi.fn() },
    contentTypes: {
      'plugin::end-users.user': { attributes: { email: {}, username: {}, roles: {} } },
      'plugin::end-users.profile': { attributes: { company: {}, seo: {}, user: {} } },
    },
    db: {
      query: () => query,
      getSchemaConnection: () => ({ hasTable: async () => false }),
    },
  } as unknown as Core.Strapi;
};

const row = (id: number, action: string, subject: string | null, extra: Row = {}): Row => ({
  id,
  action,
  subject,
  properties: {},
  conditions: [],
  role: { id: 7 },
  ...extra,
});

describe('adminStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds a profile row for a read or update row that listed a moved field, with its conditions', async () => {
    const rows = [
      row(1, CM_READ, `${UP}.user`, {
        properties: { fields: ['username', 'email', 'company', 'seo.metaTitle'] },
        conditions: ['admin::is-creator'],
      }),
      row(2, 'plugin::content-manager.explorer.update', `${UP}.user`, {
        properties: { fields: ['username'] },
      }),
      row(3, 'plugin::content-manager.explorer.update', `${UP}.user`, {
        properties: { fields: ['company'] },
        conditions: ['admin::is-creator'],
      }),
    ];
    const strapi = fakeStrapi(rows);

    await adminStep.run(strapi, {} as never, 'owner');

    // The user's rows now name the new type, with the fields it keeps
    expect(rows.filter((one) => one.subject === 'plugin::end-users.user')).toEqual([
      expect.objectContaining({ id: 1, properties: { fields: ['username', 'email'] } }),
      expect.objectContaining({ id: 2, properties: { fields: ['username'] } }),
      expect.objectContaining({ id: 3, properties: { fields: [] } }),
    ]);

    // The moved fields are on the profile, with the conditions of the row they came from
    const profile = rows.filter((one) => one.subject === 'plugin::end-users.profile');

    expect(profile).toHaveLength(2);
    expect(profile).toContainEqual(
      expect.objectContaining({
        action: CM_READ,
        properties: { fields: ['company', 'seo.metaTitle'] },
        conditions: ['admin::is-creator'],
        role: { id: 7 },
      })
    );
    expect(profile).toContainEqual(
      expect.objectContaining({
        action: 'plugin::content-manager.explorer.update',
        properties: { fields: ['company'] },
        conditions: ['admin::is-creator'],
      })
    );
  });

  it('leaves the same rows when it runs again', async () => {
    const rows = [
      row(1, CM_READ, `${UP}.user`, { properties: { fields: ['username', 'company'] } }),
      row(2, `${UP}.roles.read`, null),
      row(3, `${UP}.email-templates.update`, null),
    ];
    const strapi = fakeStrapi(rows);

    await adminStep.run(strapi, {} as never, 'owner');

    const once = structuredClone(rows);

    await adminStep.run(strapi, {} as never, 'owner');

    expect(rows).toEqual(once);
    expect(rows.find((one) => one.id === 2)?.action).toBe('plugin::end-users.roles.read');
    // No counterpart: left for core's cleanup
    expect(rows.find((one) => one.id === 3)?.action).toBe(`${UP}.email-templates.update`);
  });
});
