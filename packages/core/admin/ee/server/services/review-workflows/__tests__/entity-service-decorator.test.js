'use strict';

const { omit } = require('lodash/fp');
const { decorator } = require('../entity-service-decorator')();

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
      query: () => ({
        findOne: () => ({
          id: 1,
          stages: [{ id: 1 }],
        }),
      }),
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
      const entry = {
        id: 1,
      };

      const defaultService = {
        create: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ' } };
      await service.create('test-model', input);

      expect(defaultService.create).toHaveBeenCalledWith('test-model', {
        ...input,
        data: {
          ...input.data,
          strapi_reviewWorkflows_stage: 1,
        },
      });
    });
  });

  describe('Update', () => {
    test('Calls original update for non review workflow content types', async () => {
      const entry = {
        id: 1,
      };

      const defaultService = {
        update: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const id = 1;
      const input = { data: { title: 'title ' } };
      await service.update('non-rw-model', id, input);

      expect(defaultService.update).toHaveBeenCalledWith('non-rw-model', id, input);
    });

    test('Assigns a stage to new review workflow entity', async () => {
      const entry = {
        id: 1,
      };

      const defaultService = {
        update: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const id = 1;
      const input = { data: { title: 'title ', strapi_reviewWorkflows_stage: 1 } };
      await service.update('test-model', id, input);

      expect(defaultService.update).toHaveBeenCalledWith('test-model', id, {
        ...input,
        data: {
          ...input.data,
          strapi_reviewWorkflows_stage: 1,
        },
      });
    });

    test('Can not assign a null stage to new review workflow entity', async () => {
      const entry = {
        id: 1,
      };

      const defaultService = {
        update: jest.fn(() => Promise.resolve(entry)),
      };

      const service = decorator(defaultService);

      const id = 1;
      const input = { data: { title: 'title ', strapi_reviewWorkflows_stage: null } };
      await service.update('test-model', id, input);

      expect(defaultService.update).toHaveBeenCalledWith('test-model', id, {
        ...input,
        data: {
          ...omit('strapi_reviewWorkflows_stage', input.data),
        },
      });
    });
  });
});
