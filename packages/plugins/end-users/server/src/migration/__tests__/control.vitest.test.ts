import { describe, expect, it } from 'vitest';

import { decideMigration } from '../control';
import type { MigrationState } from '../control';
import type { MigrationRecord } from '../record';

const record = (patch: Partial<MigrationRecord> = {}): MigrationRecord => ({
  status: 'completed',
  cutoverAt: '2026-11-01T00:00:00.000Z',
  attempt: 1,
  startedAt: '2026-11-01T00:00:00.000Z',
  completedAt: null,
  rolledBackAt: null,
  cleanedUpAt: null,
  completedSteps: [],
  staged: {},
  carried: { defaultRoleDocumentId: null, copied: [] },
  claim: null,
  ...patch,
});

const state = (patch: Partial<Omit<MigrationState, 'config'>> & { config?: object } = {}) => {
  const { config, ...rest } = patch;

  return {
    config: {
      fromUsersPermissions: null,
      duplicates: 'keep-oldest',
      registrationFields: null,
      rollback: false,
      ...config,
    },
    compat: true,
    upLoaded: false,
    record: null,
    upUsersTable: false,
    euUsersRows: null,
    ...rest,
  } as MigrationState;
};

const refusal = (decision: ReturnType<typeof decideMigration>) =>
  decision.kind === 'refuse' ? decision.message : '';

describe('decideMigration', () => {
  it('checks when check mode is on and users-permissions is loaded', () => {
    expect(
      decideMigration(state({ config: { fromUsersPermissions: 'check' }, upLoaded: true }))
    ).toEqual({ kind: 'check' });
  });

  it('refuses check mode when users-permissions is not loaded', () => {
    const decision = decideMigration(state({ config: { fromUsersPermissions: 'check' } }));

    expect(decision.kind).toBe('refuse');
    expect(refusal(decision)).toContain('check');
  });

  it('does nothing while users-permissions is loaded', () => {
    expect(
      decideMigration(
        state({ upLoaded: true, upUsersTable: true, config: { fromUsersPermissions: true } })
      )
    ).toEqual({ kind: 'none' });
  });

  it('rolls back a completed migration when asked, with the compatibility mode on', () => {
    expect(decideMigration(state({ config: { rollback: true }, record: record() }))).toEqual({
      kind: 'rollback',
    });
  });

  it('refuses a rollback while migration.rollback is still set after one', () => {
    const decision = decideMigration(
      state({ config: { rollback: true }, record: record({ status: 'rolled-back' }) })
    );

    expect(refusal(decision)).toContain('migration.rollback');
  });

  it('refuses a rollback when there is no record', () => {
    expect(refusal(decideMigration(state({ config: { rollback: true } })))).toContain(
      'nothing to roll back'
    );
  });

  it('refuses a rollback with the compatibility mode off', () => {
    expect(
      refusal(
        decideMigration(state({ config: { rollback: true }, compat: false, record: record() }))
      )
    ).toContain('backup');
  });

  it('refuses a rollback after the old tables were cleaned up', () => {
    expect(
      refusal(
        decideMigration(
          state({ config: { rollback: true }, record: record({ cleanedUpAt: '2026-11-02' }) })
        )
      )
    ).toContain('backup');
  });

  it('migrates attempt two after a rollback when asked again', () => {
    expect(
      decideMigration(
        state({
          record: record({ status: 'rolled-back', attempt: 1 }),
          upUsersTable: true,
          config: { fromUsersPermissions: true },
        })
      )
    ).toEqual({ kind: 'migrate', attempt: 2 });
  });

  it('refuses after a rollback when the migration is not asked for again', () => {
    expect(
      decideMigration(
        state({
          record: record({ status: 'rolled-back' }),
          upUsersTable: true,
          config: { fromUsersPermissions: false },
        })
      ).kind
    ).toBe('refuse');
  });

  it('refuses after a rollback when the old tables are gone', () => {
    expect(
      decideMigration(
        state({ record: record({ status: 'rolled-back' }), config: { fromUsersPermissions: true } })
      ).kind
    ).toBe('refuse');
  });

  it('cleans up a completed migration once the compatibility mode is off', () => {
    expect(decideMigration(state({ compat: false, record: record() }))).toEqual({
      kind: 'cleanup',
    });
  });

  it('does nothing once a completed migration was cleaned up', () => {
    expect(
      decideMigration(state({ compat: false, record: record({ cleanedUpAt: '2026-11-02' }) }))
    ).toEqual({ kind: 'none' });
  });

  it('does nothing for a completed migration with the compatibility mode on', () => {
    expect(decideMigration(state({ record: record() }))).toEqual({ kind: 'none' });
  });

  it('resumes an in-progress migration on the same attempt', () => {
    expect(
      decideMigration(state({ record: record({ status: 'in-progress', attempt: 3 }) }))
    ).toEqual({ kind: 'migrate', attempt: 3 });
  });

  it('refuses when eu_users already holds users', () => {
    const decision = decideMigration(
      state({ upUsersTable: true, euUsersRows: 2, config: { fromUsersPermissions: true } })
    );

    expect(refusal(decision)).toContain('eu_users');
  });

  it('migrates attempt one when asked and eu_users is empty or absent', () => {
    const asked = { upUsersTable: true, config: { fromUsersPermissions: true } };

    expect(decideMigration(state({ ...asked, euUsersRows: 0 }))).toEqual({
      kind: 'migrate',
      attempt: 1,
    });
    expect(decideMigration(state(asked))).toEqual({ kind: 'migrate', attempt: 1 });
  });

  it('refuses when users-permissions tables exist and the migration was not asked for', () => {
    expect(refusal(decideMigration(state({ upUsersTable: true })))).toContain(
      'migration.fromUsersPermissions'
    );
  });

  it('does nothing when the migration is switched off', () => {
    expect(
      decideMigration(state({ upUsersTable: true, config: { fromUsersPermissions: false } }))
    ).toEqual({ kind: 'none' });
  });

  it('does nothing when there is nothing to migrate', () => {
    expect(decideMigration(state())).toEqual({ kind: 'none' });
  });
});
