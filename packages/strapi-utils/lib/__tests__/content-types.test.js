'use strict';

const { isPrivateAttribute, getPrivateAttributes } = require('../content-types');

const createModel = (privateAttributes = []) => ({
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

describe('Content-Types', () => {
  describe('getPrivateAttributes', () => {
    test('Attribute is private in the model attributes', () => {
      const model = createModel();
      global.strapi = { config: createConfig() };

      const privateAttributes = getPrivateAttributes(model);

      expect(privateAttributes).toContain('foo');
      expect(privateAttributes).not.toContain('bar');
      expect(privateAttributes).not.toContain('foobar');
    });

    test('Attribute is set to private in the app config', () => {
      const model = createModel();
      global.strapi = { config: createConfig(['bar']) };

      const privateAttributes = getPrivateAttributes(model);

      expect(privateAttributes).toContain('foo');
      expect(privateAttributes).toContain('bar');
      expect(privateAttributes).not.toContain('foobar');
    });

    test('Attribute is set to private in the model options', () => {
      const model = createModel(['foobar']);
      global.strapi = { config: createConfig() };

      const privateAttributes = getPrivateAttributes(model);

      expect(privateAttributes).toContain('foo');
      expect(privateAttributes).not.toContain('bar');
      expect(privateAttributes).toContain('foobar');
    });
  });

  describe('isPrivateAttribute', () => {
    test('Attribute is private in the model attributes', () => {
      const model = createModel();
      global.strapi = { config: createConfig() };

      expect(isPrivateAttribute(model, 'foo')).toBeTruthy();
      expect(isPrivateAttribute(model, 'bar')).toBeFalsy();
      expect(isPrivateAttribute(model, 'foobar')).toBeFalsy();
    });

    test('Attribute is set to private in the app config', () => {
      const model = createModel();
      global.strapi = { config: createConfig(['bar']) };

      expect(isPrivateAttribute(model, 'foo')).toBeTruthy();
      expect(isPrivateAttribute(model, 'bar')).toBeTruthy();
      expect(isPrivateAttribute(model, 'foobar')).toBeFalsy();
    });

    test('Attribute is set to private in the model options', () => {
      const model = createModel(['foobar']);
      global.strapi = { config: createConfig() };

      expect(isPrivateAttribute(model, 'foo')).toBeTruthy();
      expect(isPrivateAttribute(model, 'bar')).toBeFalsy();
      expect(isPrivateAttribute(model, 'foobar')).toBeTruthy();
    });
  });
});
