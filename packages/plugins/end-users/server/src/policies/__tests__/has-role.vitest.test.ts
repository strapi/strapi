import { describe, expect, it } from 'vitest';

import policies from '../index';
import { hasRole } from '../has-role';
import { NOT_SIGNED_IN, endUser, refusal, requestOf, strapiWith } from './end-user-policies';

const EDITORS = { documentId: 'role-editors', name: 'Editors', type: 'custom' };
const REVIEWERS = { documentId: 'role-reviewers', name: 'Reviewers', type: 'custom' };

/** A signed-in user holding these roles */
const holding = (...roles: Array<typeof EDITORS>) => requestOf(endUser({ roles }));

const run = (request: unknown, config: unknown) => hasRole.handler(request, config, strapiWith());

describe('plugin::end-users.has-role', () => {
  it('is the plugin`s policy of that name', () => {
    expect(policies['has-role']).toBe(hasRole);
    expect(hasRole.name).toBe('plugin::end-users.has-role');
  });

  it('passes a user holding one of the roles, by name or by documentId', () => {
    expect(run(holding(EDITORS), { roles: ['Editors'] })).toBe(true);
    expect(run(holding(EDITORS), { roles: ['role-editors'] })).toBe(true);
    expect(run(holding(EDITORS), { roles: ['Reviewers', 'Editors'], mode: 'any' })).toBe(true);
  });

  it('refuses a user holding none of them, without naming the roles', () => {
    expect(() => run(holding(REVIEWERS), { roles: ['Editors'] })).toThrow(refusal('ROLE_REQUIRED'));
    expect(() => run(holding(REVIEWERS), { roles: ['Editors'] })).toThrow(
      'Your roles do not allow this.'
    );
    // A user with no role at all holds none of them
    expect(() => run(holding(), { roles: ['Editors'] })).toThrow(refusal('ROLE_REQUIRED'));
  });

  it('matches a name exactly: another spelling, or a role`s type, is not its name', () => {
    expect(() => run(holding(EDITORS), { roles: ['editors'] })).toThrow(refusal('ROLE_REQUIRED'));
    expect(() => run(holding(EDITORS), { roles: ['custom'] })).toThrow(refusal('ROLE_REQUIRED'));
  });

  it('needs every role with mode all', () => {
    const config = { roles: ['Editors', 'role-reviewers'], mode: 'all' };

    expect(run(holding(EDITORS, REVIEWERS), config)).toBe(true);
    expect(() => run(holding(EDITORS), config)).toThrow(refusal('ROLE_REQUIRED'));
  });

  it.each(Object.entries(NOT_SIGNED_IN))('refuses a caller with %s', (_caller, request) => {
    expect(() => run(request, { roles: ['Editors'] })).toThrow(refusal('AUTHENTICATION_REQUIRED'));
  });

  it('refuses a config with no role, or one it cannot read, when Strapi resolves the route', () => {
    const { validator } = hasRole;

    expect(() => validator({ roles: ['Editors'] })).not.toThrow();
    expect(() => validator({ roles: ['Editors'], mode: 'all' })).not.toThrow();

    for (const bad of [
      undefined,
      {},
      { roles: [] },
      { roles: 'Editors' },
      { roles: [''] },
      { roles: [1] },
      { roles: ['Editors'], mode: 'some' },
      // A misspelled key would otherwise be dropped without a word
      { roles: ['Editors'], modes: 'all' },
    ]) {
      expect(() => validator(bad), JSON.stringify(bad)).toThrow(
        'Invalid config passed to "plugin::end-users.has-role" policy.'
      );
    }
  });

  it('fails with a configuration error, never a pass, when the handler is given no role', () => {
    // `all` of nothing would be true: the handler checks the config itself, for a caller that
    // never went through the registry
    for (const bad of [{ roles: [], mode: 'all' }, {}, undefined]) {
      expect(() => run(holding(EDITORS), bad)).toThrow(
        'Invalid config passed to "plugin::end-users.has-role" policy.'
      );
      expect(() => run(NOT_SIGNED_IN.public, bad)).toThrow(
        'Invalid config passed to "plugin::end-users.has-role" policy.'
      );
    }
  });
});
