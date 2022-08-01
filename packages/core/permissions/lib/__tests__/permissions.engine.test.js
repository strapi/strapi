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
   *   registerFunction: [jest.Mock<Function, [import('../../').Permission]>]
   * }}
   */
  const buildEngineWithAbility = async ({
    permissions,
    engineProviders = providers,
    engineHooks,
  }) => {
    let registerFunctions = [];
    const createRegisterFunction = jest.fn((can, options) => {
      const registerFunction = jest.fn(engine.createRegisterFunction(can, options));
      registerFunctions.push(registerFunction);
      return registerFunction;
    });
    const engine = buildEngineWithHooks({ providers: engineProviders }, engineHooks);
    const ability = await engine.generateAbility(permissions, { createRegisterFunction });
    return {
      engine,
      ability,
      createRegisterFunction,
      registerFunctions,
    };
  };

  it('registers actions', async () => {
    const permissions = [{ action: 'read' }, { action: 'write' }];
    const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility({
      permissions,
    });

    expect(ability.can('read')).toBeTruthy();
    expect(ability.can('i_dont_exist')).toBeFalsy();

    expect(createRegisterFunction).toBeCalledTimes(2);
    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
    expect(registerFunctions[1]).toBeCalledWith(permissions[1]);
  });

  it('registers action with null subject', async () => {
    const permissions = [{ action: 'read', subject: null }];
    const { ability, registerFunctions } = await buildEngineWithAbility({ permissions });
    expect(ability.can('read')).toBeTruthy();
    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
  });

  it('registers action with subject', async () => {
    const permissions = [{ action: 'read', subject: 'article' }];
    const { ability, registerFunctions } = await buildEngineWithAbility({ permissions });
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', subject('article', { id: 123 }))).toBeTruthy();
    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
  });

  it('registers action with subject and properties', async () => {
    const permissions = [{ action: 'read', subject: 'article', properties: { fields: ['title'] } }];
    const { ability, registerFunctions } = await buildEngineWithAbility({ permissions });
    expect(ability.can('read')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'article', 'title')).toBeTruthy();
    expect(ability.can('read', 'article', 'name')).toBeFalsy();

    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
  });

  describe('conditions', () => {
    it('does not register action when conditions not met', async () => {
      const permissions = [
        {
          action: 'read',
          subject: 'article',
          properties: { fields: ['title'] },
          conditions: [deniedCondition],
        },
      ];
      const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility({
        permissions,
      });

      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('read', 'user')).toBeFalsy();
      expect(ability.can('read', 'article', 'name')).toBeFalsy();

      expect(ability.can('read', 'article')).toBeFalsy();
      expect(ability.can('read', 'article', 'title')).toBeFalsy();

      expect(createRegisterFunction).toBeCalledTimes(1);
      expect(registerFunctions[0]).toBeCalledTimes(0);
    });

    it('register action when conditions are met', async () => {
      const permissions = [
        {
          action: 'read',
          subject: 'article',
          properties: { fields: ['title'] },
          conditions: [allowedCondition],
        },
      ];
      const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility({
        permissions,
      });

      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('read', 'user')).toBeFalsy();
      expect(ability.can('read', 'article', 'name')).toBeFalsy();

      expect(ability.can('read', 'article')).toBeTruthy();
      expect(ability.can('read', 'article', 'title')).toBeTruthy();

      expect(createRegisterFunction).toBeCalledTimes(1);
      expect(registerFunctions[0]).toBeCalledWith({
        ...permissions[0],
        conditions: undefined,
      });
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
      const permissions = [{ action: 'read', subject: 'article' }];
      const replacePermission = { action: 'view', subject: 'article' };
      const { ability, registerFunctions } = await buildEngineWithAbility({
        permissions,
        engineHooks: [
          {
            name: 'format.permission',
            // eslint-disable-next-line no-unused-vars
            fn(permission) {
              return replacePermission;
            },
          },
        ],
      });

      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('view', 'article')).toBeTruthy();
      expect(registerFunctions[0]).toBeCalledWith(replacePermission);
    });

    // TODO: rewrite with mocks
    it('validate hooks are called at the right time', async () => {
      const permissions = [{ action: 'update' }, { action: 'delete' }, { action: 'view' }];
      const { ability } = await buildEngineWithAbility({
        permissions,
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
      const permissions = [{ action: 'read', subject: 'article' }];
      const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility({
        permissions,
        engineHooks: [
          { name: 'before-format::validate.permission', fn: generateInvalidateActionHook('read') },
        ],
      });
      expect(ability.can('read', 'article')).toBeFalsy();
      expect(ability.can('read', 'user')).toBeFalsy();
      expect(createRegisterFunction).toBeCalledTimes(1);
      expect(registerFunctions[0]).toBeCalledTimes(0);
    });
  });

  it('post-format::validate.permission can prevent action register', async () => {
    const permissions = [{ action: 'read', subject: 'article' }];
    const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility({
      permissions,
      engineHooks: [
        { name: 'post-format::validate.permission', fn: generateInvalidateActionHook('read') },
      ],
    });
    expect(ability.can('read', 'article')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(createRegisterFunction).toBeCalledTimes(1);
    expect(registerFunctions[0]).toBeCalledTimes(0);
  });

  it('before-evaluate and before-register are called in the right order', async () => {
    let called = '';
    const beforeEvaluateFn = jest.fn(() => {
      called = 'beforeEvaluate';
    });
    const beforeRegisterFn = jest.fn(() => {
      expect(called).toEqual('beforeEvaluate');
      called = 'beforeRegister';
    });
    const permissions = [{ action: 'read', subject: 'article' }];
    await buildEngineWithAbility({
      permissions,
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
    expect(beforeEvaluateFn).toBeCalledWith({
      addCondition: expect.any(Function),
      permission: permissions[0],
    });
    expect(beforeRegisterFn).toBeCalledTimes(1);
    expect(beforeRegisterFn).toBeCalledWith({
      condition: expect.any(Object),
      createRegisterFunction: expect.anything(),
      permission: permissions[0],
    });
    expect(called).toEqual('beforeRegister');
  });
});
