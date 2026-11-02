import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import workflowsController from '../workflows';
import { WORKFLOW_POPULATE } from '../../constants/workflows';

const { workflowService } = vi.hoisted(() => ({
  workflowService: {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../utils', () => ({
  getService: vi.fn(() => workflowService),
}));

vi.mock('../../validation/review-workflows', () => ({
  validateWorkflowCreate: vi.fn(async (data: unknown) => data),
  validateWorkflowUpdate: vi.fn(async (data: unknown) => data),
}));

// Shape returned by the DB when the service populates with WORKFLOW_POPULATE
const populatedWorkflow = {
  id: 1,
  name: 'Default',
  contentTypes: [],
  stages: [
    {
      id: 10,
      name: 'Todo',
      permissions: [
        { action: 'transition', role: { id: 2, name: 'Editor' }, actionParameters: { from: 10 } },
        { action: 'transition', role: { id: 3, name: 'Author' }, actionParameters: { to: 10 } },
      ],
    },
  ],
};

const formattedStage = {
  id: 10,
  name: 'Todo',
  fromPermissions: [{ action: 'transition', role: 2 }],
  toPermissions: [{ action: 'transition', role: 3 }],
};

const sanitizedQuery = {
  create: vi.fn(async () => ({ populate: { stages: false } })),
  update: vi.fn(async () => ({ populate: { stages: false } })),
};

const createCtx = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    request: { body: { data: { name: 'Default' } }, query: { populate: { stages: false } } },
    state: { userAbility: {} },
    created: vi.fn(),
    notFound: vi.fn(),
    body: undefined,
    ...overrides,
  }) as unknown as Context & { created: Mock };

describe('review-workflows workflows controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const permissionChecker = {
      create: vi.fn(() => ({
        sanitizeCreateInput: vi.fn(async (data: unknown) => data),
        sanitizeUpdateInput: vi.fn(() => async (data: unknown) => data),
        sanitizeOutput: vi.fn(async (data: unknown) => data),
        sanitizedQuery,
      })),
    };

    // The controller reads the global `strapi`
    vi.stubGlobal('strapi', {
      plugin: vi.fn(() => ({ service: vi.fn(() => permissionChecker) })),
    } as unknown as Core.Strapi);

    workflowService.create.mockResolvedValue(populatedWorkflow);
    workflowService.update.mockResolvedValue(populatedWorkflow);
    workflowService.findById.mockResolvedValue(populatedWorkflow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('create', () => {
    it('does not forward a populate to the service', async () => {
      const ctx = createCtx();

      await workflowsController.create(ctx);

      expect(sanitizedQuery.create).not.toHaveBeenCalled();
      expect(workflowService.create).toHaveBeenCalledWith({ data: { name: 'Default' } });
    });

    it('responds with stages and their permissions formatted for the admin', async () => {
      const ctx = createCtx();

      await workflowsController.create(ctx);

      expect(ctx.created).toHaveBeenCalledWith({
        data: expect.objectContaining({ stages: [formattedStage] }),
      });
    });
  });

  describe('update', () => {
    it('does not forward a populate to the service', async () => {
      const ctx = createCtx({ params: { id: 1 } });

      await workflowsController.update(ctx);

      expect(sanitizedQuery.update).not.toHaveBeenCalled();
      expect(workflowService.findById).toHaveBeenCalledWith(1, { populate: WORKFLOW_POPULATE });
      expect(workflowService.update).toHaveBeenCalledWith(populatedWorkflow, {
        data: { name: 'Default' },
      });
    });

    it('responds with stages and their permissions formatted for the admin', async () => {
      const ctx = createCtx({ params: { id: 1 } });

      await workflowsController.update(ctx);

      expect(ctx.body).toEqual({
        data: expect.objectContaining({ stages: [formattedStage] }),
      });
    });
  });
});
