const sanitizeEntity = require('../sanitize-entity');

const modelWithPublicOnlyAttributes = {
  attributes: {
    foo: {
      type: 'string',
    },
    bar: {
      type: 'string',
    },
  },
};

const modelWithPrivatesAttributes = {
  attributes: {
    foo: {
      type: 'string',
      private: true,
    },
    bar: {
      type: 'string',
    },
  },
  hiddenFields: ['__v', 'v', '_id', 'createdAt'],
};

const modelWithHiddenFields = {
  attributes: {
    foo: {
      type: 'string',
      private: true,
    },
    bar: {
      type: 'string',
    },
  },
  hiddenFields: ['hideme', '_hideme'],
};

describe('Sanitize Entity', () => {
  test('When no private fields in model, then all field must be returned', async () => {
    global.strapi = {};

    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, { model: modelWithPublicOnlyAttributes });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar' });
  });
  test('When private fields in model, then private fields must be hidden', async () => {
    global.strapi = {};

    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, { model: modelWithPrivatesAttributes });

    expect(sanitized).toEqual({ bar: 'bar' });
  });
  test('When withprivate=true, then private fields must be returned', async () => {
    global.strapi = {};

    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, {
      model: modelWithPrivatesAttributes,
      withPrivate: true,
    });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar' });
  });
  test('When non-attributes fields in model, must be returned', async () => {
    global.strapi = {};

    let entity = { foo: 'foo', bar: 'bar', imhere: true };
    let sanitized = sanitizeEntity(entity, { model: modelWithPublicOnlyAttributes });

    expect(sanitized).toEqual({ imhere: true, foo: 'foo', bar: 'bar' });
  });
  test('When hiddenFields in model, non-attribute fields must be hidden', async () => {
    global.strapi = {};

    let entity = { foo: 'foo', bar: 'bar', imhere: true, hideme: 'should be hidden' };
    let sanitized = sanitizeEntity(entity, { model: modelWithHiddenFields });

    expect(sanitized).toEqual({ imhere: true, bar: 'bar' });
  });

  test('When hiddenFields in model and strapi global config, non-attribute fields must be hidden', async () => {
    global.strapi = {
      config: {
        currentEnvironment: {
          response: {
            hiddenFields: ['hidemeglobal'],
          },
        },
      },
    };

    let entity = {
      foo: 'foo',
      bar: 'bar',
      imhere: true,
      hideme: 'should be hidden',
      hidemeglobal: 'should be hidden',
    };
    let sanitized = sanitizeEntity(entity, { model: modelWithHiddenFields });

    expect(sanitized).toEqual({ imhere: true, bar: 'bar' });
  });
});
