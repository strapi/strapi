'use strict';

const permissions = require('../');

// TODO: test abilityBuilderFactory
// TODO: test generateAbility with options
describe('Permissions Engine', () => {
  const providers = {
    action: { get: jest.fn() },
    condition: {
      // TODO: mock these once I figure out how they actually work
      get(condition) {
        console.log('get conditions', JSON.stringify(condition));
      },
      values(condition) {
        console.log('values', condition);
      },
      register(condition) {
        console.log('register', condition);
      },
    },
  };

  const generateInvalidateActionHook = action => {
    return params => {
      if (params.permission.action === action) {
        return false;
      }
    };
  };

  const buildEngine = (engineProviders = providers, engineHooks = []) => {
    const engine = permissions.engine.new({ providers: engineProviders });
    engineHooks.forEach(({ name, fn }) => {
      engine.on(name, fn);
    });
    return engine;
  };

  const buildEngineWithAbility = async ({ permissions, engineProviders, engineHooks }) => {
    const engine = buildEngine(engineProviders, engineHooks);
    const ability = await engine.generateAbility(permissions);
    return { engine, ability };
  };

  beforeEach(() => {
    //
  });

  it('register action', async () => {
    const { ability } = await buildEngineWithAbility({
      permissions: [{ action: 'read' }],
    });
    expect(ability.can('read')).toBeTruthy();
    expect(ability.can('i_dont_exist')).toBeFalsy();
  });

  it('registers action with null subject', async () => {
    const { ability } = await buildEngineWithAbility({
      permissions: [{ action: 'read', subject: null }],
    });
    expect(ability.can('read')).toBeTruthy();
  });

  it('registers action with subject', async () => {
    const { ability } = await buildEngineWithAbility({
      permissions: [{ action: 'read', subject: 'article' }],
    });
    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'user')).toBeFalsy();
  });

  // TODO: I noticed another test checking this. Looks like we just test === on subject, so primitives or
  // objects passed by reference will work but object values will not work
  // it('requires subject to be string ', async () => {
  //   const subject = { id: 123 };
  //   const { ability } = await buildEngineWithAbility({
  //     permissions: [{ action: 'read', subject }],
  //   });
  //   expect(ability.can('read', subject)).toBeFalsy();
  // });

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
    it.skip('does not register action when conditions not met', async () => {
      const { ability } = await buildEngineWithAbility({
        permissions: [
          {
            action: 'read',
            subject: 'article',
            properties: { fields: ['title'] },
            conditions: ['isAuthor'],
          },
        ],
      });

      expect(ability.can('read')).toBeFalsy();
      expect(ability.can('read', 'user')).toBeFalsy();
      expect(ability.can('read', 'article', 'name')).toBeFalsy();

      expect(ability.can('read', 'article')).toBeFalsy();
      expect(ability.can('read', 'article', 'title')).toBeFalsy();
    });
  });

  it.skip('register action when conditions are met', async () => {
    const { ability } = await buildEngineWithAbility({
      permissions: [
        {
          action: 'read',
          subject: 'article',
          properties: { fields: ['title'] },
          conditions: ['isAuthor'],
        },
      ],
    });

    expect(ability.can('read')).toBeFalsy();
    expect(ability.can('read', 'user')).toBeFalsy();
    expect(ability.can('read', 'article', 'name')).toBeFalsy();

    expect(ability.can('read', 'article')).toBeTruthy();
    expect(ability.can('read', 'article', 'title')).toBeTruthy();
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

  it.skip('before-format::validate.permission run before format.permission', () => {});

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

  it.skip('post-format::validate.permission runs after format.permission', () => {});

  it.skip('before-evaluate.permission is called ', async () => {
    // const { ability } = await buildEngineWithAbility({
    //   permissions: [{ action: 'read', subject: 'article' }],
    //   engineHooks: [
    //     {
    //       name: 'before-evaluate.permission',
    //       fn(permissions) {
    //         console.log('permissions', permissions);
    //         return;
    //       },
    //     },
    //   ],
    // });
  });

  it.skip('before-register.permission is called ', async () => {
    // const { ability } = await buildEngineWithAbility({
    //   permissions: [{ action: 'read', subject: 'article' }],
    //   engineHooks: [
    //     {
    //       name: 'before-evaluate.permission',
    //       fn(permissions) {
    //         console.log('permissions', permissions);
    //         return;
    //       },
    //     },
    //   ],
    // });
  });
});
