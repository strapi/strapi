import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

import createSchemaController from '../schema';
import { createReloader, flushReload } from './reloader.test.utils';

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

describe('schema controller', () => {
  let reloader: ReturnType<typeof createReloader>;

  beforeEach(() => {
    vi.clearAllMocks();
    validateUpdateSchema.mockResolvedValue({ data });
    reloader = createReloader();
    (global as any).strapi = { reload: reloader.reload };
  });

  describe('updateSchema', () => {
    it('turns the file watcher back on when the update is refused', async () => {
      schemaService.updateSchema.mockRejectedValueOnce(new Error('refused'));
      const controller = createSchemaController();
      const ctx = createContext();

      await controller.updateSchema(ctx);

      expect(ctx.send).toHaveBeenCalledWith({ error: 'refused' }, 400);
      expect(reloader.reload.isWatching).toBe(true);
    });

    it('restarts the server after a valid update that follows a refused one', async () => {
      schemaService.updateSchema.mockRejectedValueOnce(new Error('refused'));
      const controller = createSchemaController();

      await controller.updateSchema(createContext());
      const ctx = createContext();
      await controller.updateSchema(ctx);
      await flushReload();

      expect(ctx.conflict).not.toHaveBeenCalled();
      expect(schemaService.updateSchema).toHaveBeenCalledTimes(2);
      expect(reloader.send).toHaveBeenCalledWith('reload');
    });

    it('keeps the watcher off until the server restarts after a successful update', async () => {
      schemaService.updateSchema.mockResolvedValueOnce(undefined);
      const controller = createSchemaController();
      const ctx = createContext();

      await controller.updateSchema(ctx);
      await flushReload();

      expect(ctx.body).toEqual({});
      expect(reloader.reload.isWatching).toBe(false);
      expect(reloader.send).toHaveBeenCalledTimes(1);
    });

    it('leaves the watcher alone when the payload is invalid', async () => {
      reloader.reload.isWatching = false;
      validateUpdateSchema.mockRejectedValueOnce(new Error('invalid'));
      const controller = createSchemaController();
      const ctx = createContext();

      await controller.updateSchema(ctx);

      expect(ctx.send).toHaveBeenCalledWith({ error: 'invalid' }, 400);
      expect(schemaService.updateSchema).not.toHaveBeenCalled();
      expect(reloader.reload.isWatching).toBe(false);
    });
  });
});
