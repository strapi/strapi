import workflowsFactory from '../workflows';

describe('review-workflows service - workflows', () => {
  const createStrapiMock = (hasContentReleases = true) => {
    const validateActionsByContentTypes = jest.fn();
    const releaseActionService = {
      validateActionsByContentTypes,
    };

    const reviewWorkflowsServices: Record<string, any> = {
      validation: {
        validateWorkflowCount: jest.fn(),
        validateWorkflowStages: jest.fn(),
      },
      'workflow-metrics': {
        sendDidCreateWorkflow: jest.fn(),
        sendDidEditWorkflow: jest.fn(),
      },
      stages: {
        createMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Stage 1' }]),
        replaceStages: jest.fn().mockResolvedValue([{ id: 1, name: 'Stage 1' }]),
        deleteMany: jest.fn().mockResolvedValue(true),
        deleteAllEntitiesStage: jest.fn().mockResolvedValue(true),
        updateEntitiesStage: jest.fn().mockResolvedValue(true),
      },
      workflows: {
        _getAssignedWorkflows: jest.fn().mockResolvedValue([]),
      },
    };

    const contentReleasesPlugin = hasContentReleases
      ? {
          service: jest.fn().mockImplementation((serviceName: string) => {
            if (serviceName === 'release-action') {
              return releaseActionService;
            }
            return undefined;
          }),
        }
      : {
          // EE-disabled state: the plugin is registered but exposes no services
          service: jest.fn().mockReturnValue(undefined),
        };

    const reviewWorkflowsPlugin = {
      service: jest.fn().mockImplementation((serviceName: string) => {
        return reviewWorkflowsServices[serviceName];
      }),
    };

    const contentManagerPlugin = {
      service: jest.fn().mockReturnValue({
        findConfiguration: jest.fn().mockResolvedValue({ options: {} }),
        updateConfiguration: jest.fn().mockResolvedValue({}),
      }),
    };

    const strapi: any = {
      plugin: jest.fn().mockImplementation((pluginName: string) => {
        if (pluginName === 'content-releases') {
          return contentReleasesPlugin;
        }
        if (pluginName === 'review-workflows') {
          return reviewWorkflowsPlugin;
        }
        if (pluginName === 'content-manager') {
          return contentManagerPlugin;
        }
        return undefined;
      }),
      db: {
        transaction: jest.fn((cb: any) => cb()),
        query: jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ id: 1, name: 'Workflow 1', contentTypes: ['api::article.article'] }),
          update: jest.fn().mockResolvedValue({ id: 1, name: 'Updated Workflow', contentTypes: ['api::article.article'] }),
          delete: jest.fn().mockResolvedValue({ id: 1, name: 'Deleted Workflow', contentTypes: ['api::article.article'] }),
          count: jest.fn().mockResolvedValue(2),
        }),
      },
      get: jest.fn().mockReturnValue({
        transform: jest.fn((uid: string, opts: any) => opts),
      }),
    };

    return { strapi, validateActionsByContentTypes };
  };

  describe('when cms-content-releases is NOT enabled', () => {
    test('create workflow should not throw TypeError when content-releases plugin is undefined', async () => {
      const { strapi, validateActionsByContentTypes } = createStrapiMock(false);
      const workflowsService = workflowsFactory({ strapi });

      const result = await workflowsService.create({
        data: {
          name: 'New Workflow',
          stages: [{ name: 'Stage 1' }],
          contentTypes: ['api::article.article'],
          stageRequiredToPublishName: 'Stage 1',
        },
      });

      expect(result).toBeDefined();
      expect(validateActionsByContentTypes).not.toHaveBeenCalled();
    });

    test('update workflow should not throw TypeError when content-releases plugin is undefined', async () => {
      const { strapi, validateActionsByContentTypes } = createStrapiMock(false);
      const workflowsService = workflowsFactory({ strapi });

      const existingWorkflow = {
        id: 1,
        name: 'Workflow 1',
        stages: [{ id: 1, name: 'Stage 1' }],
        contentTypes: ['api::article.article'],
      };

      const result = await workflowsService.update(existingWorkflow, {
        data: {
          name: 'Updated Workflow',
          contentTypes: ['api::article.article'],
        },
      });

      expect(result).toBeDefined();
      expect(validateActionsByContentTypes).not.toHaveBeenCalled();
    });

    test('delete workflow should not throw TypeError when content-releases plugin is undefined', async () => {
      const { strapi, validateActionsByContentTypes } = createStrapiMock(false);
      const workflowsService = workflowsFactory({ strapi });

      const existingWorkflow = {
        id: 1,
        name: 'Workflow 1',
        stages: [{ id: 1, name: 'Stage 1' }],
        contentTypes: ['api::article.article'],
      };

      const result = await workflowsService.delete(existingWorkflow, {});

      expect(result).toBeDefined();
      expect(validateActionsByContentTypes).not.toHaveBeenCalled();
    });
  });

  describe('when cms-content-releases IS enabled', () => {
    test('create workflow calls validateActionsByContentTypes', async () => {
      const { strapi, validateActionsByContentTypes } = createStrapiMock(true);
      const workflowsService = workflowsFactory({ strapi });

      await workflowsService.create({
        data: {
          name: 'New Workflow',
          stages: [{ name: 'Stage 1' }],
          contentTypes: ['api::article.article'],
          stageRequiredToPublishName: 'Stage 1',
        },
      });

      expect(validateActionsByContentTypes).toHaveBeenCalledWith(['api::article.article']);
    });

    test('update workflow calls validateActionsByContentTypes', async () => {
      const { strapi, validateActionsByContentTypes } = createStrapiMock(true);
      const workflowsService = workflowsFactory({ strapi });

      const existingWorkflow = {
        id: 1,
        name: 'Workflow 1',
        stages: [{ id: 1, name: 'Stage 1' }],
        contentTypes: ['api::article.article'],
      };

      await workflowsService.update(existingWorkflow, {
        data: {
          name: 'Updated Workflow',
          contentTypes: ['api::page.page'],
        },
      });

      expect(validateActionsByContentTypes).toHaveBeenCalledWith([
        'api::article.article',
        'api::page.page',
      ]);
    });

    test('delete workflow calls validateActionsByContentTypes', async () => {
      const { strapi, validateActionsByContentTypes } = createStrapiMock(true);
      const workflowsService = workflowsFactory({ strapi });

      const existingWorkflow = {
        id: 1,
        name: 'Workflow 1',
        stages: [{ id: 1, name: 'Stage 1' }],
        contentTypes: ['api::article.article'],
      };

      await workflowsService.delete(existingWorkflow, {});

      expect(validateActionsByContentTypes).toHaveBeenCalledWith(['api::article.article']);
    });
  });
});
