'use strict';

const { omit } = require('lodash/fp');
const { WORKFLOW_UPDATE_STAGE } = require('../../../constants/webhookEvents');
const { ENTITY_STAGE_ATTRIBUTE } = require('../../../constants/workflows');
const { decorator } = require('../entity-service-decorator')();
const utils = require('../../../utils');

jest.mock('../../../utils', () => {
  const workflowsMock = {
    getAssignedWorkflow: jest.fn(() => ({ id: 1, stages: [{ id: 1, name: 'To Do' }] })),
  };

  return {
    getService: jest.fn(() => workflowsMock),
  };
});

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
      entityService: {
        findOne: jest.fn(),
      },
    };
  });

  describe('Create', () => {
    test('Calls original create for non review workflow content types', async () => {
      utils.getService().getAssignedWorkflow.mockReturnValueOnce(null);
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
          [ENTITY_STAGE_ATTRIBUTE]: 1,
        },
      });
    });
  });

  describe('Update', () => {
    const uid = 'test-model';

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
      const entityId = 10;
      const workflowId = 1;
      const stageFromId = 2;
      const stageToId = 3;

      const defaultService = {
        update: jest.fn(() =>
          Promise.resolve({
            id: entityId,
            [ENTITY_STAGE_ATTRIBUTE]: {
              id: stageToId,
              name: `Stage ${stageToId}`,
              workflow: { id: workflowId },
            },
          })
        ),
      };

      const emit = jest.fn();
      global.strapi = {
        ...global.strapi,
        entityService: {
          findOne: jest.fn(() => {
            return {
              [ENTITY_STAGE_ATTRIBUTE]: {
                id: stageFromId,
                name: `Stage ${stageFromId}`,
                workflow: { id: workflowId },
              },
            };
          }),
          emitEvent: jest.fn(),
        },
        getModel: jest.fn(() => ({
          modelName: uid,
          uid,
        })),
        eventHub: {
          emit,
        },
      };

      const service = decorator(defaultService);

      const input = { data: { title: 'title ', [ENTITY_STAGE_ATTRIBUTE]: stageToId } };
      await service.update(uid, entityId, input);

      expect(defaultService.update).toHaveBeenCalledWith(uid, entityId, input);

      expect(emit).toHaveBeenCalledWith(WORKFLOW_UPDATE_STAGE, {
        entity: { id: entityId },
        model: uid,
        uid,
        workflow: {
          id: workflowId,
          stages: {
            from: {
              id: stageFromId,
              name: `Stage ${stageFromId}`,
            },
            to: {
              id: stageToId,
              name: `Stage ${stageToId}`,
            },
          },
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
      const input = { data: { title: 'title ', [ENTITY_STAGE_ATTRIBUTE]: null } };
      await service.update(uid, id, input);

      expect(defaultService.update).toHaveBeenCalledWith(uid, id, {
        ...input,
        data: {
          ...omit(ENTITY_STAGE_ATTRIBUTE, input.data),
        },
      });
    });
  });
});
