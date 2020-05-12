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
};

const modelWithOptionPrivateAttributes = {
  attributes: {
    foo: {
      type: 'string',
      private: true,
    },
    bar: {
      type: 'string',
    },
  },
  options: {
    privateAttributes: ['hideme', '_hideme'],
  },
};

describe('Sanitize Entity', () => {
  beforeEach(() => {
    global.strapi = {
      config: {
        get: jest.fn,
      },
    };
  });

  test('When no private fields in model, then all field must be returned', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, { model: modelWithPublicOnlyAttributes });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar' });
  });

  test('When private fields in model, then private fields must be hidden', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, { model: modelWithPrivatesAttributes });

    expect(sanitized).toEqual({ bar: 'bar' });
  });

  test('When withprivate=true, then private fields must be returned', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, {
      model: modelWithPrivatesAttributes,
      withPrivate: true,
    });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar' });
  });

  test('When non-attributes fields in model, must be returned', async () => {
    let entity = { foo: 'foo', bar: 'bar', imhere: true };
    let sanitized = sanitizeEntity(entity, { model: modelWithPublicOnlyAttributes });

    expect(sanitized).toEqual({ imhere: true, foo: 'foo', bar: 'bar' });
  });

  test('When options.privateFields in model, non-attribute fields must be hidden', async () => {
    let entity = { foo: 'foo', bar: 'bar', imhere: true, hideme: 'should be hidden' };
    let sanitized = sanitizeEntity(entity, { model: modelWithOptionPrivateAttributes });

    expect(sanitized).toEqual({ imhere: true, bar: 'bar' });
  });

  test('When hiddenFields in model and strapi global config, non-attribute fields must be hidden', async () => {
    global.strapi = {
      config: {
        get: jest.fn(path => {
          return path === 'api.responses.privateAttributes' ? ['hidemeglobal'] : [];
        }),
      },
    };
    let entity = {
      foo: 'foo',
      bar: 'bar',
      imhere: true,
      hideme: 'should be hidden',
      hidemeglobal: 'should be hidden',
    };
    let sanitized = sanitizeEntity(entity, { model: modelWithOptionPrivateAttributes });

    expect(sanitized).toEqual({ imhere: true, bar: 'bar' });
  });
});
