'use strict';

const _ = require('lodash');
const { subject } = require('@casl/ability');
const permissions = require('../');

describe('Permissions Engine', () => {
  const allowedCondition = 'plugin::test.isAuthor';
  const deniedCondition = 'plugin::test.isAdmin';

  const conditions = [
    {
      name: 'plugin::test.isAuthor',
      category: 'default',
      async handler() {
        return new Promise(resolve => resolve(true));
      },
    },
    {
      name: 'plugin::test.isAdmin',
      category: 'default',
      async handler() {
        return new Promise(resolve => resolve(false));
      },
    },
    {
      name: 'hasId125',
      category: 'default',
      async handler() {
        return { id: 125 };
      },
    },
  ];

  const providers = {
    condition: {
      get(condition) {
        const c = conditions.find(c => c.name === condition);
        if (c) return c;
        return {
          async handler() {
            return true;
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
   *   ability: Ability,
   *   createRegisterFunction: jest.Mock<jest.Mock<any, any[]>, [can?: any, options?: any]>,
   *   registerFunction: [jest.Mock<Function, [import('../../').Permission]>]
   * }}
   */
  const buildEngineWithAbility = async ({
    permissions,
    engineProviders = providers,
    engineHooks,
    abilityOptions,
  }) => {
    let registerFunctions = [];
    const engine = buildEngineWithHooks({ providers: engineProviders }, engineHooks);
    const engineCrf = engine.createRegisterFunction;
    const createRegisterFunction = jest
      .spyOn(engine, 'createRegisterFunction')
      .mockImplementation((can, options) => {
        const registerFunction = jest.fn(engineCrf(can, options));
        registerFunctions.push(registerFunction);
        return registerFunction;
      });

    const ability = await engine.generateAbility(permissions, abilityOptions);
    return {
      engine,
      ability,
      createRegisterFunction,
      registerFunctions,
    };
  };

  /**
   * map an array of permissions to expected ability object fields
   *
   * @param {permissions} permissions
   *
   * @return {{
   *   action: string,
   *   subject: string | object,
   *   fields: [string]
   * }}
   */
  const expectedAbilityRules = permissions => {
    return permissions.map(permission => {
      const rules = _.omit(permission, ['properties', 'conditions']);

      if (permission.properties && permission.properties.fields) {
        rules.fields = permission.properties.fields;
      }
      if (!permission.subject) {
        rules.subject = 'all';
      }

      return rules;
    });
  };

  beforeEach(async () => {
    global.strapi = {
      isLoaded: false,
    };
  });

  it('registers action without subject', async () => {
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

  it(`registers action without subject with subject 'all'`, async () => {
    const permissions = [
      { action: 'read', subject: null },
      { action: 'read', subject: undefined },
    ];
    const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility({
      permissions,
    });

    expect(ability.can('read')).toBeTruthy();

    expect(createRegisterFunction).toBeCalledTimes(2);
    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
    expect(registerFunctions[1]).toBeCalledWith(permissions[1]);

    expect(ability.rules).toMatchObject(expectedAbilityRules(permissions));
  });

  it('registers action with subject string', async () => {
    const permissions = [{ action: 'read', subject: 'article' }];
    const { ability, registerFunctions } = await buildEngineWithAbility({ permissions });
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', subject('article', { id: 123 }))).toBeTruthy();
    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
  });

  it('registers action with subject object', async () => {
    const permissions = [
      {
        action: 'read',
        subject: 'article',
        properties: { fields: ['**'] },
        conditions: ['hasId125'],
      },
    ];

    const { ability, registerFunctions } = await buildEngineWithAbility({
      permissions,
    });

    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'article', 'name')).toBeTruthy();
    expect(ability.can('read', subject('article', { id: 123 }))).toBeFalsy();
    expect(ability.can('read', subject('article', { id: 125 }))).toBeTruthy();
    expect(ability.can('read', subject('user', { id: 125 }))).toBeFalsy();

    expect(registerFunctions[0]).toBeCalledWith({
      ..._.omit(permissions[0], ['conditions']),
      condition: {
        $and: [
          {
            $or: [
              {
                id: 125,
              },
            ],
          },
        ],
      },
    });
  });

  it('registers action with subject and properties', async () => {
    const permissions = [{ action: 'read', subject: 'article', properties: { fields: ['title'] } }];
    const { ability, registerFunctions } = await buildEngineWithAbility({ permissions });
    expect(ability.can('read')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'article', 'title')).toBeTruthy();
    expect(ability.can('read', 'article', 'title.nested')).toBeFalsy();
    expect(ability.can('read', 'article', 'name')).toBeFalsy();

    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
  });

  it('throws on empty fields array', async () => {
    const permissions = [{ action: 'read', subject: 'article', properties: { fields: [] } }];
    await expect(buildEngineWithAbility({ permissions })).rejects.toThrow(
      // from casl/ability
      '`rawRule.fields` cannot be an empty array. https://bit.ly/390miLa'
    );
  });

  it('handles nested properties correctly', async () => {
    const permissions = [
      { action: 'read', subject: 'article', properties: { fields: ['**'] } },
      { action: 'post', subject: 'article', properties: { fields: ['*'] } },
    ];
    const { ability, registerFunctions } = await buildEngineWithAbility({ permissions });

    expect(ability.rules).toMatchObject(expectedAbilityRules(permissions));

    expect(ability.can('read')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'article', 'title')).toBeTruthy();
    expect(ability.can('read', 'article', 'title.nested')).toBeTruthy();
    expect(ability.can('read', 'article', 'name')).toBeTruthy();
    expect(ability.can('read', 'article', 'name.nested')).toBeTruthy();

    expect(ability.can('post', 'article', 'title')).toBeTruthy();
    expect(ability.can('post', 'article', 'title.nested')).toBeFalsy();
    expect(ability.can('post', 'article', 'name')).toBeTruthy();
    expect(ability.can('post', 'article', 'name.nested')).toBeFalsy();

    expect(registerFunctions[0]).toBeCalledWith(permissions[0]);
    expect(registerFunctions[1]).toBeCalledWith(permissions[1]);
  });

  it(`doesn't register action when conditions not met`, async () => {
    const permissions = [
      {
        action: 'read',
        subject: 'article',
        properties: { fields: ['title'] },
        conditions: [deniedCondition],
      },
    ];
    const expectedPermissions = [];

    const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility({
      permissions,
    });

    expect(ability.rules).toMatchObject(expectedAbilityRules(expectedPermissions));

    expect(ability.can('read')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(ability.can('read', 'article', 'name')).toBeFalsy();

    expect(ability.can('read', 'article')).toBeFalsy();
    expect(ability.can('read', 'article', 'title')).toBeFalsy();

    expect(createRegisterFunction).toBeCalledTimes(1);
    expect(registerFunctions[0]).toBeCalledTimes(0);
  });

  it('registers an action when conditions are met', async () => {
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

    expect(ability.rules).toMatchObject(expectedAbilityRules(permissions));

    expect(ability.can('read')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(ability.can('read', 'article', 'name')).toBeFalsy();

    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'article', 'title')).toBeTruthy();

    expect(createRegisterFunction).toBeCalledTimes(1);
    expect(registerFunctions[0]).toBeCalledWith(_.omit(permissions[0], ['conditions']));
  });

  describe('hooks', () => {
    describe('format.permission', () => {
      it('modifies permissions correctly', async () => {
        const permissions = [{ action: 'read', subject: 'article' }];
        const newPermissions = [{ action: 'view', subject: 'article' }];
        const { ability, registerFunctions } = await buildEngineWithAbility({
          permissions,
          engineHooks: [
            {
              name: 'format.permission',
              // eslint-disable-next-line no-unused-vars
              fn(permission) {
                return newPermissions[0];
              },
            },
          ],
        });

        expect(ability.rules).toMatchObject(expectedAbilityRules(newPermissions));

        expect(ability.can('read')).toBeFalsy();
        expect(ability.can('read')).toBeFalsy();
        expect(ability.can('view', 'article')).toBeTruthy();
        expect(registerFunctions[0]).toBeCalledWith(newPermissions[0]);
      });
    });

    describe('before-format::validate.permission', () => {
      it('before-format::validate.permission can prevent action register', async () => {
        const permissions = [{ action: 'read', subject: 'article' }];
        const newPermissions = [];
        const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility(
          {
            permissions,
            engineHooks: [
              {
                name: 'before-format::validate.permission',
                fn: generateInvalidateActionHook('read'),
              },
            ],
          }
        );

        expect(ability.rules).toMatchObject(expectedAbilityRules(newPermissions));

        expect(ability.can('read', 'article')).toBeFalsy();
        expect(ability.can('read', 'user')).toBeFalsy();
        expect(createRegisterFunction).toBeCalledTimes(1);
        expect(registerFunctions[0]).toBeCalledTimes(0);
      });
    });

    describe('post-format::validate.permission', () => {
      it('can prevent action register', async () => {
        const permissions = [
          { action: 'read', subject: 'article' },
          { action: 'read', subject: 'user' },
          { action: 'write', subject: 'article' },
        ];
        const newPermissions = [{ action: 'write', subject: 'article' }];
        const { ability, registerFunctions, createRegisterFunction } = await buildEngineWithAbility(
          {
            permissions,
            engineHooks: [
              {
                name: 'post-format::validate.permission',
                fn: generateInvalidateActionHook('read'),
              },
            ],
          }
        );

        expect(ability.rules).toMatchObject(expectedAbilityRules(newPermissions));

        expect(ability.can('read', 'article')).toBeFalsy();
        expect(ability.can('read', 'user')).toBeFalsy();
        expect(ability.can('write', 'article')).toBeTruthy();
        expect(createRegisterFunction).toBeCalledTimes(3);
        expect(registerFunctions[0]).toBeCalledTimes(0);
        expect(registerFunctions[1]).toBeCalledTimes(0);
        expect(registerFunctions[2]).toBeCalledTimes(1);
      });
    });

    describe('*validate* hooks', () => {
      it('execute in the correct order', async () => {
        const permissions = [{ action: 'update' }, { action: 'delete' }, { action: 'view' }];
        const newPermissions = [{ action: 'modify' }, { action: 'remove' }];

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

        expect(ability.rules).toMatchObject(expectedAbilityRules(newPermissions));

        expect(ability.can('update')).toBeFalsy();
        expect(ability.can('modify')).toBeTruthy();
        expect(ability.can('delete')).toBeFalsy();
        expect(ability.can('remove')).toBeTruthy();
        expect(ability.can('view')).toBeFalsy();
      });
    });
  });

  describe('before-* hooks', () => {
    it('execute in the correct order', async () => {
      let called = '';
      const beforeEvaluateFn = jest.fn(() => {
        called = 'beforeEvaluate';
      });
      const beforeRegisterFn = jest.fn(() => {
        expect(called).toEqual('beforeEvaluate');
        called = 'beforeRegister';
      });
      const permissions = [{ action: 'read', subject: 'article', conditions: [allowedCondition] }];
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
        permission: { ...permissions[0], conditions: undefined, properties: undefined },
      });
      expect(called).toEqual('beforeRegister');
    });
  });
});
