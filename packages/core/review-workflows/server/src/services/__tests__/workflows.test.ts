import workflowsFactory from '../workflows';

const validateActionsByContentTypes = jest.fn();
const migrate = jest.fn();
const deleteMany = jest.fn();
const sendDidEditWorkflow = jest.fn();
const validateWorkflowCount = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn((name: string) => {
    if (name === 'validation') {
      return {
        validateWorkflowStages: jest.fn(),
        validateWorkflowCount,
      };
    }
    if (name === 'workflow-metrics') {
      return {
        sendDidCreateWorkflow: jest.fn(),
        sendDidEditWorkflow,
      };
    }
    if (name === 'stages') {
      return {
        createMany: jest.fn(),
        replaceStages: jest.fn(),
        deleteMany,
      };
    }
    return {};
  }),
}));

jest.mock('../workflow-content-types', () => () => ({
  migrate,
}));

const workflow = {
  id: 1,
  name: 'Default',
  contentTypes: ['api::article.article'],
  stages: [{ id: 10, name: 'Todo' }],
};

const createStrapiMock = ({ releaseActionService }: { releaseActionService?: unknown }) => {
  const dbQuery = {
    update: jest.fn().mockResolvedValue(workflow),
    delete: jest.fn().mockResolvedValue(workflow),
    count: jest.fn().mockResolvedValue(2),
    create: jest.fn().mockResolvedValue(workflow),
  };

  return {
    db: {
      transaction: jest.fn((fn: (args: unknown) => unknown) => fn({})),
      query: jest.fn(() => dbQuery),
    },
    get: jest.fn((name: string) => {
      if (name === 'query-params') {
        return { transform: jest.fn((_uid: string, opts: unknown) => opts) };
      }
      return undefined;
    }),
    plugin: jest.fn((name: string) => {
      if (name === 'content-releases') {
        return {
          service: jest.fn((serviceName: string) => {
            if (serviceName === 'release-action') {
              return releaseActionService;
            }
            return undefined;
          }),
        };
      }
      return { service: jest.fn() };
    }),
  };
};

describe('review-workflows workflows service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateWorkflowCount.mockResolvedValue(undefined);
    migrate.mockResolvedValue(undefined);
    deleteMany.mockResolvedValue(undefined);
    validateActionsByContentTypes.mockResolvedValue(undefined);
  });

  describe('when release-action service is missing', () => {
    it('update should not throw', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      const service = workflowsFactory({ strapi: strapi as any });

      await expect(service.update(workflow, { data: {} })).resolves.toEqual(workflow);
      expect(validateActionsByContentTypes).not.toHaveBeenCalled();
    });

    it('delete should not throw', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      const service = workflowsFactory({ strapi: strapi as any });

      await expect(service.delete(workflow, {})).resolves.toEqual(workflow);
      expect(validateActionsByContentTypes).not.toHaveBeenCalled();
    });
  });

  describe('when release-action service is present', () => {
    it('update should still call validateActionsByContentTypes', async () => {
      const strapi = createStrapiMock({
        releaseActionService: { validateActionsByContentTypes },
      });
      const service = workflowsFactory({ strapi: strapi as any });

      await service.update(workflow, { data: {} });

      expect(validateActionsByContentTypes).toHaveBeenCalledWith(workflow.contentTypes);
    });

    it('delete should still call validateActionsByContentTypes', async () => {
      const strapi = createStrapiMock({
        releaseActionService: { validateActionsByContentTypes },
      });
      const service = workflowsFactory({ strapi: strapi as any });

      await service.delete(workflow, {});

      expect(validateActionsByContentTypes).toHaveBeenCalledWith(workflow.contentTypes);
    });
  });
});
