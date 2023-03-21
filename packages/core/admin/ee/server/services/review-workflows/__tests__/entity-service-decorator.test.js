'use strict';

const { decorator } = require('../entity-service-decorator')();

const { getService } = require('../../../utils');

jest.mock('../../../utils');

const rwModel = {
  options: {
    reviewWorkflows: true,
  },
};

const model = {
  options: {
    reviewWorkflows: false,
  },
};

const models = {
  'test-model': rwModel,
  'non-rw-model': model,
};

describe('Entity service decorator', () => {
  beforeAll(() => {
    global.strapi = {
      getModel(uid) {
        return models[uid || 'test-model'];
      },
    };
  });

  describe('Create', () => {
    test('Calls original create for non review workflow content types', async () => {
      const entry = {
        id: 1,
      };

      const defaultService = {
        create: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.create('non-rw-model', input);

      expect(defaultService.create).toHaveBeenCalledWith('non-rw-model', input);
    });

    test('Assigns default stage to new review workflow entity', async () => {
      const assignSpy = jest.fn();
      getService.mockImplementation(() => ({ assignEntityDefaultStage: assignSpy }));

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
      expect(assignSpy).toHaveBeenCalledWith('test-model', expect.anything());
    });
  });
});
