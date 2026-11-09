import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import type { MigrationReport, MigrationReportItem } from '../../../../shared/contracts/migration';
import migrationService from '../migration';

const item = (
  kind: MigrationReportItem['kind'],
  key: string,
  extra: Partial<MigrationReportItem> = {}
): MigrationReportItem => ({
  id: `${kind}:${key}`,
  kind,
  severity: 'action',
  message: 'm',
  resolved: false,
  ...extra,
});

const reportOf = (
  items: MigrationReportItem[],
  source: MigrationReport['source'] = 'migration'
): MigrationReport => ({
  version: 1,
  source,
  generatedAt: '2026-11-01T00:00:00.000Z',
  counts: { users: 0, localUsers: 0, providerUsers: {}, roles: 0, permissions: 0 },
  estimate: null,
  items,
});

interface World {
  report?: MigrationReport | null;
  record?: Record<string, unknown> | null;
  from?: boolean | 'check' | null;
  providers?: Array<{ id: string; status: string }>;
  customised?: string[];
  leftWithPlaceholder?: number;
}

const setup = (world: World = {}) => {
  const stored: Record<string, unknown> = {
    migration: world.record ?? null,
    'migration-report': world.report ?? null,
  };
  const set = vi.fn(async ({ key, value }: { key: string; value: unknown }) => {
    stored[key] = value;
  });
  const count = vi.fn(async () => world.leftWithPlaceholder ?? 0);
  const hits = vi.fn(async () => ({ legacy: 2, access: 1, lastHitAt: null }));
  const services: Record<string, Record<string, unknown>> = {
    provider: { list: async () => world.providers ?? [] },
    compat: { legacyJwtHits: hits },
  };
  const strapi = {
    config: {
      get: (path: string) =>
        path.endsWith('fromUsersPermissions') ? (world.from ?? true) : undefined,
    },
    store: () => ({ get: async ({ key }: { key: string }) => stored[key], set }),
    db: { query: () => ({ count }) },
    plugin: (name: string) => ({
      service: (service: string) =>
        name === 'email'
          ? {
              list: async (key: string) => [
                { key, customised: (world.customised ?? []).includes(key) },
              ],
            }
          : services[service],
    }),
  } as unknown as Core.Strapi;

  return { service: migrationService({ strapi }), set, stored, hits };
};

describe('migration service', () => {
  it('counts unresolved action items only', async () => {
    const { service } = setup({
      report: reportOf([
        item('api-token', 'all'),
        item('role-renamed', 'a', { resolved: true }),
        item('compat-note', 'b', { severity: 'info' }),
      ]),
    });

    expect((await service.status()).unresolved).toBe(1);
  });

  it('resolves a provider item once it is ready, a template item once saved, and an address item once edited', async () => {
    const world: World = {
      report: reportOf([
        item('provider-needs-input', 'github'),
        item('template-untranslated', 'end-users.reset-password'),
        item('duplicate-email', 'all', { refs: ['1:2,3'] }),
      ]),
      providers: [{ id: 'github', status: 'disabled' }],
      leftWithPlaceholder: 1,
    };
    const first = setup(world);

    expect((await first.service.status()).unresolved).toBe(3);
    expect(first.set).not.toHaveBeenCalled();

    world.providers = [{ id: 'github', status: 'ready' }];
    world.customised = ['end-users.reset-password'];
    world.leftWithPlaceholder = 0;
    const second = setup(world);
    const status = await second.service.status();

    expect(status.unresolved).toBe(0);
    expect(status.report?.items.every((entry) => entry.resolved && entry.resolvedAt)).toBe(true);
    expect(second.set).toHaveBeenCalledTimes(1);
  });

  it('decides the address item from the users, not from its refs, which stop at a cap', async () => {
    const report = reportOf([item('duplicate-email', 'all', { refs: [] })]);
    const open = setup({ report, leftWithPlaceholder: 1 });
    const done = setup({ report, leftWithPlaceholder: 0 });

    expect((await open.service.status()).unresolved).toBe(1);
    expect((await done.service.status()).unresolved).toBe(0);
  });

  it('refuses to acknowledge a kind that resolves itself', async () => {
    const { service, set } = setup({ report: reportOf([item('provider-needs-input', 'github')]) });

    await expect(service.updateItem('provider-needs-input:github', true)).rejects.toThrow(
      /resolves itself/
    );
    await expect(service.updateItem('api-token:none', true)).rejects.toThrow(/not in the/);
    expect(set).not.toHaveBeenCalled();
  });

  it('acknowledges and reopens an item', async () => {
    const { service, stored } = setup({ report: reportOf([item('api-token', 'all')]) });

    const done = await service.updateItem('api-token:all', true);

    expect(done.resolved).toBe(true);
    expect(done.resolvedAt).toBeTruthy();

    const reopened = await service.updateItem('api-token:all', false);

    expect(reopened).not.toHaveProperty('resolvedAt');
    expect((stored['migration-report'] as MigrationReport).items[0].resolved).toBe(false);
  });

  it('answers in check mode with the last check report and nothing unresolved', async () => {
    const report = reportOf([item('api-token', 'all')], 'check');
    const { service, set, hits } = setup({ from: 'check', report });
    const status = await service.status();

    expect(status).toMatchObject({
      mode: 'check',
      record: null,
      unresolved: 0,
      legacyJwtHits: null,
    });
    expect(status.report).toBe(report);
    expect(set).not.toHaveBeenCalled();
    expect(hits).not.toHaveBeenCalled();
  });
});
