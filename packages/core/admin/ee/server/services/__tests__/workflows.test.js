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

jest.mock('../review-workflows/workflows/content-types', () => {
  return jest.fn(() => ({
    migrate: jest.fn(),
  }));
});

const workflowsServiceFactory = require('../review-workflows/workflows');
const { WORKFLOW_MODEL_UID, WORKFLOW_POPULATE } = require('../../constants/workflows');

const workflowMock = {
  id: 1,
};

const entityServiceMock = {
  findOne: jest.fn(() => workflowMock),
  findMany: jest.fn(() => [workflowMock]),
  update: jest.fn(() => [workflowMock]),
  create: jest.fn(() => [workflowMock]),
};

const contentManagerServicesMock = {
  'content-types': {
    updateConfiguration: jest.fn(() => Promise.resolve()),
  },
};

const pluginsMock = {
  'content-manager': {
    service: jest.fn((name) => contentManagerServicesMock[name]),
  },
};

const reviewWorkflowsValidationMock = {
  validateWorkflowCount: jest.fn().mockResolvedValue(true),
  validateWorkflowStages: jest.fn(),
};

const stagesMock = [
  {
    id: 1,
  },
  { id: 2 },
];

const servicesMock = {
  'admin::review-workflows-validation': reviewWorkflowsValidationMock,
  'admin::review-workflows-metrics': {
    sendDidCreateWorkflow: jest.fn(),
    sendDidEditWorkflow: jest.fn(),
  },
  'admin::stages': {
    replaceStages: jest.fn(async () => stagesMock),
    createMany: jest.fn(async () => stagesMock),
  },
  'admin::stage-permissions': {
    register: jest.fn(),
    registerMany: jest.fn(),
    unregister: jest.fn(),
    can: jest.fn(() => true),
  },
};

const strapiMock = {
  entityService: entityServiceMock,
  plugin: jest.fn((name) => pluginsMock[name]),
  service: jest.fn((serviceName) => servicesMock[serviceName]),
  db: {
    transaction: jest.fn((func) => func()),
  },
};

const workflowsService = workflowsServiceFactory({ strapi: strapiMock });

describe('Review workflows - Workflows service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    test('Should call entityService with the right model UID and ID', async () => {
      workflowsService.find({ opt1: 1 });

      expect(entityServiceMock.findOne).not.toBeCalled();
      expect(entityServiceMock.findMany).toBeCalled();
      expect(entityServiceMock.findMany).toBeCalledWith(WORKFLOW_MODEL_UID, {
        opt1: 1,
        filters: {},
      });
    });
  });

  describe('findById', () => {
    test('Should call entityService with the right model UID', async () => {
      workflowsService.findById(1, {});

      expect(entityServiceMock.findMany).not.toBeCalled();
      expect(entityServiceMock.findOne).toBeCalled();
      expect(entityServiceMock.findOne).toBeCalledWith(WORKFLOW_MODEL_UID, 1, {});
    });
  });

  describe('update', () => {
    const uid = 'uid';
    const workflow = {
      id: 1,
      name: 'Default',
      contentTypes: [uid],
      stages: [
        {
          id: 1,
          name: 'To do',
          color: '#4945FF',
        },
        {
          id: 2,
          name: 'Ready to review',
          color: '#4945FF',
        },
      ],
    };

    const opts = {
      data: {
        ...workflow,
        stages: workflow.stages.map((stage) => {
          if (stage.id === 1) {
            return {
              ...stage,
              name: 'Update',
            };
          }
          return stage;
        }),
      },
      populate: WORKFLOW_POPULATE,
    };

    test('Should call entityService with the right model UID', async () => {
      await workflowsService.update(workflow, opts);

      expect(entityServiceMock.update).toBeCalledWith(WORKFLOW_MODEL_UID, workflow.id, {
        data: {
          contentTypes: [uid],
          id: workflow.id,
          name: 'Default',
          stages: workflow.stages.map((stage) => stage.id),
        },
        populate: WORKFLOW_POPULATE,
      });
      expect(servicesMock['admin::review-workflows-metrics'].sendDidEditWorkflow).toBeCalled();
    });
  });

  describe('create', () => {
    const uid = 'uid';
    const opts = {
      data: {
        name: 'Workflow',
        contentTypes: [uid],
        stages: [
          {
            color: '#4945ff',
            name: 'Stage 1',
          },
        ],
      },
      populate: WORKFLOW_POPULATE,
    };

    test('Should call entityService with the right model UID', async () => {
      await workflowsService.create(opts);

      expect(entityServiceMock.create).toBeCalledWith(WORKFLOW_MODEL_UID, {
        data: {
          contentTypes: [uid],
          name: 'Workflow',
          stages: stagesMock.map((stage) => stage.id),
        },
        populate: WORKFLOW_POPULATE,
      });
      expect(servicesMock['admin::review-workflows-metrics'].sendDidCreateWorkflow).toBeCalled();
    });
  });
});
