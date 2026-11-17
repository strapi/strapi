import type { Core } from '@strapi/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MigrationReport } from '../../../../shared/contracts/migration';
import { runCheck } from '../check';

const written = vi.hoisted(() => ({ report: null as MigrationReport | null }));

vi.mock('../record', () => ({
  writeReport: vi.fn(async (_strapi: unknown, report: MigrationReport) => {
    written.report = report;
  }),
}));
vi.mock('../snapshot', () => ({
  readUpSnapshot: vi.fn(async () => ({
    tables: ['up_users'],
    users: {
      total: 8,
      local: 7,
      byProvider: { local: 7, github: 1 },
      unconfirmed: 1,
      blocked: 1,
      nullDocumentIds: 0,
      pendingResets: 0,
      pendingConfirmations: 1,
    },
    duplicateEmails: [{ keep: 1, rewrite: [2] }],
    duplicateUsernames: [],
    duplicateRoleNames: [],
    usernames: { nativeRefused: [], withAt: [] },
    roles: [
      {
        id: 1,
        name: 'Authenticated',
        type: 'authenticated',
        actions: ['api::memo.memo.find', 'api::gone.gone.find'],
        users: 7,
      },
    ],
    store: { grant: null, email: null, advanced: null },
    apiTokens: [],
    adminPermissions: [],
    notNullColumns: [],
    euUsersRows: null,
  })),
}));
vi.mock('../files/plan', () => ({
  planProjectFiles: vi.fn(async () => ({
    findings: [
      { path: 'src/index.ts', line: 3, rule: 'plugin-service', message: 'Uses a plugin service.' },
    ],
  })),
}));

const makeStrapi = () =>
  ({
    db: { dialect: { client: 'sqlite' }, connection: {} },
    contentTypes: {
      'api::memo.memo': { options: { draftAndPublish: false }, attributes: { title: {} } },
    },
    contentAPI: {
      permissions: {
        providers: { action: { has: (action: string) => action === 'api::memo.memo.find' } },
      },
    },
    config: { get: () => undefined },
    dirs: { app: { root: '/nonexistent' } },
    plugin: () => undefined,
  }) as unknown as Core.Strapi;

beforeEach(() => {
  written.report = null;
});

describe('runCheck', () => {
  it('builds the report from the snapshot and the live app, and stores it with source check', async () => {
    const now = new Date('2026-11-09T10:00:00Z');
    const report = await runCheck(makeStrapi(), now);

    expect(written.report).toBe(report);
    expect(report).toMatchObject({
      source: 'check',
      generatedAt: now.toISOString(),
      counts: { users: 8, providerUsers: { github: 1 } },
    });

    const ids = report.items.map((item) => item.id);

    expect(ids).toContain('duplicate-email:all');
    expect(ids.some((id) => id.startsWith('code-finding:'))).toBe(true);

    const text = JSON.stringify(report);

    expect(text).not.toContain('@');
  });
});
