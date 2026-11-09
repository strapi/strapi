import { http, HttpResponse } from 'msw';

import { server } from './server';

import type {
  MigrationReport,
  MigrationReportItem,
  MigrationStatusResponse,
} from '../../shared/contracts/migration';
import type { ProjectFiles } from '../src/services/migration';

type Status = MigrationStatusResponse['data'];

export const item = (overrides: Partial<MigrationReportItem> = {}): MigrationReportItem => ({
  id: 'api-token:all',
  kind: 'api-token',
  severity: 'info',
  message: 'API tokens are not changed',
  resolved: false,
  ...overrides,
});

export const REPORT: MigrationReport = {
  version: 1,
  source: 'migration',
  generatedAt: '2026-11-08T12:00:00.000Z',
  counts: {
    users: 1240,
    localUsers: 1000,
    providerUsers: { github: 240 },
    roles: 3,
    permissions: 41,
  },
  estimate: { client: 'sqlite', minutes: 2 },
  items: [
    item({
      id: 'role-renamed:author',
      kind: 'role-renamed',
      severity: 'action',
      message: 'A role was renamed',
      count: 1,
    }),
    item({
      id: 'provider-needs-input:github',
      kind: 'provider-needs-input',
      severity: 'action',
      message: 'GitHub needs a new secret',
    }),
    item({ id: 'api-token:all', resolved: true, resolvedAt: '2026-11-08T13:00:00.000Z' }),
  ],
};

export const CONFIG: Status['config'] = {
  fromUsersPermissions: true,
  duplicates: 'keep-oldest',
  registrationFields: ['displayName'],
  rollback: false,
};

export const ACTIVE: Status = {
  mode: 'active',
  config: CONFIG,
  record: {
    status: 'completed',
    attempt: 2,
    startedAt: '2026-11-08T11:00:00.000Z',
    cutoverAt: '2026-11-08T12:00:00.000Z',
    completedAt: '2026-11-08T12:00:00.000Z',
    rolledBackAt: null,
    cleanedUpAt: null,
  },
  report: REPORT,
  unresolved: 2,
  legacyJwtHits: { legacy: 7, access: 31, lastHitAt: '2026-11-08T14:00:00.000Z' },
};

export const CHECK: Status = {
  mode: 'check',
  config: { ...CONFIG, fromUsersPermissions: 'check' },
  record: null,
  report: { ...REPORT, source: 'check' },
  unresolved: 0,
  legacyJwtHits: null,
};

export const FILES: ProjectFiles = {
  writable: true,
  reason: null,
  changes: [
    {
      path: 'src/api/article/content-types/article/schema.json',
      before: '{ "owner": "plugin::users-permissions.user" }',
      after: '{ "owner": "plugin::end-users.user" }',
    },
  ],
  configBlock: "'end-users': { enabled: true }",
  usersPermissionsLine: "'users-permissions': { enabled: false }",
  findings: [
    { path: 'src/index.ts', line: 12, rule: 'plugin-service', message: 'Names the old plugin' },
  ],
};

/** Serves the status, and the project files; `status` may be a function for a read that changes */
export const serveMigration = (status: Status | (() => Status) = ACTIVE, files = FILES) => {
  server.use(
    http.get('/end-users/migration', () =>
      HttpResponse.json({ data: typeof status === 'function' ? status() : status })
    ),
    http.get('/end-users/migration/files', () => HttpResponse.json({ data: files }))
  );
};
