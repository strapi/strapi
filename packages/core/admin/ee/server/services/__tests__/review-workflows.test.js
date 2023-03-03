'use strict';

const reviewWorkflowsServiceFactory = require('../review-workflows/review-workflows');

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

const strapiMock = {
  contentTypes: {},
  query: jest.fn(() => queryMock),
  service(serviceName) {
    switch (serviceName) {
      case 'admin::stages':
        return stagesServiceMock;
      case 'admin::workflows':
        return workflowsServiceMock;
      default:
        return null;
    }
  },
};

const reviewWorkflowsService = reviewWorkflowsServiceFactory({ strapi: strapiMock });

describe('Review workflows service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('bootstrap', () => {
    test('Without stages or workflows in DB', async () => {
      await reviewWorkflowsService.bootstrap();

      expect(workflowsServiceMock.count).toBeCalled();
      expect(stagesServiceMock.count).toBeCalled();

      expect(stagesServiceMock.createMany).toBeCalled();
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
});
