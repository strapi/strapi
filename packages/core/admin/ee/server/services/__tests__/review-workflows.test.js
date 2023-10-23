'use strict';

const reviewWorkflowsServiceFactory = require('../review-workflows/review-workflows');
const { ENTITY_STAGE_ATTRIBUTE, ENTITY_ASSIGNEE_ATTRIBUTE } = require('../../constants/workflows');

const workflowMock = {
  id: 1,
};
const stagesMock = [
  {
    id: 1,
    name: 'stage 1',
  },
  {
    id: 2,
    name: 'stage 2',
  },
  {
    id: 3,
    name: 'stage 3',
  },
];

const workflowsServiceMock = {
  count: jest.fn(() => 0),
  create: jest.fn(() => workflowMock),
};
const stagesServiceMock = {
  count: jest.fn(() => 0),
  createMany: jest.fn(() => stagesMock),
};

const queryMock = {
  findOne: jest.fn(),
};

const contentTypesMock = {
  test1: {
    options: {},
    attributes: {},
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
    },
    collectionName: 'test1',
  },
  test2: {
    attributes: {},
    collectionName: 'test2',
  },
};

const contentTypesContainer = {
  get: jest.fn((uid) => contentTypesMock[uid]),
  extend: jest.fn((uid, callback) => callback(contentTypesMock[uid])),
};

const containerMock = {
  get: jest.fn((container) => {
    switch (container) {
      case 'content-types':
        return contentTypesContainer;
      default:
        return null;
    }
  }),
};

const reviewWorkflowsValidationMock = {
  register: jest.fn(),
  validateWorkflowCount: jest.fn().mockResolvedValue(true),
  validateWorkflowStages: jest.fn(),
};

const hookMock = jest.fn().mockReturnValue({ register: jest.fn() });

const strapiMock = {
  contentTypes: contentTypesMock,
  container: containerMock,
  hook: hookMock,
  query: jest.fn(() => queryMock),
  service(serviceName) {
    switch (serviceName) {
      case 'admin::stages':
        return stagesServiceMock;
      case 'admin::workflows':
        return workflowsServiceMock;
      case 'admin::review-workflows-validation':
        return reviewWorkflowsValidationMock;
      default:
        return null;
    }
  },
  webhookStore: {
    addAllowedEvent: jest.fn(),
  },
};

const reviewWorkflowsService = reviewWorkflowsServiceFactory({ strapi: strapiMock });

describe('Review workflows service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bootstrap', () => {
    test('Without stages or workflows in DB', async () => {
      await reviewWorkflowsService.bootstrap();

      expect(workflowsServiceMock.count).toBeCalled();
      expect(stagesServiceMock.count).toBeCalled();

      expect(workflowsServiceMock.create).toBeCalled();
    });
    test('With a workflow in DB', async () => {
      workflowsServiceMock.count.mockResolvedValue(1);
      await reviewWorkflowsService.bootstrap();

      expect(workflowsServiceMock.count).toBeCalled();
      expect(stagesServiceMock.count).toBeCalled();

      expect(stagesServiceMock.createMany).not.toBeCalled();
      expect(workflowsServiceMock.create).not.toBeCalled();
    });
    test('With stages in DB', async () => {
      stagesServiceMock.count.mockResolvedValue(5);
      await reviewWorkflowsService.bootstrap();

      expect(workflowsServiceMock.count).toBeCalled();
      expect(stagesServiceMock.count).toBeCalled();

      expect(stagesServiceMock.createMany).not.toBeCalled();
      expect(workflowsServiceMock.create).not.toBeCalled();
    });
  });
  describe('register', () => {
    test('Content types with review workflows options should have new attributes for assignee and stage relations', async () => {
      await reviewWorkflowsService.register();
      expect(contentTypesContainer.extend).toHaveBeenCalledTimes(1);
      expect(contentTypesContainer.extend).not.toHaveBeenCalledWith('test1', expect.any(Function));
      expect(contentTypesContainer.extend).toHaveBeenCalledWith('test2', expect.any(Function));

      const extendFunc = contentTypesContainer.extend.mock.calls[0][1];

      expect(extendFunc({ collectionName: 'toto' })).toEqual({
        collectionName: 'toto',
        attributes: {
          [ENTITY_STAGE_ATTRIBUTE]: expect.objectContaining({
            relation: 'oneToOne',
            target: 'admin::workflow-stage',
            type: 'relation',
          }),
          [ENTITY_ASSIGNEE_ATTRIBUTE]: expect.objectContaining({
            relation: 'oneToOne',
            target: 'admin::user',
            type: 'relation',
          }),
        },
      });
    });
  });
});
