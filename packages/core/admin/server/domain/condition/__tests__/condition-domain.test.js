'use strict';

const domain = require('..');

describe('Condition Domain', () => {
  describe('assignConditionId', () => {
    test('Create a new condition with an id attribute. Prevent mutation on original object', () => {
      const condition = { name: 'foobar' };

      const newCondition = domain.assignConditionId(condition);

      // Original condition shouldn't be mutated
      expect(condition).not.toHaveProperty('id');
      // The new condition should match the original one and add a new conditionId attribute
      expect(newCondition).toMatchObject(condition);
      expect(newCondition).toHaveProperty('id', 'api::foobar');
    });
  });

  describe('computeConditionId', () => {
    test('Should return a condition ID prefixed with "api::" when there is no plugin', () => {
      const attributes = { name: 'foobar' };
      const expected = 'api::foobar';

      const id = domain.computeConditionId(attributes);

      expect(id).toBe(expected);
    });

    test('Should return a condition id prefixed with "admin::" when the plugin is "admin"', () => {
      const attributes = { name: 'foobar', plugin: 'admin' };
      const expected = 'admin::foobar';

      const id = domain.computeConditionId(attributes);

      expect(id).toBe(expected);
    });

    test('Should return a condition id prefixed with "plugin::" when there is a plugin (other than admin)', () => {
      const attributes = { name: 'foobar', plugin: 'myPlugin' };
      const expected = 'plugin::myPlugin.foobar';

      const id = domain.computeConditionId(attributes);

      expect(id).toBe(expected);
    });
  });

  describe('create', () => {
    test('Should register a condition with the minimum amount of information', () => {
      const handler = jest.fn(() => ({ foo: 'bar' }));
      const condition = {
        handler,
        name: 'foo',
        displayName: 'Foo',
      };
      const expected = {
        handler,
        id: 'api::foo',
        displayName: 'Foo',
        category: 'default',
      };

      const result = domain.create(condition);

      expect(result).toMatchObject(expected);
    });

    test('Should handle multiple step of transformation', () => {
      const handler = jest.fn(() => ({ foo: 'bar' }));
      const condition = {
        name: 'foo',
        plugin: 'bar',
        displayName: 'Foo',
        handler,
        invalidAttribute: 'foobar',
      };

      const expected = {
        id: 'plugin::bar.foo',
        category: 'default',
        plugin: 'bar',
        displayName: 'Foo',
        handler,
      };

      const result = domain.create(condition);

      expect(result).toMatchObject(expected);
    });
  });

  describe('sanitizeConditionAttributes', () => {
    const getSortedAttributes = object => Object.keys(object).sort();

    test(`It shouldn't remove attributes contained in domain.conditionAttributes`, () => {
      const condition = domain.conditionFields.reduce(
        (attrs, attrName) => ({ ...attrs, [attrName]: 'foo' }),
        {}
      );

      const sanitizedCondition = domain.sanitizeConditionAttributes(condition);

      expect(sanitizedCondition).toMatchObject(condition);
      expect(getSortedAttributes(sanitizedCondition)).toEqual(getSortedAttributes(condition));
    });

    test('It should remove attributes not contained in domain.conditionFields', () => {
      const invalidAttributes = ['foo', 'bar'];
      const condition = domain.conditionFields
        .concat(invalidAttributes)
        .reduce((attrs, attrName) => ({ ...attrs, [attrName]: 'foo' }), {});

      const sanitizedCondition = domain.sanitizeConditionAttributes(condition);

      expect(getSortedAttributes(sanitizedCondition)).not.toEqual(getSortedAttributes(condition));
      invalidAttributes.forEach(attribute =>
        expect(sanitizedCondition).not.toHaveProperty(attribute)
      );
    });
  });
});
