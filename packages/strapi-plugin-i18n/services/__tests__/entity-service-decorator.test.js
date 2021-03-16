'use strict';

jest.mock('../localizations', () => {
  return {
    syncLocalizations: jest.fn(async () => {}),
    updateNonLocalizedFields: jest.fn(async () => {}),
  };
});

const { decorator } = require('../entity-service-decorator');
const { syncLocalizations, updateNonLocalizedFields } = require('../localizations');

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
    updateNonLocalizedFields.mockClear();
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

    test('Calls updateNonLocalizedFields if model is localized', async () => {
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
      expect(updateNonLocalizedFields).toHaveBeenCalledWith(entry, { model });
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
      expect(updateNonLocalizedFields).not.toHaveBeenCalled();
    });
  });
});
