import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import type { MigrationRecord } from '../record';
import * as records from '../record';
import { POST_SYNC_STEPS, runPostSync } from '../post-sync';

vi.mock('../record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../record')>()),
  readRecord: vi.fn(),
  updateRecord: vi.fn(),
  claimMigration: vi.fn(),
  releaseMigration: vi.fn(),
  lastClaimOwner: vi.fn(),
}));

const OWNER = 'start-1';

const record = (patch: Partial<MigrationRecord> = {}): MigrationRecord => ({
  status: 'in-progress',
  cutoverAt: null,
  attempt: 1,
  startedAt: '2026-11-09T00:00:00.000Z',
  completedAt: null,
  rolledBackAt: null,
  cleanedUpAt: null,
  completedSteps: ['pre-sync'],
  staged: {},
  carried: { defaultRoleDocumentId: null, copied: [] },
  claim: { by: OWNER, until: '2999-01-01T00:00:00.000Z' },
  ...patch,
});

const strapi = { log: { info: vi.fn(), warn: vi.fn() } } as unknown as Core.Strapi;

/** The record as the store holds it: updates are merged in, as `updateRecord` does */
const store = (initial: MigrationRecord) => {
  let current = initial;

  vi.mocked(records.readRecord).mockImplementation(async () => current);
  vi.mocked(records.updateRecord).mockImplementation(async (_strapi, patch) => {
    current = { ...current, ...patch };

    return current;
  });

  return () => current;
};

describe('runPostSync', () => {
  const ran: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    ran.length = 0;
    vi.mocked(records.lastClaimOwner).mockReturnValue(OWNER);
    vi.mocked(records.claimMigration).mockResolvedValue(true);

    for (const step of POST_SYNC_STEPS) {
      vi.spyOn(step, 'run').mockImplementation(async () => {
        ran.push(step.name);
      });
    }
  });

  it('runs only the steps the record has not done, in order', async () => {
    const current = store(record({ completedSteps: ['pre-sync', 'users', 'roles'] }));

    await runPostSync(strapi);

    expect(ran).toEqual(['permissions', 'profiles', 'accounts']);
    expect(current().completedSteps).toEqual([
      'pre-sync',
      'users',
      'roles',
      'permissions',
      'profiles',
      'accounts',
    ]);
    expect(records.releaseMigration).toHaveBeenCalledWith(strapi, OWNER);
  });

  it('skips everything unless the pre-sync is recorded', async () => {
    store(record({ completedSteps: [] }));
    await runPostSync(strapi);

    store(record({ status: 'completed' }));
    await runPostSync(strapi);

    vi.mocked(records.readRecord).mockResolvedValue(null);
    await runPostSync(strapi);

    expect(ran).toEqual([]);
    expect(records.claimMigration).not.toHaveBeenCalled();
  });

  it('stops without writing when another start has taken the migration', async () => {
    const current = store(record());

    vi.mocked(records.claimMigration).mockResolvedValueOnce(true).mockResolvedValue(false);

    await expect(runPostSync(strapi)).rejects.toThrow(/no longer holds the migration/);
    expect(ran).toEqual([]);
    expect(current().completedSteps).toEqual(['pre-sync']);
  });
});
