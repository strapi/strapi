import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

import createSchemaController from '../schema';

const schemaService = vi.hoisted(() => ({
  updateSchema: vi.fn(),
}));

const validateUpdateSchema = vi.hoisted(() => vi.fn());

vi.mock('../../utils', () => ({ getService: vi.fn(() => schemaService) }));
vi.mock('../validation/schema', () => ({ validateUpdateSchema }));

const data = {
  components: [],
  contentTypes: [{ action: 'update', uid: 'api::article.article', attributes: [] }],
  contentStructure: undefined,
};

const createContext = () =>
  ({
    request: { body: { data } },
    send: vi.fn(),
    conflict: vi.fn(),
  }) as unknown as Context;

// The controller schedules the reload in a `setImmediate` after a successful update
const flushReload = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('schema controller', () => {
  let reload: ReturnType<typeof vi.fn> & { isWatching: boolean };

  beforeEach(() => {
    vi.clearAllMocks();
    validateUpdateSchema.mockResolvedValue({ data });
    reload = Object.assign(vi.fn(), { isWatching: true });
    (global as any).strapi = { reload };
  });

  describe('updateSchema', () => {
    it('turns the file watcher back on when the update is refused', async () => {
      schemaService.updateSchema.mockRejectedValueOnce(new Error('refused'));
      const controller = createSchemaController();
      const ctx = createContext();

      await controller.updateSchema(ctx);

      expect(ctx.send).toHaveBeenCalledWith({ error: 'refused' }, 400);
      expect(reload.isWatching).toBe(true);
    });

    it('accepts a new update after a refused one', async () => {
      schemaService.updateSchema.mockRejectedValueOnce(new Error('refused'));
      const controller = createSchemaController();

      await controller.updateSchema(createContext());
      const ctx = createContext();
      await controller.updateSchema(ctx);

      await flushReload();

      expect(ctx.conflict).not.toHaveBeenCalled();
      expect(schemaService.updateSchema).toHaveBeenCalledTimes(2);
    });

    it('keeps the watcher off until the server restarts after a successful update', async () => {
      schemaService.updateSchema.mockResolvedValueOnce(undefined);
      const controller = createSchemaController();
      const ctx = createContext();

      await controller.updateSchema(ctx);
      await flushReload();

      expect(ctx.body).toEqual({});
      expect(reload.isWatching).toBe(false);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('leaves the watcher alone when the payload is invalid', async () => {
      reload.isWatching = false;
      validateUpdateSchema.mockRejectedValueOnce(new Error('invalid'));
      const controller = createSchemaController();
      const ctx = createContext();

      await controller.updateSchema(ctx);

      expect(ctx.send).toHaveBeenCalledWith({ error: 'invalid' }, 400);
      expect(schemaService.updateSchema).not.toHaveBeenCalled();
      expect(reload.isWatching).toBe(false);
    });
  });
});
