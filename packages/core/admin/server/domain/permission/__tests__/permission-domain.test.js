'use strict';

const domain = require('../');

describe('Permission Domain', () => {
  describe('addCondition', () => {
    test(`Init the condition array if it doesn't exists`, async () => {
      const permission = {};

      const newPermission = domain.addCondition('foo', permission);

      expect(permission).not.toHaveProperty('conditions');
      expect(newPermission).toHaveProperty('conditions', ['foo']);
    });

    test('Adds the new condition to the permission.conditions property', async () => {
      const permission = { conditions: ['foo'] };

      const newPermission = domain.addCondition('bar', permission);

      expect(permission).toHaveProperty('conditions', ['foo']);
      expect(newPermission).toHaveProperty('conditions', ['foo', 'bar']);
    });

    test(`Don't add the new condition to the permission.conditions property if it's already been added`, async () => {
      const permission = { conditions: ['foo'] };

      const newPermission = domain.addCondition('foo', permission);

      expect(permission).toHaveProperty('conditions', ['foo']);
      expect(newPermission).toHaveProperty('conditions', ['foo']);
    });
  });

  describe('removeCondition', () => {
    test('Can remove added condition from permission.conditions', () => {
      const permission = { conditions: ['foo', 'bar'] };

      const newPermission = domain.removeCondition('foo', permission);

      expect(permission).toHaveProperty('conditions', ['foo', 'bar']);
      expect(newPermission).toHaveProperty('conditions', ['bar']);
    });

    test(`Do not remove anything if the condition isn't present in permission.conditions`, () => {
      const permission = { conditions: ['foo', 'bar'] };

      const newPermission = domain.removeCondition('foobar', permission);

      expect(permission).toHaveProperty('conditions', ['foo', 'bar']);
      expect(newPermission).toHaveProperty('conditions', ['foo', 'bar']);
    });
  });

  describe('create', () => {
    test('Removes unwanted fields', () => {
      const permission = {
        id: 1,
        action: 'foo',
        subject: 'bar',
        properties: {},
        conditions: [],
        foo: 'bar',
      };

      const newPermission = domain.create(permission);

      expect(newPermission).not.toHaveProperty('foo');
    });
  });

  describe('sanitizePermissionFields', () => {
    test('Returns a new permission without the invalid fields', () => {
      const invalidPermission = { action: 'foo', subject: 'bar', properties: {}, foo: 'bar' };

      const permission = domain.sanitizePermissionFields(invalidPermission);

      expect(permission).not.toHaveProperty('foo');
    });
  });

  describe('setProperty', () => {
    test('Can set a new property and its value', () => {
      const permission = { properties: {} };

      const newPermission = domain.setProperty('foo', 'bar', permission);

      expect(permission).toHaveProperty('properties', {});
      expect(newPermission).toHaveProperty('properties', { foo: 'bar' });
    });

    test('Can update the value of an existing property', () => {
      const permission = { properties: { foo: 'bar' } };

      const newPermission = domain.setProperty('foo', 'foobar', permission);

      expect(permission).toHaveProperty('properties', { foo: 'bar' });
      expect(newPermission).toHaveProperty('properties', { foo: 'foobar' });
    });

    test('Can perform a deep update on a property', () => {
      const permission = { properties: { foo: { bar: { foobar: null } } }, bar: 'foo' };

      const newPermission = domain.setProperty('foo.bar.foobar', 1, permission);

      expect(permission).toHaveProperty('properties.foo.bar.foobar', null);
      expect(newPermission).toHaveProperty('properties.foo.bar.foobar', 1);
    });
  });

  describe('deleteProperty', () => {
    test('Can delete an existing property', () => {
      const permission = { properties: { foo: 'bar', bar: 'foo' } };

      const newPermission = domain.deleteProperty('foo', permission);

      expect(permission).toHaveProperty('properties', { foo: 'bar', bar: 'foo' });
      expect(newPermission).toHaveProperty('properties', { bar: 'foo' });
    });

    test('Delete a non-existing property does nothing', () => {
      const permission = { properties: { foo: 'bar' } };

      const newPermission = domain.deleteProperty('bar', permission);

      expect(permission).toHaveProperty('properties', { foo: 'bar' });
      expect(newPermission).toHaveProperty('properties', { foo: 'bar' });
    });

    test('Can perform a deep delete on a property', () => {
      const permission = { properties: { foo: { bar: { foobar: null, barfoo: 2 } } }, bar: 'foo' };

      const newPermission = domain.deleteProperty('foo.bar.barfoo', permission);

      expect(permission).toHaveProperty('properties.foo.bar', { foobar: null, barfoo: 2 });
      expect(newPermission).toHaveProperty('properties.foo.bar', { foobar: null });
    });
  });

  describe('toPermission', () => {
    test('Handle single permission object and call domain.create', () => {
      const permission = {
        id: 1,
        action: 'foo',
        subject: 'bar',
        properties: {},
        conditions: [],
        foo: 'bar',
      };

      const newPermission = domain.toPermission(permission);

      expect(newPermission).not.toHaveProperty('foo');
    });

    test('Handle multiple permission object and call domain.create', () => {
      const permissions = [
        {
          id: 1,
          action: 'foo',
          subject: 'bar',
          properties: {},
          conditions: [],
          foo: 'bar',
        },
        {
          id: 2,
          action: 'foo',
          subject: 'bar',
          properties: {},
          conditions: [],
          foo: 'bar',
        },
      ];

      const newPermissions = domain.toPermission(permissions);

      newPermissions.forEach(p => expect(p).not.toHaveProperty('foo'));
    });
  });

  describe('getProperty', () => {
    test('Can get a property if it exists', () => {
      const permission = { properties: { foo: 'bar' } };

      const property = domain.getProperty('foo', permission);

      expect(property).toBe('bar');
    });

    test('Can get a deep property if it exists', () => {
      const permission = { properties: { foo: { bar: 'foobar' } } };

      const property = domain.getProperty('foo.bar', permission);

      expect(property).toBe('foobar');
    });

    test(`Trying to get a property that doesn't exist returns undefined`, () => {
      const permission = { properties: { foo: 'bar' } };

      const property = domain.getProperty('bar', permission);

      expect(property).toBeUndefined();
    });

    test('getProperty should allow currying', () => {
      const permissions = [{ properties: { foo: 'bar' } }, { properties: { foo: 'foobar' } }];

      const getFooProperty = domain.getProperty('foo');

      permissions.forEach(permission => {
        const fooProperty = getFooProperty(permission);

        expect(fooProperty).toBe(permission.properties.foo);
      });
    });

    test(`Trying to access property if permission.properties isn't defined should return undefined`, () => {
      const permission = {};

      const property = domain.getProperty('foo', permission);

      expect(property).toBeUndefined();
    });
  });

  describe('sanitizeConditions', () => {
    const conditions = ['foo', 'bar'];
    const conditionProvider = { has: condition => conditions.includes(condition) };

    test(`No conditions should be removed if they're valid`, () => {
      const permission = { conditions: ['foo', 'bar'] };

      const permissionWithSanitizedConditions = domain.sanitizeConditions(
        conditionProvider,
        permission
      );

      expect(permissionWithSanitizedConditions).toHaveProperty('conditions', ['foo', 'bar']);
    });

    test('Non existing permissions should be removed from the conditions property', () => {
      const permission = { conditions: ['foo', 'foobar'] };

      const permissionWithSanitizedConditions = domain.sanitizeConditions(
        conditionProvider,
        permission
      );

      expect(permissionWithSanitizedConditions).toHaveProperty('conditions', ['foo']);
    });

    test('Do nothing when permission.conditions is not defined', () => {
      const permission = {};

      const permissionWithSanitizedConditions = domain.sanitizeConditions(
        conditionProvider,
        permission
      );

      expect(permissionWithSanitizedConditions).not.toHaveProperty('conditions');
    });

    test.each([
      [{ conditions: [] }, []],
      [{ conditions: ['foo'] }, ['foo']],
      [{ conditions: ['foo', 'foobar'] }, ['foo']],
      [{ conditions: ['foobar'] }, []],
      [{}, undefined],
    ])('Should allow currying (arity 2)', (permission, expected) => {
      const sanitizeConditionsWithProvider = domain.sanitizeConditions(conditionProvider);

      const permissionWithSanitizedConditions = sanitizeConditionsWithProvider(permission);

      if (expected === undefined) {
        expect(permissionWithSanitizedConditions).not.toHaveProperty('conditions');
      } else {
        expect(permissionWithSanitizedConditions).toHaveProperty('conditions', expected);
      }
    });
  });
});
