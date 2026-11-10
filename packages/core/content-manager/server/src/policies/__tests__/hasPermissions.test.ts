import type { Context } from 'koa';

import hasPermissions from '../hasPermissions';

const model = 'api::article.article';

const createContext = (granted: string[]) => {
  const userAbility = {
    can: jest.fn(
      (action: string, subject: string) => subject === model && granted.includes(action)
    ),
  };

  return { ctx: { state: { userAbility }, params: { model } } as unknown as Context, userAbility };
};

describe('hasPermissions policy', () => {
  test('authorizes when every configured action is granted on the model', () => {
    const { ctx } = createContext(['read', 'update']);

    expect(hasPermissions.handler(ctx, { actions: ['read', 'update'] })).toBe(true);
  });

  test('rejects when one configured action is not granted', () => {
    const { ctx } = createContext(['read']);

    expect(hasPermissions.handler(ctx, { actions: ['read', 'update'] })).toBe(false);
  });

  test('with hasAtLeastOne, authorizes when one configured action is granted', () => {
    const { ctx } = createContext(['update']);

    expect(hasPermissions.handler(ctx, { actions: ['read', 'update'], hasAtLeastOne: true })).toBe(
      true
    );
  });

  test('with hasAtLeastOne, rejects when no configured action is granted', () => {
    const { ctx } = createContext([]);

    expect(hasPermissions.handler(ctx, { actions: ['read'], hasAtLeastOne: true })).toBe(false);
  });

  test('authorizes without checking the ability when no config is given', () => {
    const { ctx, userAbility } = createContext([]);

    expect(hasPermissions.handler(ctx)).toBe(true);
    expect(userAbility.can).not.toHaveBeenCalled();
  });

  test('rejects an invalid config', () => {
    expect(() => hasPermissions.validator({ actions: 'read' })).toThrow(
      'Invalid config passed to "plugin::content-manager.hasPermissions" policy.'
    );
  });
});
