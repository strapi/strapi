'use strict';

const permissions = require('../');

describe('Permissions Engine', () => {
  const providers = {
    action: { get: jest.fn() },
    condition: { values: jest.fn(() => []) },
  };

  // const generateInvalidateActionHook = action => {
  //   return params => {
  //     if (params.action === action) return false;
  //   };
  // };

  const buildEngine = (engineProviders = providers, engineHooks = []) => {
    const engine = permissions.engine.new(engineProviders);
    // jest.spyOn(engine.generateAbility, 'register');
    engineHooks.forEach(({ hookName, hookFn }) => {
      engine.on(hookName, hookFn);
    });
    return engine;
  };

  const buildEngineWithAbility = async ({ permissions, engineProviders, engineHooks }) => {
    const engine = buildEngine(engineProviders, engineHooks);
    const ability = await engine.generateAbility(permissions);
    return { engine, ability };
  };

  describe('registers', () => {
    beforeEach(() => {
      //
    });

    it('action (with nothing else)', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [{ action: 'read' }],
      });
      expect(ability.can('read')).toBeTruthy();
      expect(ability.can('i_dont_exist')).toBeFalsy();
      // expect(permissions.engine.new).toBeCalledTimes(1);
    });

    it('action with subject', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [{ action: 'read', subject: 'article' }],
      });
      expect(ability.can('read', 'article')).toBeTruthy();
      expect(ability.can('read', 'user')).toBeFalsy();
    });

    it('action with null subject', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [{ action: 'read', subject: null, properties: {} }],
      });
      expect(ability.can('read')).toBeTruthy();
    });
  });
});
