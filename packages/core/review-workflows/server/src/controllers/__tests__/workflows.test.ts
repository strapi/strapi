import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import workflowsController from '../workflows';
import { WORKFLOW_POPULATE } from '../../constants/workflows';

const workflowService = {
  create: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
};

jest.mock('../../utils', () => ({
  getService: jest.fn(() => workflowService),
}));

jest.mock('../../validation/review-workflows', () => ({
  validateWorkflowCreate: jest.fn(async (data: unknown) => data),
  validateWorkflowUpdate: jest.fn(async (data: unknown) => data),
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
  create: jest.fn(async () => ({ populate: { stages: false } })),
  update: jest.fn(async () => ({ populate: { stages: false } })),
};

const createCtx = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    request: { body: { data: { name: 'Default' } }, query: { populate: { stages: false } } },
    state: { userAbility: {} },
    created: jest.fn(),
    notFound: jest.fn(),
    body: undefined,
    ...overrides,
  }) as unknown as Context & { created: jest.Mock };

describe('review-workflows workflows controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // The controller reads the global `strapi`. Jest isolates globals per file, so no restore.
    // The unit setup derives `strapi.plugin(name).service(name)` from `strapi.plugins`
    global.strapi = {
      plugins: {
        'content-manager': {
          services: {
            'permission-checker': {
              create: jest.fn(() => ({
                sanitizeCreateInput: jest.fn(async (data: unknown) => data),
                sanitizeUpdateInput: jest.fn(() => async (data: unknown) => data),
                sanitizeOutput: jest.fn(async (data: unknown) => data),
                sanitizedQuery,
              })),
            },
          },
        },
      },
    } as unknown as Core.Strapi;

    workflowService.create.mockResolvedValue(populatedWorkflow);
    workflowService.update.mockResolvedValue(populatedWorkflow);
    workflowService.findById.mockResolvedValue(populatedWorkflow);
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
