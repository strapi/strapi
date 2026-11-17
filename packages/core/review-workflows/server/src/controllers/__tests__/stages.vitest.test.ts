import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import stagesController from '../stages';

const { stagesService } = vi.hoisted(() => ({
  stagesService: {
    findById: vi.fn(),
  },
}));

vi.mock('../../utils', () => ({
  getService: vi.fn(() => stagesService),
}));

const stage = { id: 10, name: 'Todo' };

const createCtx = (overrides: Record<string, unknown> = {}) =>
  ({
    params: { workflow_id: '1', id: '10' },
    query: {},
    state: { userAbility: {} },
    notFound: vi.fn(),
    body: undefined,
    ...overrides,
  }) as unknown as Context & { notFound: Mock };

describe('review-workflows stages controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const permissionChecker = {
      create: vi.fn(() => ({
        sanitizeOutput: vi.fn(async (data: unknown) => data),
      })),
    };

    // The controller reads the global `strapi`
    vi.stubGlobal('strapi', {
      plugin: vi.fn(() => ({ service: vi.fn(() => permissionChecker) })),
    } as unknown as Core.Strapi);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('findById', () => {
    it('looks up the stage within the requested workflow', async () => {
      stagesService.findById.mockResolvedValue(stage);
      const ctx = createCtx();

      await stagesController.findById(ctx);

      expect(stagesService.findById).toHaveBeenCalledWith('10', {
        workflowId: '1',
        populate: undefined,
      });
      expect(ctx.body).toEqual({ data: stage });
    });

    it('responds with not found when the workflow has no such stage', async () => {
      stagesService.findById.mockResolvedValue(null);
      const ctx = createCtx();

      await stagesController.findById(ctx);

      expect(ctx.notFound).toHaveBeenCalled();
      expect(ctx.body).toBeUndefined();
    });
  });
});
