'use strict';

jest.mock('@strapi/strapi/dist/utils/ee', () => {
  const eeModule = () => true;

  Object.assign(eeModule, {
    features: {
      isEnabled() {
        return true;
      },
      getEnabled() {
        return ['review-workflows'];
      },
    },
  });

  return eeModule;
});

const { cloneDeep } = require('lodash/fp');

const stageFactory = require('../review-workflows/stages');
const { STAGE_MODEL_UID } = require('../../constants/workflows');

const stageMock = {
  id: 1,
  name: 'test',
  workflow: 1,
};

const relatedUID = 'uid';
const workflowMock = {
  id: 1,
  stages: [
    stageMock,
    { id: 2, name: 'in progress', workflow: 1 },
    {
      id: 3,
      name: 'ready to review',
      related: [{ id: 3, __type: relatedUID }],
      workflow: 1,
    },
    {
      id: 4,
      name: 'done',
      related: [
        { id: 1, __type: relatedUID },
        { id: 2, __type: relatedUID },
      ],
      workflow: 1,
    },
  ],
};

const entityServiceMock = {
  findOne: jest.fn((uid, id) => workflowMock.stages.find((stage) => stage.id === id) || { id }),
  findMany: jest.fn(() => [stageMock]),
  create: jest.fn((uid, { data }) => ({
    ...data,
    id: data?.id || Math.floor(Math.random() * 1000),
  })),
  update: jest.fn((uid, id, { data }) => data),
  delete: jest.fn(() => true),
};
const servicesMock = {
  'admin::workflows': {
    findById: jest.fn(() => workflowMock),
    update: jest.fn((id, data) => data),
  },
  'admin::review-workflows-metrics': {
    sendDidCreateStage: jest.fn(),
    sendDidEditStage: jest.fn(),
    sendDidDeleteStage: jest.fn(),
    sendDidChangeEntryStage: jest.fn(),
  },
  'admin::review-workflows-validation': {
    register: jest.fn(),
    validateWorkflowCount: jest.fn().mockResolvedValue(true),
    validateWorkflowStages: jest.fn(),
  },
  'admin::stage-permissions': {
    register: jest.fn(),
    registerMany: jest.fn(),
    unregister: jest.fn(),
    can: jest.fn(() => true),
  },
};

const queryUpdateMock = jest.fn(() => Promise.resolve());

const strapiMock = {
  query: jest.fn(() => ({
    findOne: jest.fn(() => workflowMock),
  })),
  entityService: entityServiceMock,
  service: jest.fn((serviceName) => {
    return servicesMock[serviceName];
  }),
  db: {
    transaction: jest.fn((func) => func({})),
    query: jest.fn(() => ({
      updateMany: queryUpdateMock,
    })),
    metadata: {
      get: () => ({
        tableName: 'test',
        attributes: {
          strapi_stage: {
            joinColumn: {
              name: 'strapi_stage_id',
            },
          },
        },
      }),
    },
  },
  contentTypes: {
    'api::shop.shop': {
      kind: 'collectionType',
      collectionName: 'shop',
      options: {
        reviewWorkflows: true,
      },
    },
  },
};

const stagesService = stageFactory({ strapi: strapiMock });

describe('Review workflows - Stages service', () => {
  let mockUpdateEntitiesStage;
  beforeEach(() => {
    mockUpdateEntitiesStage = jest
      .spyOn(stagesService, 'updateEntitiesStage')
      .mockImplementation(() => {
        return Promise.resolve();
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockUpdateEntitiesStage.mockRestore();
  });

  describe('find', () => {
    test('Should call entityService with the right model UID and ID', async () => {
      stagesService.find({ workflowId: 1 });

      expect(entityServiceMock.findOne).not.toBeCalled();
      expect(entityServiceMock.findMany).toBeCalled();
      expect(entityServiceMock.findMany).toBeCalledWith(STAGE_MODEL_UID, {
        filters: { workflow: 1 },
      });
    });
  });
  describe('findById', () => {
    test('Should call entityService with the right model UID', async () => {
      stagesService.findById(1, { workflowId: 1 });

      expect(entityServiceMock.findMany).not.toBeCalled();
      expect(entityServiceMock.findOne).toBeCalled();
      expect(entityServiceMock.findOne).toBeCalledWith(STAGE_MODEL_UID, 1, {});
    });
  });
  describe('replaceStages', () => {
    test('Should create a new stage and assign it to workflow', async () => {
      await stagesService.replaceStages(
        [...workflowMock.stages],
        [...workflowMock.stages, { name: 'to publish' }]
      );

      expect(entityServiceMock.create).toBeCalled();
      expect(entityServiceMock.update).not.toBeCalled();
      expect(entityServiceMock.delete).not.toBeCalled();
    });
    test('Should update a stage contained in the workflow', async () => {
      const updateStages = cloneDeep(workflowMock.stages);
      updateStages[0].name = `${updateStages[0].name}(new value)`;

      await stagesService.replaceStages(workflowMock.stages, updateStages);

      expect(entityServiceMock.create).not.toBeCalled();
      expect(entityServiceMock.update).toBeCalled();
      expect(entityServiceMock.delete).not.toBeCalled();
    });
    test('Should delete a stage contained in the workflow', async () => {
      const selectedIndexes = [0, 2, 3];
      await stagesService.replaceStages(
        workflowMock.stages,
        selectedIndexes.map((index) => workflowMock.stages[index])
      );

      expect(entityServiceMock.create).not.toBeCalled();
      expect(entityServiceMock.update).not.toBeCalled();
      expect(entityServiceMock.delete).toBeCalled();
    });

    // TODO: Fix when the updateEntitiesStage method is implemented
    test.skip('Should move entities in a deleted stage to the previous stage', async () => {
      await stagesService.replaceStages(workflowMock.stages, workflowMock.stages.slice(0, 3));

      expect(entityServiceMock.create).not.toBeCalled();
      expect(entityServiceMock.delete).toBeCalled();

      // Here we are only deleting the stage containing related IDs 1 & 2
      expect(stagesService.updateEntitiesStage).toHaveBeenCalledWith('api::shop.shop', {
        fromStageId: workflowMock.stages[3].id,
        toStageId: workflowMock.stages[2].id,
      });
    });

    test.skip('When deleting all stages, all entities should be moved to the new stage', async () => {
      const newStageID = 10;
      await stagesService.replaceStages(workflowMock.stages, [
        { id: newStageID, name: 'newStage', workflow: 1 },
      ]);

      expect(servicesMock['admin::workflows'].findById).toBeCalled();
      expect(entityServiceMock.create).toBeCalled();
      expect(entityServiceMock.delete).toBeCalled();

      // Here we are deleting all stages and expecting all entities to be moved to the new stage
      for (const stage of workflowMock.stages) {
        expect(stagesService.updateEntitiesStage).toHaveBeenCalledWith('api::shop.shop', {
          fromStageId: stage.id,
          toStageId: newStageID,
        });
      }

      expect(servicesMock['admin::workflows'].update).toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalledWith(workflowMock.id, {
        stages: [newStageID],
      });

      mockUpdateEntitiesStage.mockRestore();
    });

    test('New stage + updated + deleted', async () => {
      await stagesService.replaceStages(workflowMock.stages, [
        workflowMock.stages[0],
        { id: workflowMock.stages[1].id, name: 'new_name' },
        { name: 'new stage' },
        { name: 'new stage2' },
      ]);

      expect(entityServiceMock.create).toBeCalled();
      expect(entityServiceMock.update).toBeCalled();
      expect(entityServiceMock.delete).toBeCalled();
    });

    test('Undefined destination stage permissions should apply a partial permission update', async () => {
      const srcStages = workflowMock.stages.map((stage) => ({
        ...stage,
        permissions: [{ id: 1, role: 'role', action: 'action' }],
      }));

      const destStages = workflowMock.stages.map((stage, index) => ({
        ...stage,
        name: `Updated Name ${index}`,
      }));

      await stagesService.replaceStages(srcStages, destStages);

      expect(entityServiceMock.create).not.toBeCalled();
      expect(entityServiceMock.delete).not.toBeCalled();
      expect(entityServiceMock.update).toBeCalledTimes(4);

      destStages.forEach((stage, index) => {
        expect(entityServiceMock.update).toBeCalledWith('admin::workflow-stage', stage.id, {
          data: { ...stage, permissions: srcStages[index].permissions },
        });
      });
    });
  });
});
