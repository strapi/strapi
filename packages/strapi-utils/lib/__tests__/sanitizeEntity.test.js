const sanitizeEntity = require('../sanitize-entity');

const modelWithPublicOnlyAttributes = {
  kind: 'collectionType',
  collectionName: 'test_model',
  info: {
    name: 'Model with public only attributes',
    description: '',
  },
  options: {
    increments: true,
    timestamps: true,
    comment: '',
  },
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
  kind: 'collectionType',
  collectionName: 'test_model',
  info: {
    name: 'Model with private attributes',
    description: '',
  },
  options: {
    increments: true,
    timestamps: true,
    comment: '',
  },
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

const modelWithPassword = {
  kind: 'collectionType',
  collectionName: 'test_model',
  info: {
    name: 'Model with password',
    description: '',
  },
  options: {
    increments: true,
    timestamps: true,
    comment: '',
  },
  attributes: {
    foo: {
      type: 'password',
    },
    bar: {
      type: 'string',
    },
  },
};

const modelWithOptionPrivateAttributes = {
  kind: 'collectionType',
  collectionName: 'test_model',
  info: {
    name: 'Model with option.privateAttributes',
    description: '',
  },
  options: {
    increments: true,
    timestamps: true,
    comment: '',
    privateAttributes: ['hideme'],
  },
  attributes: {
    foo: {
      type: 'string',
    },
    bar: {
      type: 'string',
    },
  },
};

const modelWithGlobalIgnore = {
  kind: 'collectionType',
  collectionName: 'test_model',
  info: {
    name: 'Model with global ignore',
    description: '',
  },
  options: {
    increments: true,
    timestamps: true,
    comment: '',
    ignoreGlobalPrivateAttributes: true,
  },
  attributes: {
    foo: {
      type: 'string',
    },
    bar: {
      type: 'string',
    },
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

  test('When no private attributes in model, then all attributes must be returned', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, { model: modelWithPublicOnlyAttributes });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar' });
  });

  test('When private attributes in model, then all private attributes must be hidden', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, { model: modelWithPrivatesAttributes });

    expect(sanitized).toEqual({ bar: 'bar' });
  });

  test('When withPrivate = true, then all the attributes must be returned', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, {
      model: modelWithPrivatesAttributes,
      withPrivate: true,
    });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar' });
  });

  test('When isOutput = false, then all the attributes must be returned', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, {
      model: modelWithPrivatesAttributes,
      isOutput: false,
    });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar' });
  });

  test('When attribute type is password, then it must be hidden', async () => {
    let entity = { foo: 'foo', bar: 'bar' };
    let sanitized = sanitizeEntity(entity, { model: modelWithPassword });

    expect(sanitized).toEqual({ bar: 'bar' });
  });

  test('When non-attribute fields are present, all must be returned', async () => {
    let entity = { foo: 'foo', bar: 'bar', imhere: true };
    let sanitized = sanitizeEntity(entity, { model: modelWithPublicOnlyAttributes });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar', imhere: true });
  });

  test('When options.privateAttributes in model, non-attribute fields must be hidden', async () => {
    let entity = { foo: 'foo', bar: 'bar', imhere: true, hideme: 'should be hidden' };
    let sanitized = sanitizeEntity(entity, { model: modelWithOptionPrivateAttributes });

    expect(sanitized).toEqual({ imhere: true, foo: 'foo', bar: 'bar' });
  });

  test('When privateAttributes in model and global config, non-attribute fields must be hidden', async () => {
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

    expect(sanitized).toEqual({ imhere: true, foo: 'foo', bar: 'bar' });
  });

  test('When ignoreGlobalPrivateAttributes in model, global private attributes must be returned', async () => {
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
      hidemeglobal: 'should be returned',
    };
    let sanitized = sanitizeEntity(entity, { model: modelWithGlobalIgnore });

    expect(sanitized).toEqual({ foo: 'foo', bar: 'bar', hidemeglobal: 'should be returned' });
  });
});
