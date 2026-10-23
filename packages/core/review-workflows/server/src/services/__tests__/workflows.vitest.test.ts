import type { Core } from '@strapi/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import workflowsFactory from '../workflows';
import { ERRORS, WORKFLOW_POPULATE } from '../../constants/workflows';

const {
  validateWorkflowCount,
  migrate,
  deleteMany,
  sendDidEditWorkflow,
  createMany,
  emitAudit,
  replaceStages,
} = vi.hoisted(() => ({
  validateWorkflowCount: vi.fn(),
  migrate: vi.fn(),
  deleteMany: vi.fn(),
  sendDidEditWorkflow: vi.fn(),
  createMany: vi.fn(),
  emitAudit: vi.fn(),
  replaceStages: vi.fn(),
}));

const validateActionsByContentTypes = vi.fn();

vi.mock('@strapi/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@strapi/utils')>();
  return {
    ...actual,
    emitAudit,
  };
});

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
        createMany,
        replaceStages,
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
    findOne: vi.fn().mockResolvedValue(null),
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
    migrate.mockResolvedValue([]);
    deleteMany.mockResolvedValue(undefined);
    validateActionsByContentTypes.mockResolvedValue(undefined);
  });

  it('creates stage references without changing the caller data', async () => {
    const strapi = createStrapiMock({ releaseActionService: undefined });
    const service = workflowsFactory({ strapi: strapi as unknown as Core.Strapi });
    const stages = [{ name: 'Todo' }];
    const data = Object.freeze({ name: 'Editorial', stages, stageRequiredToPublishName: 'Todo' });
    createMany.mockResolvedValue([{ id: 10, name: 'Todo' }]);

    await service.create({ data });

    expect(strapi.db.query().create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...data, stages: [10], stageRequiredToPublish: 10 },
      })
    );
    expect(data.stages).toBe(stages);
    expect(data).not.toHaveProperty('stageRequiredToPublish');
  });

  it('updates stage references and clears the publish requirement without changing caller data', async () => {
    const strapi = createStrapiMock({ releaseActionService: undefined });
    const service = workflowsFactory({ strapi: strapi as unknown as Core.Strapi });
    const stages = [{ id: 10, name: 'Reviewed' }];
    const data = Object.freeze({ stages, stageRequiredToPublishName: null });
    replaceStages.mockResolvedValue(stages);

    await service.update(workflow, { data });

    expect(strapi.db.query().update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...data, stages: [10], stageRequiredToPublish: null },
      })
    );
    expect(data.stages).toBe(stages);
    expect(data).not.toHaveProperty('stageRequiredToPublish');
  });

  describe('workflow name uniqueness', () => {
    const otherWorkflow = { id: 2, name: 'Editorial' };

    it('create rejects a name that another workflow already uses', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      strapi.db.query().findOne.mockResolvedValue(otherWorkflow);
      const service = workflowsFactory({ strapi: strapi as unknown as Core.Strapi });

      await expect(
        service.create({ data: { name: 'Editorial', stages: [{ name: 'Todo' }] } })
      ).rejects.toThrow(ERRORS.DUPLICATED_WORKFLOW_NAME);

      expect(strapi.db.query().findOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { name: 'Editorial' },
      });
      expect(createMany).not.toHaveBeenCalled();
      expect(strapi.db.query().create).not.toHaveBeenCalled();
    });

    it('update rejects a rename to a name that another workflow already uses', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      strapi.db.query().findOne.mockResolvedValue(otherWorkflow);
      const service = workflowsFactory({ strapi: strapi as unknown as Core.Strapi });

      await expect(service.update(workflow, { data: { name: 'Editorial' } })).rejects.toThrow(
        ERRORS.DUPLICATED_WORKFLOW_NAME
      );

      expect(strapi.db.query().findOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { name: 'Editorial', id: { $ne: workflow.id } },
      });
      expect(strapi.db.query().update).not.toHaveBeenCalled();
    });

    it('update accepts the current name of the workflow', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      const service = workflowsFactory({ strapi: strapi as unknown as Core.Strapi });

      await service.update(workflow, { data: { name: workflow.name } });

      expect(strapi.db.query().findOne).not.toHaveBeenCalled();
      expect(strapi.db.query().update).toHaveBeenCalled();
    });
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

  describe('populate', () => {
    const callerPopulate = { stages: false };

    it('create ignores a populate passed by the caller', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      createMany.mockResolvedValue([{ id: 10 }]);
      const service = workflowsFactory({ strapi: strapi as any });

      await service.create({
        data: { name: 'New', stages: [{ name: 'Todo' }] },
        populate: callerPopulate,
      } as Parameters<typeof service.create>[0]);

      expect(strapi.db.query().create).toHaveBeenCalledWith(
        expect.objectContaining({ populate: WORKFLOW_POPULATE })
      );
    });

    it('update ignores a populate passed by the caller', async () => {
      const strapi = createStrapiMock({ releaseActionService: undefined });
      const service = workflowsFactory({ strapi: strapi as any });

      await service.update(workflow, {
        data: {},
        populate: callerPopulate,
      } as Parameters<typeof service.update>[1]);

      expect(strapi.db.query().update).toHaveBeenCalledWith(
        expect.objectContaining({ populate: WORKFLOW_POPULATE })
      );
    });
  });
});
