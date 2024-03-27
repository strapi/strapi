import { queryParams } from '@strapi/utils';

import type { Core } from '@strapi/types';
import workflowsServiceFactory from '../review-workflows/workflows';
import { WORKFLOW_MODEL_UID, WORKFLOW_POPULATE, STAGE_MODEL_UID } from '../../constants/workflows';
import workflowCT from '../../content-types/workflow';
import workflowStageCT from '../../content-types/workflow-stage';
import CTS from '../../../../../server/src/content-types';

jest.mock('../review-workflows/workflows/content-types', () => {
  return jest.fn(() => ({
    migrate: jest.fn(),
  }));
});

const workflowMock = {
  id: 1,
};

const dbMock: Record<string, any> = {
  findOne: jest.fn(() => workflowMock),
  findMany: jest.fn(() => [workflowMock]),
  update: jest.fn(() => [workflowMock]),
  create: jest.fn(() => [workflowMock]),
};

const contentManagerServicesMock: Record<string, any> = {
  'content-types': {
    updateConfiguration: jest.fn(() => Promise.resolve()),
  },
};

const pluginsMock: Record<string, any> = {
  'content-manager': {
    service: jest.fn((name) => contentManagerServicesMock[name]),
  },
};

const reviewWorkflowsValidationMock: Record<string, any> = {
  validateWorkflowCount: jest.fn().mockResolvedValue(true),
  validateWorkflowStages: jest.fn(),
};

const stagesMock = [
  {
    id: 1,
  },
  { id: 2 },
];

const servicesMock: Record<string, any> = {
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
  EE: true,
  ee: {
    features: {
      isEnabled() {
        return true;
      },
      getEnabled() {
        return ['review-workflows'];
      },
    },
  },
  plugin: jest.fn((name) => pluginsMock[name]),
  service: jest.fn((serviceName) => servicesMock[serviceName]),
  db: {
    query: () => dbMock,
    transaction: jest.fn((func) => func()),
  },
  get(name: string) {
    if (name === 'query-params') {
      const transformer = queryParams.createTransformer({
        getModel(name: string) {
          return strapi.getModel(name as any);
        },
      });

      return {
        transform: transformer.transformQueryParams,
      };
    }
  },
} as unknown as Core.LoadedStrapi;

const ctMap: Record<string, any> = {
  [WORKFLOW_MODEL_UID]: workflowCT.schema,
  [STAGE_MODEL_UID]: workflowStageCT.schema,
  ['admin::permission']: CTS.permission.schema,
  ['admin::role']: CTS.role.schema,
};

global.strapi = {
  getModel(uid: string) {
    return ctMap[uid];
  },
} as any;

const workflowsService = workflowsServiceFactory({ strapi: strapiMock });

describe('Review workflows - Workflows service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('find', () => {
    test('Should call the db with the right model UID and ID', async () => {
      workflowsService.find({ opt1: 1 });

      expect(dbMock.findOne).not.toBeCalled();
      expect(dbMock.findMany).toBeCalled();
      expect(dbMock.findMany).toBeCalledWith({
        opt1: 1,
        where: {},
      });
    });
  });

  describe('findById', () => {
    test('Should call the db with the right model UID', async () => {
      workflowsService.findById(1, {});

      expect(dbMock.findMany).not.toBeCalled();
      expect(dbMock.findOne).toBeCalled();
      expect(dbMock.findOne).toBeCalledWith({ where: { id: 1 } });
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

    test('Should call the db with the right model UID', async () => {
      await workflowsService.update(workflow, opts);

      expect(dbMock.update).toBeCalledWith({
        where: {
          id: workflow.id,
        },
        data: {
          contentTypes: [uid],
          id: workflow.id,
          name: 'Default',
          stages: workflow.stages.map((stage) => stage.id),
        },
        populate: {
          stages: {
            populate: {
              permissions: {
                select: ['id', 'documentId', 'action', 'actionParameters'],
                populate: {
                  role: { select: ['id', 'documentId', 'name'] },
                },
              },
            },
          },
        },
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

    test('Should call the db with the right model UID', async () => {
      await workflowsService.create(opts);

      expect(dbMock.create).toBeCalledWith({
        data: {
          contentTypes: [uid],
          name: 'Workflow',
          stages: stagesMock.map((stage) => stage.id),
        },
        populate: {
          stages: {
            populate: {
              permissions: {
                select: ['id', 'documentId', 'action', 'actionParameters'],
                populate: {
                  role: { select: ['id', 'documentId', 'name'] },
                },
              },
            },
          },
        },
      });
      expect(servicesMock['admin::review-workflows-metrics'].sendDidCreateWorkflow).toBeCalled();
    });
  });
});
