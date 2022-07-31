'use strict';

const { subject } = require('@casl/ability');

const permissions = require('../');

describe('Permissions Engine', () => {
  const allowedCondition = 'isAuthor';
  const deniedCondition = 'isAdmin';

  const providers = {
    action: {
      get(params) {
        console.log('action', params);
      },
    },
    condition: {
      // TODO: mock these
      get(condition) {
        return {
          name: condition,
          async handler(params) {
            if (params.permission.conditions.includes(allowedCondition)) return true;
            return false;
          },
        };
      },
    },
  };

  /**
   * Create an engine hook function that rejects a specific action
   *
   * @param {string} action
   *
   * @return {(params) => boolean | undefined)}
   */
  const generateInvalidateActionHook = action => {
    return params => {
      if (params.permission.action === action) {
        return false;
      }
    };
  };

  /**
   * build an engine and add all given hooks
   *
   * @param {PermissionEngineParams} params
   * @param {string} action
   *
   * @return {PermissionEngine}
   */
  const buildEngineWithHooks = (params = { providers }, engineHooks = []) => {
    const engine = permissions.engine.new(params);
    engineHooks.forEach(({ name, fn }) => {
      engine.on(name, fn);
    });
    return engine;
  };

  /**
   * build an engine, add all given hooks, and generate an ability
   *
   * @param {PermissionEngineParams} params
   * @param {string} action
   *
   * @return {{
   *   engine: PermissionEngine,
   *   ability: string,
   *   createRegisterFunction: jest.Mock<jest.Mock<any, any[]>, [can?: any, options?: any]>,
   *   registerFunction: jest.Mock<Function, [import('../../').Permission]>
   * }}
   */
  const buildEngineWithAbility = async ({
    permissions,
    engineProviders = providers,
    engineHooks,
  }) => {
    let registerFunction;
    const createRegisterFunction = jest.fn((can, options) => {
      registerFunction = jest.fn(engine.createRegisterFunction(can, options));
      return registerFunction;
    });
    const engine = buildEngineWithHooks({ providers: engineProviders }, engineHooks);
    const ability = await engine.generateAbility(permissions, { createRegisterFunction });
    return {
      engine,
      ability,
      createRegisterFunction,
      registerFunction,
    };
  };

  it('registers action', async () => {
    const { ability, registerFunction, createRegisterFunction } = await buildEngineWithAbility({
      permissions: [{ action: 'read' }],
    });

    expect(ability.can('read')).toBeTruthy();
    expect(ability.can('i_dont_exist')).toBeFalsy();

    expect(createRegisterFunction).toBeCalledTimes(1);
    expect(registerFunction).nthCalledWith(1, { action: 'read' });
  });

  it('registers action with null subject', async () => {
    const { ability, registerFunction } = await buildEngineWithAbility({
      permissions: [{ action: 'read', subject: null }],
    });
    expect(ability.can('read')).toBeTruthy();
    expect(registerFunction).nthCalledWith(1, { action: 'read', subject: null });
  });

  it('registers action with subject', async () => {
    const { ability } = await buildEngineWithAbility({
      permissions: [{ action: 'read', subject: 'article' }],
    });
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', subject('article', { id: 123 }))).toBeTruthy();
  });

  it('registers action with subject and properties', async () => {
    const { ability } = await buildEngineWithAbility({
      permissions: [{ action: 'read', subject: 'article', properties: { fields: ['title'] } }],
    });
    expect(ability.can('read')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'article', 'title')).toBeTruthy();
    expect(ability.can('read', 'article', 'name')).toBeFalsy();
  });

  describe('conditions', () => {
    it('does not register action when conditions not met', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [
          {
            action: 'read',
            subject: 'article',
            properties: { fields: ['title'] },
            conditions: [deniedCondition],
          },
        ],
      });

      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('read', 'user')).toBeFalsy();
      expect(ability.can('read', 'article', 'name')).toBeFalsy();

      expect(ability.can('read', 'article')).toBeFalsy();
      expect(ability.can('read', 'article', 'title')).toBeFalsy();
    });

    it('register action when conditions are met', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [
          {
            action: 'read',
            subject: 'article',
            properties: { fields: ['title'] },
            conditions: [allowedCondition],
          },
        ],
      });

      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('read', 'user')).toBeFalsy();
      expect(ability.can('read', 'article', 'name')).toBeFalsy();

      expect(ability.can('read', 'article')).toBeTruthy();
      expect(ability.can('read', 'article', 'title')).toBeTruthy();
    });

    // it.only('registers action when conditions are met with subject', async () => {
    //   const { ability } = await buildEngineWithAbility({
    //     permissions: [{ action: 'read', subject: 'article', conditions: ['isOwner'] }],
    //   });
    //   expect(ability.can('read', 'article')).toBeTruthy();
    //   expect(ability.can('read', subject('article', { id: 123 }))).toBeTruthy();
    // });
  });

  // TODO: test all hooks are called at the right time and bail correctly
  // 'before-format::validate.permission': hooks.createAsyncBailHook(),
  // 'format.permission': hooks.createAsyncSeriesWaterfallHook(),
  // 'post-format::validate.permission': hooks.createAsyncBailHook(),
  // 'before-evaluate.permission': hooks.createAsyncSeriesHook(),
  // 'before-register.permission': hooks.createAsyncSeriesHook(),
  describe('hooks', () => {
    it('format.permission can modify permissions', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [{ action: 'read', subject: 'article' }],
        engineHooks: [
          {
            name: 'format.permission',
            fn(permission) {
              return {
                ...permission,
                action: 'view',
              };
            },
          },
        ],
      });

      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('view', 'article')).toBeTruthy();
    });

    // TODO: rewrite with mocks
    it('validate hooks are called at the right time', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [{ action: 'update' }, { action: 'delete' }, { action: 'view' }],
        engineHooks: [
          {
            name: 'format.permission',
            fn(permission) {
              if (permission.action === 'update') {
                return {
                  ...permission,
                  action: 'modify',
                };
              }
              if (permission.action === 'delete') {
                return {
                  ...permission,
                  action: 'remove',
                };
              }
              if (permission.action === 'view') {
                return {
                  ...permission,
                  action: 'read',
                };
              }
              return permission;
            },
          },
          {
            name: 'before-format::validate.permission',
            fn: generateInvalidateActionHook('modify'),
          },
          {
            name: 'before-format::validate.permission',
            fn: generateInvalidateActionHook('view'),
          },
          {
            name: 'post-format::validate.permission',
            fn: generateInvalidateActionHook('update'),
          },
        ],
      });

      expect(ability.can('update')).toBeFalsy();
      expect(ability.can('modify')).toBeTruthy();
      expect(ability.can('delete')).toBeFalsy();
      expect(ability.can('remove')).toBeTruthy();
      expect(ability.can('view')).toBeFalsy();
    });

    it('before-format::validate.permission can prevent action register', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [{ action: 'read', subject: 'article' }],
        engineHooks: [
          { name: 'before-format::validate.permission', fn: generateInvalidateActionHook('read') },
        ],
      });
      expect(ability.can('read', 'article')).toBeFalsy();
      expect(ability.can('read', 'user')).toBeFalsy();
    });
  });

  it('post-format::validate.permission can prevent action register', async () => {
    const { ability } = await buildEngineWithAbility({
      permissions: [{ action: 'read', subject: 'article' }],
      engineHooks: [
        { name: 'post-format::validate.permission', fn: generateInvalidateActionHook('read') },
      ],
    });
    expect(ability.can('read', 'article')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
  });

  // TODO: mocks
  it('before-evaluate and before-register are called in the right order', async () => {
    let called = '';
    const beforeEvaluateFn = jest.fn(() => {
      called = 'beforeEvaluate';
    });
    const beforeRegisterFn = jest.fn(() => {
      expect(called).toEqual('beforeEvaluate');
      called = 'beforeRegister';
    });
    await buildEngineWithAbility({
      permissions: [{ action: 'read', subject: 'article' }],
      engineHooks: [
        {
          name: 'before-evaluate.permission',
          fn: beforeEvaluateFn,
        },
        {
          name: 'before-register.permission',
          fn: beforeRegisterFn,
        },
      ],
    });

    expect(beforeEvaluateFn).toBeCalledTimes(1);
    expect(beforeEvaluateFn).toBeCalledTimes(1);
    expect(called).toEqual('beforeRegister');
  });
});
