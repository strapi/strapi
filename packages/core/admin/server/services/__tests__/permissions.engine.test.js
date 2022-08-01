'use strict';

const _ = require('lodash');
const { subject } = require('@casl/ability');
const createConditionProvider = require('../../domain/condition/provider');
const createPermissionsEngine = require('../permission/engine');

describe.skip('Permissions Engine', () => {
  let conditionProvider;
  let engine;

  const localTestData = {
    users: {
      bob: {
        firstname: 'Bob',
        title: 'guest',
        roles: [{ id: 1 }, { id: 2 }],
      },
      alice: {
        firstname: 'Alice',
        title: 'admin',
        roles: [{ id: 1 }],
      },
      kai: {
        firstname: 'Kai',
        title: 'admin',
        roles: [{ id: 3 }],
      },
      foo: {
        firstname: 'Foo',
        title: 'Bar',
        roles: [{ id: 4 }],
      },
    },
    roles: {
      1: {
        permissions: [
          {
            action: 'read',
            subject: 'article',
            properties: { fields: ['**'] },
            conditions: ['plugin::test.isBob'],
          },
          {
            action: 'read',
            subject: 'user',
            properties: { fields: ['title'] },
            conditions: ['plugin::test.isAdmin'],
          },
        ],
      },
      2: {
        permissions: [
          {
            action: 'post',
            subject: 'article',
            properties: { fields: ['*'] },
            conditions: ['plugin::test.isBob'],
          },
        ],
      },
      3: {
        permissions: [
          {
            action: 'read',
            subject: 'user',
            properties: { fields: ['title'] },
            conditions: ['plugin::test.isContainedIn'],
          },
        ],
      },
      4: {
        permissions: [
          {
            action: 'read',
            subject: 'user',
            properties: { fields: [] },
          },
        ],
      },
    },
    conditions: [
      {
        plugin: 'test',
        name: 'isBob',
        category: 'default',
        handler: async user => new Promise(resolve => resolve(user.firstname === 'Bob')),
      },
      {
        plugin: 'test',
        name: 'isAdmin',
        category: 'default',
        handler: user => user.title === 'admin',
      },
      {
        plugin: 'test',
        name: 'isCreatedBy',
        category: 'default',
        handler: user => ({ createdBy: user.firstname }),
      },
      {
        plugin: 'test',
        name: 'isContainedIn',
        category: 'default',
        handler: () => ({ firstname: { $in: ['Alice', 'Foo'] } }),
      },
    ],
  };

  const getUser = name => localTestData.users[name];

  beforeEach(async () => {
    global.strapi = {
      isLoaded: false,
      admin: {
        services: {
          permission: {
            actionProvider: {
              get() {
                return { applyToProperties: undefined };
              },
            },
            findUserPermissions: jest.fn(({ roles }) =>
              _.reduce(
                localTestData.roles,
                (acc, { permissions: value }, key) => {
                  return roles.map(_.property('id')).includes(_.toNumber(key))
                    ? [...acc, ...value]
                    : acc;
                },
                []
              )
            ),
          },
        },
      },
    };

    conditionProvider = createConditionProvider();
    await conditionProvider.registerMany(localTestData.conditions);

    engine = createPermissionsEngine(conditionProvider);

    jest.spyOn(engine, 'evaluate');
    jest.spyOn(engine, 'createRegisterFunction');
    jest.spyOn(engine, 'generateAbilityCreatorFor');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GenerateUserAbility', () => {
    test('Successfully creates an ability for Bob', async () => {
      const user = getUser('bob');

      const ability = await engine.generateUserAbility(user);

      const expected = [
        {
          action: 'read',
          fields: ['**'],
          subject: 'article',
        },
        {
          action: 'post',
          fields: ['*'],
          subject: 'article',
        },
      ];

      expect(engine.generateAbilityCreatorFor).toHaveBeenCalledWith(user);
      expect(_.orderBy(ability.rules, ['subject'], ['asc'])).toMatchObject(expected);

      expect(ability.can('post', 'article')).toBeTruthy();
      expect(ability.can('post', 'article', 'user')).toBeTruthy();
      expect(ability.can('post', 'article', 'user.nested')).toBeFalsy();

      expect(ability.can('read', 'article')).toBeTruthy();
      expect(ability.can('read', 'article', 'title')).toBeTruthy();
      expect(ability.can('read', 'article', 'title.nested')).toBeTruthy();

      expect(ability.can('read', 'user')).toBeFalsy();
      expect(ability.can('read', 'user', 'firstname')).toBeFalsy();
      expect(ability.can('read', 'user', 'title')).toBeFalsy();
      expect(ability.can('read', 'user', 'title.nested')).toBeFalsy();
    });

    test('Successfully creates an ability for Alice', async () => {
      const user = getUser('alice');

      const ability = await engine.generateUserAbility(user);

      const expected = [
        {
          action: 'read',
          fields: ['title'],
          subject: 'user',
        },
      ];

      expect(engine.generateAbilityCreatorFor).toHaveBeenCalledWith(user);
      expect(_.orderBy(ability.rules, ['action'], ['asc'])).toMatchObject(expected);

      expect(ability.can('post', 'article')).toBeFalsy();
      expect(ability.can('post', 'article', 'user')).toBeFalsy();
      expect(ability.can('post', 'article', 'user.nested')).toBeFalsy();

      expect(ability.can('read', 'article')).toBeFalsy();
      expect(ability.can('read', 'article', 'title')).toBeFalsy();
      expect(ability.can('read', 'article', 'title.nested')).toBeFalsy();

      expect(ability.can('read', 'user')).toBeTruthy();
      expect(ability.can('read', 'user', 'firstname')).toBeFalsy();
      expect(ability.can('read', 'user', 'title')).toBeTruthy();
      expect(ability.can('read', 'user', 'title.nested')).toBeFalsy();
    });

    test('Ignore permission on empty fields array', async () => {
      const user = getUser('foo');

      const ability = await engine.generateUserAbility(user);

      expect(engine.generateAbilityCreatorFor).toHaveBeenCalledWith(user);
      expect(ability.rules).toHaveLength(0);
      expect(ability.can('read', 'user')).toBeFalsy();
    });

    describe('Use objects as subject', () => {
      let ability;

      beforeAll(async () => {
        const user = getUser('kai');
        ability = await engine.generateUserAbility(user);
      });

      test('Fails to validate the object condition', () => {
        const args = ['read', subject('user', { firstname: 'Bar' }), 'title'];

        expect(ability.can(...args)).toBeFalsy();
      });

      test('Fails to read a restricted field', () => {
        const args = ['read', subject('user', { firstname: 'Foo' }), 'bar'];

        expect(ability.can(...args)).toBeFalsy();
      });

      test('Successfully validate the permission', () => {
        const args = ['read', subject('user', { firstname: 'Foo' }), 'title'];

        expect(ability.can(...args)).toBeTruthy();
      });
    });
  });

  describe('Generate Ability Creator For', () => {
    test('Successfully generates an ability creator for Alice', async () => {
      const user = getUser('alice');

      const abilityCreator = engine.generateAbilityCreatorFor(user);
      const ability = await abilityCreator([]);

      expect(abilityCreator).not.toBeUndefined();
      expect(typeof abilityCreator).toBe('function');
      expect(ability.rules).toStrictEqual([]);
    });
  });

  describe('Evaluate', () => {
    test('It should register the permission (no conditions)', async () => {
      const permission = { action: 'read', subject: 'article', properties: { fields: ['title'] } };
      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluate({ permission, user, registerFn });

      expect(registerFn).toHaveBeenCalledWith({
        ..._.pick(permission, ['action', 'subject']),
        fields: permission.properties.fields,
      });
    });

    test('It should register the permission without a condition (non required true result)', async () => {
      const permission = {
        action: 'read',
        subject: 'article',
        properties: { fields: ['title'] },
        conditions: ['plugin::test.isAdmin'],
      };
      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluate({ permission, user, registerFn });

      const expected = {
        ..._.omit(permission, ['conditions', 'properties']),
        fields: permission.properties.fields,
      };

      expect(registerFn).toHaveBeenCalledWith(expected);
    });

    test('It should not register the permission (conditions / false result)', async () => {
      const permission = {
        action: 'read',
        subject: 'article',
        properties: { fields: ['title'] },
        conditions: ['plugin::test.isBob'],
      };
      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluate({ permission, user, registerFn });

      expect(registerFn).not.toHaveBeenCalled();
    });

    test('It should register the permission (non required object result)', async () => {
      const permission = {
        action: 'read',
        subject: 'article',
        properties: { fields: ['title'] },
        conditions: ['plugin::test.isCreatedBy'],
      };

      global.strapi.admin.services.permission.actionProvider.get = () => ({
        applyToProperties: ['fields'],
      });

      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluate({ permission, user, registerFn });

      const expected = {
        ..._.omit(permission, ['conditions', 'properties']),
        fields: permission.properties.fields,
        condition: {
          $and: [
            {
              $or: [{ createdBy: user.firstname }],
            },
          ],
        },
      };

      expect(registerFn).toHaveBeenCalledWith(expected);
    });
  });

  test('It should register the condition even if the subject is Nil', async () => {
    const permission = {
      action: 'read',
      subject: null,
      properties: {},
      conditions: ['plugin::test.isCreatedBy'],
    };

    const user = getUser('alice');
    const can = jest.fn();
    const registerFn = engine.createRegisterFunction(can, {}, user);

    await engine.evaluate({ permission, user, registerFn });

    expect(can).toHaveBeenCalledWith('read', 'all', undefined, {
      $and: [{ $or: [{ createdBy: user.firstname }] }],
    });
  });

  describe('Create Register Function', () => {
    let can;
    let registerFn;

    beforeEach(() => {
      can = jest.fn();
      registerFn = engine.createRegisterFunction(can, {}, {});
    });

    test('It should calls the can function without any condition', async () => {
      await registerFn({ action: 'read', subject: 'article', fields: '*', condition: true });

      expect(can).toHaveBeenCalledTimes(1);
      expect(can).toHaveBeenCalledWith('read', 'article', '*', undefined);
    });

    test('It should calls the can function with a condition', async () => {
      await registerFn({
        action: 'read',
        subject: 'article',
        fields: '*',
        condition: { createdBy: 1 },
      });

      expect(can).toHaveBeenCalledTimes(1);
      expect(can).toHaveBeenCalledWith('read', 'article', '*', { createdBy: 1 });
    });

    test(`It should use 'all' as a subject if it's Nil`, async () => {
      await registerFn({
        action: 'read',
        subject: null,
        fields: null,
        condition: { createdBy: 1 },
      });

      expect(can).toHaveBeenCalledTimes(1);
      expect(can).toHaveBeenCalledWith('read', 'all', null, { createdBy: 1 });
    });
  });

  describe('Check Many', () => {
    let ability;
    const permissions = [
      { action: 'read', subject: 'user', field: 'title' },
      { action: 'post', subject: 'article' },
    ];

    beforeEach(() => {
      ability = { can: jest.fn(() => true) };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('Using curried version of checkMany', () => {
      const checkMany = engine.checkMany(ability);

      const res = checkMany(permissions);

      expect(res).toHaveLength(permissions.length);
      expect(ability.can).toHaveBeenCalledTimes(2);
    });

    test('Using raw version of checkMany', () => {
      const res = engine.checkMany(ability, permissions);

      expect(res).toHaveLength(permissions.length);
      expect(ability.can).toHaveBeenCalledTimes(2);
    });
  });
});
