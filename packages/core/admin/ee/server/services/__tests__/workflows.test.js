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

const workflowsServiceFactory = require('../review-workflows/workflows');
const { WORKFLOW_MODEL_UID } = require('../../constants/workflows');

const workflowMock = {
  id: 1,
};

const entityServiceMock = {
  findOne: jest.fn(() => workflowMock),
  findMany: jest.fn(() => [workflowMock]),
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

const strapiMock = {
  entityService: entityServiceMock,
  plugin: jest.fn((name) => pluginsMock[name]),
};

const workflowsService = workflowsServiceFactory({ strapi: strapiMock });

describe('Review workflows - Workflows service', () => {
  afterEach(() => {
    jest.resetAllMocks();
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
});
