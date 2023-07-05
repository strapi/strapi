'use strict';

jest.mock('../localizations', () => {
  return () => ({
    syncLocalizations: jest.fn(async () => {}),
    syncNonLocalizedAttributes: jest.fn(async () => {}),
  });
});

const { decorator } = require('../entity-service-decorator')();
const localizations = require('../localizations')();
const locales = require('../locales')();
const contentTypes = require('../content-types')();

const { syncLocalizations, syncNonLocalizedAttributes } = localizations;

const model = {
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
};

const nonLocalizedModel = {
  pluginOptions: {
    i18n: {
      localized: false,
    },
  },
};

const singleTypeModel = {
  kind: 'singleType',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {}
};

const models = {
  'test-model': model,
  'non-localized-model': nonLocalizedModel,
  'localized-single-type-model': singleTypeModel,
};

const testModels = [['test-model'], ['non-localized-model'], ['localized-single-type-model']];

describe('Entity service decorator', () => {
  beforeAll(() => {
    global.strapi = {
      plugins: {
        i18n: {
          services: {
            locales,
            'content-types': contentTypes,
            localizations,
          },
        },
      },
      query() {
        return {
          create() {},
          update() {},
        };
      },
      entityService: {
        findOne() {},
      },
      getModel(uid) {
        return models[uid || 'test-model'];
      },
      store: () => ({ get: () => 'en' }),
    };
  });

  beforeEach(() => {
    syncLocalizations.mockClear();
    syncNonLocalizedAttributes.mockClear();
  });

  describe('wrapParams', () => {
    test('Calls original wrapParams', async () => {
      const defaultService = {
        wrapParams: jest.fn(() => Promise.resolve('li')),
      };

      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      await service.wrapParams(input, { uid: 'test-model' });

      expect(defaultService.wrapParams).toHaveBeenCalledWith(input, { uid: 'test-model' });
    });

    test('Does not wrap options if model is not localized', async () => {
      const defaultService = {
        wrapParams: jest.fn((opts) => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      const output = await service.wrapParams(input, { uid: 'non-localized-model' });

      expect(output).toStrictEqual(input);
    });

    test('does not change non params options', async () => {
      const defaultService = {
        wrapParams: jest.fn((opts) => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      const output = await service.wrapParams(input, { uid: 'test-model' });

      expect(output.populate).toStrictEqual(input.populate);
    });

    test('Adds locale param', async () => {
      const defaultService = {
        wrapParams: jest.fn((opts) => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      const output = await service.wrapParams(input, { uid: 'test-model' });

      expect(output).toMatchObject({ filters: { $and: [{ locale: 'en' }] } });
    });

    const testData = [
      ['findOne', { filters: { id: 1 } }],
      ['update', { filters: { id: 1 } }],
      ['delete', { filters: { id: 1 } }],
      ['delete', { filters: { id: { $in: [1] } } }],
      ['findOne', { filters: [{ id: 1 }] }],
      ['update', { filters: [{ id: 1 }] }],
      ['delete', { filters: [{ id: 1 }] }],
      ['delete', { filters: [{ id: { $in: [1] } }] }],
    ];

    test.each(testModels)('Always uses original wrapParams in output - %s', async (modelName) => {
      const defaultService = {
        wrapParams: jest.fn(() => Promise.resolve({ Test: 'Test' })),
      };
      const service = decorator(defaultService);

      const output = await service.wrapParams({}, { uid: modelName, action: 'findMany' });

      expect(output.Test).toEqual('Test');
    });
    test.each(testData)(
      "Doesn't add locale param when the params contain id or id_in - %s",
      async (action, params) => {
        const defaultService = {
          wrapParams: jest.fn((opts) => Promise.resolve(opts)),
        };
        const service = decorator(defaultService);

        const input = { populate: ['test'], ...params };
        const output = await service.wrapParams(input, { uid: 'test-model', action });

        expect(output).toEqual({ populate: ['test'], ...params });
      }
    );

    test('Replaces locale param', async () => {
      const defaultService = {
        wrapParams: jest.fn((opts) => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = {
        locale: 'fr',
        populate: ['test'],
      };
      const output = await service.wrapParams(input, { uid: 'test-model' });

      expect(output).toMatchObject({ filters: { $and: [{ locale: 'fr' }] } });
    });
  });

  describe('create', () => {
    test('Calls original create', async () => {
      const entry = {
        id: 1,
      };

      const defaultService = {
        create: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.create('test-model', input);

      expect(defaultService.create).toHaveBeenCalledWith('test-model', input);
    });

    test('Calls syncLocalizations if model is localized', async () => {
      const entry = {
        id: 1,
        localizations: [{ id: 2 }],
      };

      const defaultService = {
        create: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.create('test-model', input);

      expect(defaultService.create).toHaveBeenCalledWith('test-model', input);
      expect(syncLocalizations).toHaveBeenCalledWith(entry, { model });
    });

    test('Skip processing if model is not localized', async () => {
      const entry = {
        id: 1,
        localizations: [{ id: 2 }],
      };

      const defaultService = {
        create: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      const output = await service.create('non-localized-model', input);

      expect(defaultService.create).toHaveBeenCalledWith('non-localized-model', input);
      expect(syncLocalizations).not.toHaveBeenCalled();
      expect(output).toStrictEqual(entry);
    });
  });

  describe('update', () => {
    test('Calls original update', async () => {
      const entry = {
        id: 1,
      };

      const defaultService = {
        update: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.update('test-model', 1, input);

      expect(defaultService.update).toHaveBeenCalledWith('test-model', 1, input);
    });

    test('Calls syncNonLocalizedAttributes if model is localized', async () => {
      const entry = {
        id: 1,
        localizations: [{ id: 2 }],
      };

      const defaultService = {
        update: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      const output = await service.update('test-model', 1, input);

      expect(defaultService.update).toHaveBeenCalledWith('test-model', 1, input);
      expect(syncNonLocalizedAttributes).toHaveBeenCalledWith(entry, { model });
      expect(output).toStrictEqual(entry);
    });

    test('Skip processing if model is not localized', async () => {
      const entry = {
        id: 1,
        localizations: [{ id: 2 }],
      };

      const defaultService = {
        update: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.update('non-localized-model', 1, input);

      expect(defaultService.update).toHaveBeenCalledWith('non-localized-model', 1, input);
      expect(syncNonLocalizedAttributes).not.toHaveBeenCalled();
    });
  });

  describe('findMany', () => {
    test('Calls original findMany for non localized content type', async () => {
      const entry = {
        id: 1,
      };

      const defaultService = {
        findMany: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.findMany('non-localized-model', input);

      expect(defaultService.findMany).toHaveBeenCalledWith('non-localized-model', input);
    });

    test('calls db.findMany for localized collection type', async () => {
      const findManySpy = jest.fn();
      const db = {
        query: jest.fn(() => ({
          findMany: findManySpy,
        })),
      };
      global.strapi = {
        ...global.strapi,
        getModel: jest.fn((uid) => models[uid || 'test-model']),
        db,
      };

      const entry = {
        id: 1,
        localizations: [{ id: 2 }],
      };

      const defaultService = {
        wrapParams: jest.fn(() => Promise.resolve(entry)),
        findMany: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.findMany('test-model', input);

      expect(global.strapi.getModel).toHaveBeenCalledWith('test-model');
      expect(defaultService.findMany).toBeCalled();
    });

    describe('single types', () => {
      const entry = {
        id: 1,
        localizations: [{ id: 2 }],
      };

      const defaultService = {
        wrapResult: jest.fn((input) => Promise.resolve(input)),
        wrapParams: jest.fn(() => Promise.resolve(entry)),
        findMany: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      test('calls db.findMany for single type with locale=all', async () => {
        const findManySpy = jest.fn();
        const db = {
          query: jest.fn(() => ({
            findMany: findManySpy,
          })),
        };
        global.strapi = {
          ...global.strapi,
          getModel: jest.fn((uid) => models[uid || 'test-model']),
          db,
        };
        const input = { data: { title: 'title ' }, locale: 'all' };
        await service.findMany('localized-single-type-model', input);

        expect(global.strapi.getModel).toHaveBeenCalledWith('localized-single-type-model');
        expect(global.strapi.db.query).toBeCalled();
      });

      test('calls db.findMany for single type with no local param', async () => {
        const findOneSpy = jest.fn(() => Promise.resolve(entry));
        const db = {
          query: jest.fn(() => ({
            findOne: findOneSpy,
          })),
        };
        global.strapi = {
          ...global.strapi,
          getModel: jest.fn((uid) => models[uid || 'test-model']),
          db,
        };
        const input = { data: { title: 'title ' } };
        await service.findMany('localized-single-type-model', input);

        expect(global.strapi.getModel).toHaveBeenCalledWith('localized-single-type-model');
        expect(defaultService.findMany).toHaveBeenCalledWith('localized-single-type-model', {
          data: { title: 'title ' },
        });
      });
    });
  });
});
