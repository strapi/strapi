'use strict';

const {
  isPrivateAttribute,
  getPrivateAttributes,
  getVisibleAttributes,
  getNonWritableAttributes,
  constants,
  getGlobalId,
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

const createModel = opts => ({
  primaryKey: 'id',
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
        },
      });

      expect(getNonWritableAttributes(model)).toEqual(['id', 'non_writable_field']);
    });

    test('Includes primaryKey', () => {
      const model = createModel({
        primaryKey: 'testPK',
        attributes: {
          title: {
            type: 'string',
          },
        },
      });

      expect(getNonWritableAttributes(model)).toEqual(expect.arrayContaining(['testPK']));
    });

    test('Includes timestamps', () => {
      const model = createModel({
        options: {
          timestamps: ['creation_date', 'edition_date'],
        },
        attributes: {
          title: {
            type: 'string',
          },
        },
      });

      expect(getNonWritableAttributes(model)).toEqual(
        expect.arrayContaining(['creation_date', 'edition_date'])
      );
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

    test('Excludes timestamps', () => {
      const model = createModel({
        options: {
          timestamps: ['timestamp_date'],
        },
        attributes: {
          title: {
            type: 'string',
          },
          timestamp_date: {
            type: 'datetime',
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

    test('Excludes primaryKey', () => {
      const model = createModel({
        primaryKey: '_id',
        attributes: {
          _id: {
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

  describe('getGlobalId', () => {
    const testData = [
      [{ globalId: 'customId' }, 'modelName', 'admin', 'customId'],
      [{}, 'modelName', undefined, 'ModelName'],
      [{}, 'modelName', null, 'ModelName'],
      [{}, 'modelName', '', 'ModelName'],
      [{}, 'modelName', 'admin', 'AdminModelName'],
      [{}, 'MODELNAME', '', 'Modelname'],
      [{}, 'MODEL-NAME', '', 'ModelName'],
    ];

    test.each(testData)(
      'getGlobalId(%p, %p, %p) = %p',
      (model, modelName, prefix, expectedResult) => {
        const result = getGlobalId(model, modelName, prefix);

        expect(result).toBe(expectedResult);
      }
    );
  });
});
