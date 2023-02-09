'use strict';

jest.mock('@strapi/strapi/lib/utils/ee', () => {
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

const workflowMock = {
  id: 1,
  stages: [
    stageMock,
    {
      id: 2,
      name: 'in progress',
      workflow: 1,
    },
    {
      id: 3,
      name: 'done',
      workflow: 1,
    },
  ],
};

const entityServiceMock = {
  findOne: jest.fn(() => stageMock),
  findMany: jest.fn(() => [stageMock]),
  create: jest.fn((uid, { data }) => ({
    ...data,
    id: Math.floor(Math.random() * 1000),
  })),
  update: jest.fn((uid, id, { data }) => data),
  delete: jest.fn(() => true),
};
const servicesMock = {
  'admin::workflows': {
    findById: jest.fn(() => workflowMock),
    update: jest.fn((id, data) => data),
  },
};

const strapiMock = {
  entityService: entityServiceMock,
  service: jest.fn((serviceName) => {
    return servicesMock[serviceName];
  }),
  db: {
    transaction: jest.fn((func) => func()),
  },
};

const stagesService = stageFactory({ strapi: strapiMock });

describe('Review workflows - Stages service', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
      expect(entityServiceMock.findOne).toBeCalledWith(STAGE_MODEL_UID, 1, {
        filters: { workflow: 1 },
      });
    });
  });
  describe('replaceWorkflowStages', () => {
    test('Should create a new stage and assign it to workflow', async () => {
      await stagesService.replaceWorkflowStages(1, [
        ...workflowMock.stages,
        {
          name: 'to publish',
        },
      ]);

      expect(servicesMock['admin::workflows'].findById).toBeCalled();
      expect(entityServiceMock.create).toBeCalled();
      expect(entityServiceMock.update).not.toBeCalled();
      expect(entityServiceMock.delete).not.toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalled();
    });
    test('Should update a stage contained in the workflow', async () => {
      const updateStages = cloneDeep(workflowMock.stages);
      updateStages[0].name = `${updateStages[0].name}(new value)`;

      await stagesService.replaceWorkflowStages(1, updateStages);

      expect(servicesMock['admin::workflows'].findById).toBeCalled();
      expect(entityServiceMock.create).not.toBeCalled();
      expect(entityServiceMock.update).toBeCalled();
      expect(entityServiceMock.delete).not.toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalledWith(workflowMock.id, {
        stages: updateStages.map((stage) => stage.id),
      });
    });
    test('Should delete a stage contained in the workflow', async () => {
      await stagesService.replaceWorkflowStages(1, [workflowMock.stages[0]]);

      expect(servicesMock['admin::workflows'].findById).toBeCalled();
      expect(entityServiceMock.create).not.toBeCalled();
      expect(entityServiceMock.update).not.toBeCalled();
      expect(entityServiceMock.delete).toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalledWith(workflowMock.id, {
        stages: [workflowMock.stages[0].id],
      });
    });
    test('New stage + updated + deleted', async () => {
      await stagesService.replaceWorkflowStages(1, [
        workflowMock.stages[0],
        { id: workflowMock.stages[1].id, name: 'new_name' },
        { name: 'new stage' },
      ]);

      expect(servicesMock['admin::workflows'].findById).toBeCalled();
      expect(entityServiceMock.create).toBeCalled();
      expect(entityServiceMock.update).toBeCalled();
      expect(entityServiceMock.delete).toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalled();
      expect(servicesMock['admin::workflows'].update).toBeCalledWith(workflowMock.id, {
        stages: [workflowMock.stages[0].id, workflowMock.stages[1].id, expect.any(Number)],
      });
    });
  });
});
