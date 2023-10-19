'use strict';

const contentTypeServiceFactory = require('../content-types');

const stagesServiceMock = {
  updateEntitiesStage: jest.fn(),
  deleteAllEntitiesStage: jest.fn(),
};

const workflowsServiceMock = {
  getAssignedWorkflow: jest.fn(),
  _getAssignedWorkflows: jest.fn(),
};

const reviewWorkflowsValidationMock = {
  register: jest.fn(),
  validateWorkflowCount: jest.fn().mockResolvedValue(true),
  validateWorkflowStages: jest.fn(),
};

const getServiceMock = {
  stages: stagesServiceMock,
  workflows: workflowsServiceMock,
  'review-workflows-validation': reviewWorkflowsValidationMock,
};

jest.mock('../../../../utils', () => {
  return {
    getService: jest.fn((serviceName) => getServiceMock[serviceName]),
  };
});

const CTMPContentTypesServiceMock = {
  findConfiguration: jest.fn(),
  updateConfiguration: jest.fn(),
};

const contentManagerPluginServicesMock = {
  'content-types': CTMPContentTypesServiceMock,
};

const contentManagerPluginMock = {
  service: jest.fn((serviceName) => contentManagerPluginServicesMock[serviceName]),
};

const pluginsMock = {
  'content-manager': contentManagerPluginMock,
};

const entityServiceMock = {
  update: jest.fn(),
};

const strapiMock = {
  plugin: jest.fn((pluginName) => pluginsMock[pluginName]),
  entityService: entityServiceMock,
};

describe('Review Workflows', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('content types service', () => {
    const contentTypeService = contentTypeServiceFactory({ strapi: strapiMock });

    describe('migrate', () => {
      test('should update the configuration of newly added content types', async () => {
        const prevOptions = { testOptions: true };

        workflowsServiceMock._getAssignedWorkflows.mockResolvedValueOnce([]);
        CTMPContentTypesServiceMock.findConfiguration.mockResolvedValueOnce({
          options: prevOptions,
        });
        stagesServiceMock.updateEntitiesStage.mockResolvedValueOnce('update entity');

        await contentTypeService.migrate({
          srcContentTypes: [],
          destContentTypes: ['content'],
          stageId: 1,
        });

        expect(CTMPContentTypesServiceMock.findConfiguration).toHaveBeenCalled();
        expect(CTMPContentTypesServiceMock.updateConfiguration).toBeCalledTimes(1);
        expect(CTMPContentTypesServiceMock.updateConfiguration).toHaveBeenCalledWith(
          { uid: 'content' },
          {
            options: {
              testOptions: true,
              reviewWorkflows: true,
            },
          }
        );
        expect(stagesServiceMock.updateEntitiesStage).toBeCalledTimes(1);
      });
      test('should not update the configuration of transferred content types from a workflow to another', async () => {
        const prevOptions = { testOptions: true };

        workflowsServiceMock.getAssignedWorkflow.mockResolvedValueOnce({
          id: 1,
          contentTypes: ['content'],
        });
        CTMPContentTypesServiceMock.findConfiguration.mockResolvedValueOnce({
          options: prevOptions,
        });

        await contentTypeService.migrate({
          srcContentTypes: ['content'],
          destContentTypes: ['content'],
          stageId: 1,
        });

        expect(CTMPContentTypesServiceMock.updateConfiguration).toBeCalledTimes(0);
        expect(stagesServiceMock.updateEntitiesStage).toBeCalledTimes(0);
      });
      test('should update the configuration of deleted content types', async () => {
        const prevOptions = { testOptions: true };

        workflowsServiceMock.getAssignedWorkflow.mockResolvedValueOnce(null);
        CTMPContentTypesServiceMock.findConfiguration.mockResolvedValueOnce({
          options: prevOptions,
        });
        stagesServiceMock.updateEntitiesStage.mockResolvedValueOnce('update entity');

        await contentTypeService.migrate({
          srcContentTypes: ['content'],
          destContentTypes: [],
          stageId: 1,
        });

        expect(CTMPContentTypesServiceMock.findConfiguration).toHaveBeenCalled();
        expect(CTMPContentTypesServiceMock.updateConfiguration).toBeCalledTimes(1);
        expect(CTMPContentTypesServiceMock.updateConfiguration).toHaveBeenCalledWith(
          { uid: 'content' },
          {
            options: {
              testOptions: true,
              reviewWorkflows: false,
            },
          }
        );
        expect(stagesServiceMock.deleteAllEntitiesStage).toBeCalledTimes(1);
      });
    });
  });
});
