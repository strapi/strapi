'use strict';

const {
  isPrivateAttribute,
  isTypedAttribute,
  getPrivateAttributes,
  getVisibleAttributes,
  getNonWritableAttributes,
  getScalarAttributes,
  constants,
} = require('../content-types');

const createModelWithPrivates = (privateAttributes = []) => ({
  uid: 'myModel',
  options: {
    privateAttributes,
  },
  attributes: {
    foo: {
      type: 'string',
      private: true,
    },
    bar: {
      type: 'number',
      private: false,
    },
    foobar: {
      type: 'string',
    },
  },
});

const createConfig = (privateAttributes = []) => ({
  get: jest.fn(() => privateAttributes),
});

const createModel = (opts) => ({
  ...opts,
});

describe('Content types utils', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Verify constants exist', () => {
    expect(constants.CREATED_BY_ATTRIBUTE).toBeDefined();
    expect(constants.UPDATED_BY_ATTRIBUTE).toBeDefined();
    expect(constants.PUBLISHED_AT_ATTRIBUTE).toBeDefined();
  });

  describe('getNonWritableAttributes', () => {
    test('Includes non writable fields', () => {
      const model = createModel({
        attributes: {
          title: {
            type: 'string',
          },
          non_writable_field: {
            type: 'string',
            writable: false,
          },
          createdAt: {
            type: 'datetime',
          },
          updatedAt: {
            type: 'datetime',
          },
        },
      });

      expect(getNonWritableAttributes(model)).toEqual([
        'id',
        'createdAt',
        'updatedAt',
        'non_writable_field',
      ]);
    });
  });

  describe('getVisibleAttributes', () => {
    test('Excludes non visible fields', () => {
      const model = createModel({
        attributes: {
          title: {
            type: 'string',
          },
          invisible_field: {
            type: 'datetime',
            visible: false,
          },
        },
      });

      expect(getVisibleAttributes(model)).toEqual(['title']);
    });

    test('Excludes id', () => {
      const model = createModel({
        attributes: {
          id: {
            type: 'integer',
          },
          title: {
            type: 'string',
          },
        },
      });

      expect(getVisibleAttributes(model)).toEqual(['title']);
    });
  });

  describe('getPrivateAttributes', () => {
    test('Attribute is private in the model attributes', () => {
      const model = createModelWithPrivates();
      global.strapi = { config: createConfig() };

      const privateAttributes = getPrivateAttributes(model);

      expect(privateAttributes).toContain('foo');
      expect(privateAttributes).not.toContain('bar');
      expect(privateAttributes).not.toContain('foobar');
      expect(strapi.config.get).toHaveBeenCalledWith('api.responses.privateAttributes', []);
    });

    test('Attribute is set to private in the app config', () => {
      const model = createModelWithPrivates();
      global.strapi = { config: createConfig(['bar']) };

      const privateAttributes = getPrivateAttributes(model);

      expect(privateAttributes).toContain('foo');
      expect(privateAttributes).toContain('bar');
      expect(privateAttributes).not.toContain('foobar');
      expect(strapi.config.get).toHaveBeenCalledWith('api.responses.privateAttributes', []);
    });

    test('Attribute is set to private in the model options', () => {
      const model = createModelWithPrivates(['foobar']);
      global.strapi = { config: createConfig() };

      const privateAttributes = getPrivateAttributes(model);

      expect(privateAttributes).toContain('foo');
      expect(privateAttributes).not.toContain('bar');
      expect(privateAttributes).toContain('foobar');
      expect(strapi.config.get).toHaveBeenCalledWith('api.responses.privateAttributes', []);
    });
  });

  describe('isPrivateAttribute', () => {
    test('Attribute is private in the model attributes', () => {
      const model = createModelWithPrivates();
      global.strapi = { config: createConfig() };
      Object.assign(model, { privateAttributes: getPrivateAttributes(model) });

      expect(isPrivateAttribute(model, 'foo')).toBeTruthy();
      expect(isPrivateAttribute(model, 'bar')).toBeFalsy();
      expect(isPrivateAttribute(model, 'foobar')).toBeFalsy();
      expect(strapi.config.get).toHaveBeenCalledWith('api.responses.privateAttributes', []);
    });

    test('Attribute is set to private in the app config', () => {
      const model = createModelWithPrivates();
      global.strapi = { config: createConfig(['bar']) };
      Object.assign(model, { privateAttributes: getPrivateAttributes(model) });

      expect(isPrivateAttribute(model, 'foo')).toBeTruthy();
      expect(isPrivateAttribute(model, 'bar')).toBeTruthy();
      expect(isPrivateAttribute(model, 'foobar')).toBeFalsy();
      expect(strapi.config.get).toHaveBeenCalledWith('api.responses.privateAttributes', []);
    });

    test('Attribute is set to private in the model options', () => {
      const model = createModelWithPrivates(['foobar']);
      global.strapi = { config: createConfig() };
      Object.assign(model, { privateAttributes: getPrivateAttributes(model) });

      expect(isPrivateAttribute(model, 'foo')).toBeTruthy();
      expect(isPrivateAttribute(model, 'bar')).toBeFalsy();
      expect(isPrivateAttribute(model, 'foobar')).toBeTruthy();
      expect(strapi.config.get).toHaveBeenCalledWith('api.responses.privateAttributes', []);
    });
  });

  describe('isTypedAttribute', () => {
    test('Returns false if attribute does not have a type', () => {
      expect(isTypedAttribute({})).toBe(false);
    });

    test('Returns true if attribute type matches passed type', () => {
      expect(isTypedAttribute({ type: 'test' }, 'test')).toBe(true);
    });

    test('Returns false if type do not match', () => {
      expect(isTypedAttribute({ type: 'test' }, 'other-type')).toBe(false);
    });
  });

  describe('getScalarAttributes', () => {
    test('returns only scalar attributes', () => {
      const schema = {
        attributes: {
          mediaField: { type: 'media' },
          componentField: { type: 'component' },
          relationField: { type: 'relation' },
          dynamiczoneField: { type: 'dynamiczone' },
          stringField: { type: 'string' },
          textField: { type: 'text' },
          richtextField: { type: 'richtext' },
          enumerationField: { type: 'enumeration' },
          emailField: { type: 'email' },
          passwordField: { type: 'password' },
          uidField: { type: 'uid' },
          dateField: { type: 'date' },
          timeField: { type: 'time' },
          datetimeField: { type: 'datetime' },
          timestampField: { type: 'timestamp' },
          integerField: { type: 'integer' },
          bigintegerField: { type: 'biginteger' },
          floatField: { type: 'float' },
          decimalField: { type: 'decimal' },
          booleanField: { type: 'boolean' },
          arrayField: { type: 'array' },
          jsonField: { type: 'json' },
        },
      };

      const scalarAttributes = getScalarAttributes(schema);
      expect(scalarAttributes).toEqual([
        'stringField',
        'textField',
        'richtextField',
        'enumerationField',
        'emailField',
        'passwordField',
        'uidField',
        'dateField',
        'timeField',
        'datetimeField',
        'timestampField',
        'integerField',
        'bigintegerField',
        'floatField',
        'decimalField',
        'booleanField',
        'arrayField',
        'jsonField',
      ]);
    });
  });
});
