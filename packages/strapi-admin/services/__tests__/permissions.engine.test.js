'use strict';

const _ = require('lodash');
const createConditionProvider = require('../permission/condition-provider');
const createPermissionsEngine = require('../permission/engine');

describe('Permissions Engine', () => {
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
        roles: [{ id: 1 }, { id: 3 }],
      },
    },
    roles: {
      1: {
        permissions: [
          { action: 'read', subject: 'article', fields: ['**'], conditions: ['isBob'] },
          { action: 'read', subject: 'user', fields: ['title'], conditions: ['isAdmin'] },
        ],
      },
      2: {
        permissions: [{ action: 'post', subject: 'article', fields: ['*'], conditions: ['isBob'] }],
      },
      3: {
        permissions: [],
      },
    },
    conditions: {
      isBob: user => user.firstname === 'Bob',
      isAdmin: user => user.title === 'admin',
      isCreatedBy: user => ({ created_by: user.firstname }),
    },
  };

  const getUser = name => localTestData.users[name];

  beforeEach(() => {
    conditionProvider = createConditionProvider();
    conditionProvider.registerMany(localTestData.conditions);

    engine = createPermissionsEngine(conditionProvider);

    jest.spyOn(engine, 'evaluatePermission');
    jest.spyOn(engine, 'createRegisterFunction');
    jest.spyOn(engine, 'findPermissionsForUser');
    jest.spyOn(engine, 'generateAbilityCreatorFor');

    const findRole = jest.fn(({ id_in }) =>
      _.reduce(
        localTestData.roles,
        (acc, value, key) => (id_in.includes(_.toNumber(key)) ? [...acc, value] : acc),
        []
      )
    );

    global.strapi = {
      query: () => ({
        find: findRole,
      }),
    };
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

      expect(engine.findPermissionsForUser).toHaveBeenCalledWith(user);
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

      expect(engine.findPermissionsForUser).toHaveBeenCalledWith(user);
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

  describe('Evaluate Permission', () => {
    test('It should register the permission (no conditions / true result)', async () => {
      const permission = { action: 'read', subject: 'article', fields: ['title'] };
      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluatePermission({ permission, user, registerFn });

      expect(registerFn).toHaveBeenCalledWith({ ...permission, condition: true });
    });

    test('It should register the permission (conditions / true result)', async () => {
      const permission = {
        action: 'read',
        subject: 'article',
        fields: ['title'],
        conditions: ['isAdmin'],
      };
      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluatePermission({ permission, user, registerFn });

      const expected = {
        ..._.omit(permission, 'conditions'),
        condition: true,
      };

      expect(registerFn).toHaveBeenCalledWith(expected);
    });

    test('It should not register the permission (conditions / false result)', async () => {
      const permission = {
        action: 'read',
        subject: 'article',
        fields: ['title'],
        conditions: ['isBob'],
      };
      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluatePermission({ permission, user, registerFn });

      expect(registerFn).not.toHaveBeenCalled();
    });

    test('It should register the permission (conditions / object result)', async () => {
      const permission = {
        action: 'read',
        subject: 'article',
        fields: ['title'],
        conditions: ['isCreatedBy'],
      };
      const user = getUser('alice');
      const registerFn = jest.fn();

      await engine.evaluatePermission({ permission, user, registerFn });

      const expected = {
        ..._.omit(permission, 'conditions'),
        condition: { created_by: user.firstname },
      };

      expect(registerFn).toHaveBeenCalledWith(expected);
    });
  });

  describe('Finds permissions For User', () => {
    const sort = collection => _.orderBy(collection, ['action', 'subject'], ['asc', 'asc']);

    test('Finds permissions for Alice', async () => {
      const user = getUser('alice');
      const permissions = await engine.findPermissionsForUser(user);

      const expected = sort([
        ...localTestData.roles['1'].permissions,
        ...localTestData.roles['3'].permissions,
      ]);

      expect(sort(permissions)).toStrictEqual(expected);
    });

    test('Finds permissions for Bob', async () => {
      const user = getUser('bob');
      const permissions = await engine.findPermissionsForUser(user);

      const expected = sort([
        ...localTestData.roles['1'].permissions,
        ...localTestData.roles['2'].permissions,
      ]);

      expect(sort(permissions)).toStrictEqual(expected);
    });
  });

  describe('Create Register Function', () => {
    let can;
    let registerFn;

    beforeEach(() => {
      can = jest.fn();
      registerFn = engine.createRegisterFunction(can);
    });

    test('It should calls the can function without any condition', () => {
      registerFn({ action: 'read', subject: 'article', fields: '*', condition: true });

      expect(can).toHaveBeenCalledTimes(1);
      expect(can).toHaveBeenCalledWith('read', 'article', '*', undefined);
    });

    test('It should calls the can function with a condition', () => {
      registerFn({ action: 'read', subject: 'article', fields: '*', condition: { created_by: 1 } });

      expect(can).toHaveBeenCalledTimes(1);
      expect(can).toHaveBeenCalledWith('read', 'article', '*', { created_by: 1 });
    });
  });
});
