import { beforeEach, describe, expect, it, vi } from 'vitest';
import workflowsFactory from '../workflows';

const { validateWorkflowCount, migrate, deleteMany, sendDidEditWorkflow } = vi.hoisted(() => ({
  validateWorkflowCount: vi.fn(),
  migrate: vi.fn(),
  deleteMany: vi.fn(),
  sendDidEditWorkflow: vi.fn(),
}));

const validateActionsByContentTypes = vi.fn();

vi.mock('../../utils', () => ({
  getService: vi.fn((name: string) => {
    if (name === 'validation') {
      return {
        validateWorkflowStages: vi.fn(),
        validateWorkflowCount,
      };
    }
    if (name === 'workflow-metrics') {
      return {
        sendDidCreateWorkflow: vi.fn(),
        sendDidEditWorkflow,
      };
    }
    if (name === 'stages') {
      return {
        createMany: vi.fn(),
        replaceStages: vi.fn(),
        deleteMany,
      };
    }
    return {};
  }),
}));

vi.mock('../workflow-content-types', () => ({
  default: () => ({
    migrate,
  }),
}));

const workflow = {
  id: 1,
  name: 'Default',
  contentTypes: ['api::article.article'],
  stages: [{ id: 10, name: 'Todo' }],
};

const createStrapiMock = ({ releaseActionService }: { releaseActionService?: unknown }) => {
  const dbQuery = {
    update: vi.fn().mockResolvedValue(workflow),
    delete: vi.fn().mockResolvedValue(workflow),
    count: vi.fn().mockResolvedValue(2),
    create: vi.fn().mockResolvedValue(workflow),
  };

  return {
    db: {
      transaction: vi.fn((fn: (args: unknown) => unknown) => fn({})),
      query: vi.fn(() => dbQuery),
    },
    get: vi.fn((name: string) => {
      if (name === 'query-params') {
        return { transform: vi.fn((_uid: string, opts: unknown) => opts) };
      }
      return undefined;
    }),
    plugin: vi.fn((name: string) => {
      if (name === 'content-releases') {
        return {
          service: vi.fn((serviceName: string) => {
            if (serviceName === 'release-action') {
              return releaseActionService;
            }
            return undefined;
          }),
        };
      }
      return { service: vi.fn() };
    }),
  };
};

describe('review-workflows workflows service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
