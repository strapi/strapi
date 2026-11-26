import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import { queryParams } from '@strapi/utils';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import stagesController from '../stages';
import { STAGE_MODEL_UID, WORKFLOW_MODEL_UID } from '../../constants/workflows';

const { stagesService } = vi.hoisted(() => ({
  stagesService: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../utils', () => ({
  getService: vi.fn(() => stagesService),
}));

const stage = { id: 10, name: 'Todo' };

const models: Record<string, unknown> = {
  [STAGE_MODEL_UID]: {
    uid: STAGE_MODEL_UID,
    attributes: {
      name: { type: 'string' },
      workflow: { type: 'relation', relation: 'manyToOne', target: WORKFLOW_MODEL_UID },
      permissions: { type: 'relation', relation: 'manyToMany', target: 'admin::permission' },
    },
  },
  [WORKFLOW_MODEL_UID]: {
    uid: WORKFLOW_MODEL_UID,
    attributes: { name: { type: 'string' } },
  },
  'admin::permission': {
    uid: 'admin::permission',
    attributes: { action: { type: 'string' } },
  },
};

// The real transformer, so the controller is checked against the actual populate conversion
const { transformQueryParams } = queryParams.createTransformer({
  getModel: (uid: string) => models[uid] as never,
});

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
      get: vi.fn((name: string) => {
        if (name === 'query-params') {
          return { transform: transformQueryParams };
        }

        throw new Error(`Unexpected container lookup: ${name}`);
      }),
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

  // The database query layer only accepts `true`, an array or an object as `populate`.
  // A query string populate (`?populate=*`, `?populate=permissions`) must be converted first.
  const populateCases: Array<[string, unknown, unknown]> = [
    ['"*"', '*', true],
    ['a single relation string', 'permissions', ['permissions']],
    ['a comma-separated string', 'permissions,workflow', ['permissions', 'workflow']],
    ['an array of strings', ['permissions'], ['permissions']],
    ['an object', { workflow: 'true' }, { workflow: true }],
  ];

  describe.each([
    ['find', stagesService.find],
    ['findById', stagesService.findById],
  ] as const)('%s populate', (action, serviceMethod) => {
    beforeEach(() => {
      serviceMethod.mockResolvedValue(action === 'find' ? [stage] : stage);
    });

    it.each(populateCases)('converts %s', async (_label, populate, expected) => {
      const ctx = createCtx({ query: { populate } });

      await stagesController[action](ctx);

      const options = serviceMethod.mock.calls[0].at(-1);
      expect(options).toEqual({ workflowId: '1', populate: expected });
    });

    it('leaves populate undefined when the query has none', async () => {
      const ctx = createCtx();

      await stagesController[action](ctx);

      const options = serviceMethod.mock.calls[0].at(-1);
      expect(options).toEqual({ workflowId: '1', populate: undefined });
    });

    it('rejects a populate it cannot convert with a validation error', async () => {
      const ctx = createCtx({ query: { populate: [{ workflow: true }] } });

      await expect(stagesController[action](ctx)).rejects.toMatchObject({
        name: 'ValidationError',
      });
      expect(serviceMethod).not.toHaveBeenCalled();
    });
  });
});
