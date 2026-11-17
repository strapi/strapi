import { describe, expect, it } from 'vitest';

import { CONDITION_ACTIONS, ROLE_ACTIONS } from '../../admin-actions';
import policies from '../index';
import { hasAnyAdminPermission } from '../has-any-admin-permission';

const config = { actions: [ROLE_ACTIONS.read, CONDITION_ACTIONS.read] };

/** The context of a request an admin made: `userAbility` is what the admin's role grants */
const ctxOf = (granted: string[]) => ({
  state: { userAbility: { can: (action: string) => granted.includes(action) } },
});

describe('plugin::end-users.has-any-admin-permission', () => {
  it('is the plugin`s policy of that name', () => {
    expect(policies['has-any-admin-permission']).toBe(hasAnyAdminPermission);
    expect(hasAnyAdminPermission.name).toBe('plugin::end-users.has-any-admin-permission');
  });

  it('passes with any one of the actions and refuses with none', () => {
    const { handler } = hasAnyAdminPermission;

    expect(handler(ctxOf([CONDITION_ACTIONS.read]), config)).toBe(true);
    expect(handler(ctxOf([ROLE_ACTIONS.read]), config)).toBe(true);
    expect(handler(ctxOf([ROLE_ACTIONS.read, CONDITION_ACTIONS.read]), config)).toBe(true);

    expect(handler(ctxOf([]), config)).toBe(false);
    // An action of the plugin that the route does not list is not one of them
    expect(handler(ctxOf([ROLE_ACTIONS.update, CONDITION_ACTIONS.update]), config)).toBe(false);
  });

  it('refuses a request that carries no ability', () => {
    expect(hasAnyAdminPermission.handler({ state: {} }, config)).toBe(false);
  });

  it('refuses a config with no list of actions, at boot', () => {
    const { validator } = hasAnyAdminPermission;

    expect(() => validator(config)).not.toThrow();

    for (const bad of [undefined, {}, { actions: [] }, { actions: 'a.b.c' }, { actions: [1] }]) {
      expect(() => validator(bad), JSON.stringify(bad)).toThrow(
        'Invalid config passed to "plugin::end-users.has-any-admin-permission" policy.'
      );
    }
  });
});
