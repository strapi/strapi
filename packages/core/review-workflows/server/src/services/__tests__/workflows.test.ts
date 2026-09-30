import { emitAudit } from '@strapi/utils';
import workflowsFactory from '../workflows';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const validateActionsByContentTypes = jest.fn();
const createMany = jest.fn();
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
        createMany,
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
    migrate.mockResolvedValue([]);
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

  describe('audit log events', () => {
    const populatedWorkflow = {
      ...workflow,
      stages: [{ id: 10, name: 'Todo', color: '#4945FF', permissions: [] }],
      stageRequiredToPublish: null,
    };

    it('create records the new workflow after the transaction', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      strapi.db.query().create.mockResolvedValue(populatedWorkflow);
      createMany.mockResolvedValue([{ id: 10 }]);
      const service = workflowsFactory({ strapi: strapi as any });

      await service.create({ data: { name: 'Default', stages: [{ name: 'Todo' }] } });

      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'workflow.create', {
        workflowId: 1,
        name: 'Default',
        contentTypes: ['api::article.article'],
        stages: [{ name: 'Todo', color: '#4945FF', fromPermissions: [], toPermissions: [] }],
        stageRequiredToPublish: null,
      });
    });

    it('update records the fields that changed', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      strapi.db.query().update.mockResolvedValue({ ...populatedWorkflow, name: 'Renamed' });
      const service = workflowsFactory({ strapi: strapi as any });

      await service.update(populatedWorkflow, { data: { name: 'Renamed' } });

      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'workflow.update', {
        workflowId: 1,
        name: 'Renamed',
        changes: { name: { before: 'Default', after: 'Renamed' } },
      });
    });

    it('update writes nothing when nothing changed', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      strapi.db.query().update.mockResolvedValue(populatedWorkflow);
      const service = workflowsFactory({ strapi: strapi as any });

      await service.update(populatedWorkflow, { data: { name: 'Default' } });

      expect(emitAudit).not.toHaveBeenCalled();
    });

    it('update records the workflow that lost a content type', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      strapi.db.query().update.mockResolvedValue({
        ...populatedWorkflow,
        contentTypes: ['api::article.article', 'api::page.page'],
      });
      migrate.mockResolvedValue([
        {
          workflowId: 2,
          name: 'Other',
          before: ['api::page.page', 'api::blog.blog'],
          after: ['api::blog.blog'],
        },
      ]);
      const service = workflowsFactory({ strapi: strapi as any });

      await service.update(populatedWorkflow, {
        data: { contentTypes: ['api::article.article', 'api::page.page'] },
      });

      expect(emitAudit).toHaveBeenCalledTimes(2);
      expect(emitAudit).toHaveBeenLastCalledWith({ strapi }, 'workflow.update', {
        workflowId: 2,
        name: 'Other',
        changes: {
          contentTypes: {
            before: ['api::blog.blog', 'api::page.page'],
            after: ['api::blog.blog'],
          },
        },
      });
    });

    it('delete records the deleted workflow', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      const service = workflowsFactory({ strapi: strapi as any });

      await service.delete(populatedWorkflow, {});

      expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'workflow.delete', {
        workflowId: 1,
        name: 'Default',
      });
    });
  });
});
