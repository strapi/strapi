'use strict';

jest.mock('../localizations', () => {
  return {
    syncLocalizations: jest.fn(async () => {}),
    syncNonLocalizedAttributes: jest.fn(async () => {}),
  };
});

const { decorator } = require('../entity-service-decorator');
const { syncLocalizations, syncNonLocalizedAttributes } = require('../localizations');
const locales = require('../locales');
const contentTypes = require('../content-types');

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

const models = {
  'test-model': model,
  'non-localized-model': nonLocalizedModel,
};

describe('Entity service decorator', () => {
  beforeAll(() => {
    global.strapi = {
      plugins: {
        i18n: {
          services: {
            locales,
            'content-types': contentTypes,
          },
        },
      },
      query() {
        return {
          create() {},
          update() {},
        };
      },
      db: {
        getModel(uid) {
          return models[uid || 'test-model'];
        },
      },
      store: () => ({ get: () => 'en' }),
    };
  });

  beforeEach(() => {
    syncLocalizations.mockClear();
    syncNonLocalizedAttributes.mockClear();
  });

  describe('wrapOptions', () => {
    test('Calls original wrapOptions', async () => {
      const defaultService = {
        wrapOptions: jest.fn(() => Promise.resolve('li')),
      };

      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      await service.wrapOptions(input, { model: 'test-model' });

      expect(defaultService.wrapOptions).toHaveBeenCalledWith(input, { model: 'test-model' });
    });

    test('Does not wrap options if model is not localized', async () => {
      const defaultService = {
        wrapOptions: jest.fn(opts => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      const output = await service.wrapOptions(input, { model: 'non-localized-model' });

      expect(output).toStrictEqual(input);
    });

    test('does not change non params options', async () => {
      const defaultService = {
        wrapOptions: jest.fn(opts => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      const output = await service.wrapOptions(input, { model: 'test-model' });

      expect(output.populate).toStrictEqual(input.populate);
    });

    test('Adds locale param', async () => {
      const defaultService = {
        wrapOptions: jest.fn(opts => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = { populate: ['test'] };
      const output = await service.wrapOptions(input, { model: 'test-model' });

      expect(output).toMatchObject({ params: { locale: 'en' } });
    });

    const testData = [
      ['findOne', { id: 1 }],
      ['update', { id: 1 }],
      ['delete', { id: 1 }],
      ['delete', { id_in: [1] }],
      ['findOne', { _where: { id: 1 } }],
      ['update', { _where: { id: 1 } }],
      ['delete', { _where: { id: 1 } }],
      ['delete', { _where: { id_in: [1] } }],
      ['findOne', { _where: [{ id: 1 }] }],
      ['update', { _where: [{ id: 1 }] }],
      ['delete', { _where: [{ id: 1 }] }],
      ['delete', { _where: [{ id_in: [1] }] }],
    ];

    test.each(testData)(
      "Doesn't add locale param when the params contain id or id_in - %s",
      async (action, params) => {
        const defaultService = {
          wrapOptions: jest.fn(opts => Promise.resolve(opts)),
        };
        const service = decorator(defaultService);

        const input = Object.assign({ populate: ['test'], params });
        const output = await service.wrapOptions(input, { model: 'test-model', action });

        expect(output).toEqual({ populate: ['test'], params });
      }
    );

    test('Replaces _locale param', async () => {
      const defaultService = {
        wrapOptions: jest.fn(opts => Promise.resolve(opts)),
      };
      const service = decorator(defaultService);

      const input = {
        params: {
          _locale: 'fr',
        },
        populate: ['test'],
      };
      const output = await service.wrapOptions(input, { model: 'test-model' });

      expect(output).toMatchObject({ params: { locale: 'fr' } });
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
      await service.create(input, { model: 'test-model' });

      expect(defaultService.create).toHaveBeenCalledWith(input, { model: 'test-model' });
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
      await service.create(input, { model: 'test-model' });

      expect(defaultService.create).toHaveBeenCalledWith(input, { model: 'test-model' });
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
      const output = await service.create(input, { model: 'non-localized-model' });

      expect(defaultService.create).toHaveBeenCalledWith(input, { model: 'non-localized-model' });
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

      const input = { params: { id: 1 }, data: { title: 'title ' } };
      await service.update(input, { model: 'test-model' });

      expect(defaultService.update).toHaveBeenCalledWith(input, { model: 'test-model' });
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

      const input = { params: { id: 1 }, data: { title: 'title ' } };
      const output = await service.update(input, { model: 'test-model' });

      expect(defaultService.update).toHaveBeenCalledWith(input, { model: 'test-model' });
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

      const input = { params: { id: 1 }, data: { title: 'title ' } };
      await service.update(input, { model: 'non-localized-model' });

      expect(defaultService.update).toHaveBeenCalledWith(input, { model: 'non-localized-model' });
      expect(syncNonLocalizedAttributes).not.toHaveBeenCalled();
    });
  });
});
