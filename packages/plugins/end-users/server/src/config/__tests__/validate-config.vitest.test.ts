import { describe, expect, it } from 'vitest';

import { validateConfig } from '../validate-config';

const check = (migration: unknown) => () => validateConfig({ migration }, {});

describe('validateConfig: migration', () => {
  it('migration.fromUsersPermissions is a boolean, "check", null or absent (both mean unset)', () => {
    expect(check({ fromUsersPermissions: true })).not.toThrow();
    expect(check({ fromUsersPermissions: false })).not.toThrow();
    expect(check({ fromUsersPermissions: 'check' })).not.toThrow();
    expect(check({ fromUsersPermissions: null })).not.toThrow();
    expect(check({})).not.toThrow();
    expect(() => validateConfig({}, {})).not.toThrow();
    expect(check({ fromUsersPermissions: 'yes' })).toThrow(/migration\.fromUsersPermissions/);
    expect(check({ fromUsersPermissions: 1 })).toThrow(/migration\.fromUsersPermissions/);
  });

  it('migration.duplicates is "keep-oldest" or "abort"', () => {
    expect(check({ duplicates: 'keep-oldest' })).not.toThrow();
    expect(check({ duplicates: 'abort' })).not.toThrow();
    expect(check({ duplicates: 'merge' })).toThrow(/migration\.duplicates/);
  });

  it('migration.registrationFields is at most 100 strings of at most 255 characters', () => {
    expect(check({ registrationFields: null })).not.toThrow();
    expect(check({ registrationFields: ['company', 'age'] })).not.toThrow();
    expect(check({ registrationFields: Array(100).fill('a') })).not.toThrow();
    expect(check({ registrationFields: ['a'.repeat(255)] })).not.toThrow();
    expect(check({ registrationFields: Array(101).fill('a') })).toThrow(
      /migration\.registrationFields/
    );
    expect(check({ registrationFields: ['a'.repeat(256)] })).toThrow(
      /migration\.registrationFields/
    );
    expect(check({ registrationFields: [1] })).toThrow(/migration\.registrationFields/);
    expect(check({ registrationFields: 'company' })).toThrow(/migration\.registrationFields/);
  });

  it('migration.rollback is a boolean', () => {
    expect(check({ rollback: true })).not.toThrow();
    expect(check({ rollback: 'yes' })).toThrow(/migration\.rollback/);
  });

  it('migration itself is an object', () => {
    expect(check('check')).toThrow(/migration/);
  });
});
