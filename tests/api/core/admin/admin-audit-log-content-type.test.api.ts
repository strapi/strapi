import { createStrapiInstance } from 'api-tests/strapi';
import type { Core } from '@strapi/types';

// The audit-log content type is registered in every edition so its table, and the data in it,
// survive a license change. Runs in both the CE and EE jobs.
describe('Audit log content type', () => {
  let strapi: Core.Strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('registers admin::audit-log', () => {
    expect(strapi.contentTypes['admin::audit-log']).toBeDefined();
  });

  test('creates and persists the strapi_audit_logs table', async () => {
    expect(await strapi.db.getConnection().schema.hasTable('strapi_audit_logs')).toBe(true);

    const persistedTables = (await strapi.store.get({
      type: 'core',
      key: 'persisted_tables',
    })) as Array<{ name: string }> | null;

    expect(persistedTables ?? []).toContainEqual(
      expect.objectContaining({ name: 'strapi_audit_logs' })
    );
  });
});
