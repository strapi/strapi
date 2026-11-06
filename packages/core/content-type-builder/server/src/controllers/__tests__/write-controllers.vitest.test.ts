import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'koa';

import contentTypesController from '../content-types';
import componentsController from '../components';
import componentCategoriesController from '../component-categories';
import { createReloader, flushReload } from './reloader.test.utils';

const services = vi.hoisted(() => ({
  'content-types': {
    createContentType: vi.fn(),
    editContentType: vi.fn(),
    deleteContentType: vi.fn(),
  },
  components: {
    createComponent: vi.fn(),
    editComponent: vi.fn(),
    deleteComponent: vi.fn(),
  },
  'component-categories': {
    editCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

vi.mock('../../utils', () => ({
  getService: vi.fn((name: keyof typeof services) => services[name]),
}));
vi.mock('../validation/content-type', () => ({
  validateContentTypeInput: vi.fn(),
  validateUpdateContentTypeInput: vi.fn(),
  validateKind: vi.fn(),
}));
vi.mock('../validation/component', () => ({
  validateComponentInput: vi.fn(),
  validateUpdateComponentInput: vi.fn(),
}));
vi.mock('../validation/component-category', () => ({ default: vi.fn() }));

const createContext = (params: Record<string, string> = {}) =>
  ({
    params,
    request: { body: {} },
    send: vi.fn(),
  }) as unknown as Context;

type Case = {
  name: string;
  run: (ctx: Context) => Promise<unknown>;
  params: Record<string, string>;
  write: ReturnType<typeof vi.fn>;
  success: unknown;
};

const cases: Case[] = [
  {
    name: 'createContentType',
    run: (ctx) => contentTypesController.createContentType(ctx),
    params: {},
    write: services['content-types'].createContentType,
    success: { uid: 'api::article.article', kind: 'collectionType' },
  },
  {
    name: 'updateContentType',
    run: (ctx) => contentTypesController.updateContentType(ctx),
    params: { uid: 'api::article.article' },
    write: services['content-types'].editContentType,
    success: { uid: 'api::article.article' },
  },
  {
    name: 'deleteContentType',
    run: (ctx) => contentTypesController.deleteContentType(ctx),
    params: { uid: 'api::article.article' },
    write: services['content-types'].deleteContentType,
    success: { uid: 'api::article.article' },
  },
  {
    name: 'createComponent',
    run: (ctx) => componentsController.createComponent(ctx),
    params: {},
    write: services.components.createComponent,
    success: { uid: 'default.seo' },
  },
  {
    name: 'updateComponent',
    run: (ctx) => componentsController.updateComponent(ctx),
    params: { uid: 'default.seo' },
    write: services.components.editComponent,
    success: { uid: 'default.seo' },
  },
  {
    name: 'deleteComponent',
    run: (ctx) => componentsController.deleteComponent(ctx),
    params: { uid: 'default.seo' },
    write: services.components.deleteComponent,
    success: { uid: 'default.seo' },
  },
  {
    // A refused category write throws to the error middleware
    name: 'editCategory',
    run: (ctx) => componentCategoriesController.editCategory(ctx).catch(() => {}),
    params: { name: 'default' },
    write: services['component-categories'].editCategory,
    success: 'renamed',
  },
  {
    name: 'deleteCategory',
    run: (ctx) => componentCategoriesController.deleteCategory(ctx).catch(() => {}),
    params: { name: 'default' },
    write: services['component-categories'].deleteCategory,
    success: undefined,
  },
];

describe('content-type-builder write controllers', () => {
  let reloader: ReturnType<typeof createReloader>;

  beforeEach(() => {
    vi.clearAllMocks();
    reloader = createReloader();
    (global as any).strapi = {
      reload: reloader.reload,
      contentTypes: { 'api::article.article': {} },
      components: { 'default.seo': {} },
      apis: {},
      log: { error: vi.fn() },
      telemetry: { send: vi.fn(() => Promise.resolve()) },
    };
  });

  describe.each(cases)('$name', ({ run, params, write, success }) => {
    it('turns the file watcher back on when the write is refused', async () => {
      write.mockRejectedValueOnce(new Error('refused'));

      await run(createContext(params));

      expect(reloader.reload.isWatching).toBe(true);
      expect(reloader.send).not.toHaveBeenCalled();
    });

    it('restarts the server after a valid write that follows a refused one', async () => {
      write.mockRejectedValueOnce(new Error('refused')).mockResolvedValueOnce(success);

      await run(createContext(params));
      await run(createContext(params));
      await flushReload();
      // createContentType waits for telemetry before it reloads
      await vi.waitFor(() => expect(reloader.send).toHaveBeenCalledWith('reload'));
    });
  });
});
