import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core, Struct } from '@strapi/types';

import { createController, getRouteAction } from '..';

const note = {
  uid: 'api::note.note',
  modelType: 'contentType',
  kind: 'collectionType',
  info: { singularName: 'note', pluralName: 'notes', displayName: 'Note' },
  options: {},
  attributes: { title: { type: 'string' } },
} as unknown as Struct.CollectionTypeSchema;

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 } };

const isSubjectAware = vi.fn<(auth: unknown) => boolean>(() => true);

const contentAPI = {
  permissions: { isSubjectAware },
  sanitize: {
    output: vi.fn<(data: unknown, schema?: unknown, options?: unknown) => Promise<unknown>>(
      async (data) => data
    ),
    input: vi.fn<(data: unknown, schema?: unknown, options?: unknown) => Promise<unknown>>(
      async (data) => data
    ),
    query: vi.fn<(query: unknown, schema?: unknown, options?: unknown) => Promise<unknown>>(
      async (query) => query
    ),
  },
  validate: {
    query: vi.fn(async () => {}),
    input: vi.fn<(data: unknown, schema?: unknown, options?: unknown) => Promise<void>>(
      async () => {}
    ),
  },
};

const ctxFor = (handler: unknown) =>
  ({
    query: { filters: { title: 'a' } },
    state: { auth, route: { method: 'GET', path: '/notes', handler } },
  }) as any;

describe('Core controllers: the options they give the content API', () => {
  let strictParams: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    strictParams = undefined;

    global.strapi = {
      contentAPI,
      config: {
        get: (key: string) => (key === 'api.rest.strictParams' ? strictParams : undefined),
      },
    } as unknown as Core.Strapi;
  });

  it('derives the action from the route handler', () => {
    expect(getRouteAction({ handler: 'api::note.note.findOne' })).toBe('findOne');
    expect(getRouteAction({ handler: 'plugin::end-users.me.find' })).toBe('find');
    expect(getRouteAction({ handler: 'note.update' })).toBe('update');
    expect(getRouteAction({ handler() {} })).toBeUndefined();
    expect(getRouteAction({ handler: 'api::note.note.' })).toBeUndefined();
    expect(getRouteAction(undefined)).toBeUndefined();
  });

  it('passes the derived action to sanitizeOutput', async () => {
    const controller = createController({ contentType: note });
    const data = { title: 'a' };

    await controller.sanitizeOutput(data, ctxFor('api::note.note.findOne'));

    expect(contentAPI.sanitize.output).toHaveBeenCalledWith(data, note, {
      auth,
      action: 'findOne',
    });
  });

  it('passes only auth to sanitizeOutput for a route whose handler is a function', async () => {
    const controller = createController({ contentType: note });

    await controller.sanitizeOutput(
      {},
      ctxFor(() => {})
    );

    expect(contentAPI.sanitize.output.mock.calls[0][2]).toStrictEqual({ auth });
  });

  it('passes the action with auth, route and strictParams to the query and input entry points', async () => {
    strictParams = true;

    const controller = createController({ contentType: note });
    const ctx = ctxFor('api::note.note.update');
    const expected = { auth, route: ctx.state.route, action: 'update', strictParams: true };

    await controller.sanitizeQuery(ctx);
    await controller.validateQuery(ctx);
    await controller.sanitizeInput({ title: 'b' }, ctx);
    await controller.validateInput({ title: 'b' }, ctx);

    expect(contentAPI.sanitize.query).toHaveBeenCalledWith(ctx.query, note, expected);
    expect(contentAPI.validate.query).toHaveBeenCalledWith(ctx.query, note, expected);
    expect(contentAPI.sanitize.input).toHaveBeenCalledWith({ title: 'b' }, note, expected);
    expect(contentAPI.validate.input).toHaveBeenCalledWith({ title: 'b' }, note, expected);
  });

  it('tells the input steps a write routed as update creates an entry, and only then', async () => {
    const controller = createController({ contentType: note });
    const ctx = ctxFor('api::note.note.update');

    await controller.sanitizeInput({ title: 'b' }, ctx);
    expect(contentAPI.sanitize.input.mock.calls[0][2]).not.toHaveProperty('creates');

    ctx.state.createsEntry = true;

    await controller.sanitizeInput({ title: 'b' }, ctx);
    await controller.validateInput({ title: 'b' }, ctx);

    const expected = { auth, route: ctx.state.route, action: 'update', creates: true };

    expect(contentAPI.sanitize.input).toHaveBeenLastCalledWith({ title: 'b' }, note, expected);
    expect(contentAPI.validate.input).toHaveBeenLastCalledWith({ title: 'b' }, note, expected);
    // Queries have nothing to stamp
    await controller.sanitizeQuery(ctx);
    expect(contentAPI.sanitize.query.mock.calls[0][2]).not.toHaveProperty('creates');
  });
  it('tells the input steps the core handler that runs, over the route handler name', async () => {
    const controller = createController({ contentType: note });
    const ctx = ctxFor('api::note.note.publishNow');

    await controller.sanitizeInput({ title: 'b' }, ctx);
    expect(contentAPI.sanitize.input.mock.calls[0][2]).toMatchObject({ action: 'publishNow' });

    // What the core `create` sets before its input steps, for a subject-aware caller
    ctx.state.inputAction = 'create';

    await controller.sanitizeInput({ title: 'b' }, ctx);
    await controller.validateInput({ title: 'b' }, ctx);

    expect(contentAPI.sanitize.input.mock.calls[1][2]).toMatchObject({ action: 'create' });
    expect(contentAPI.validate.input.mock.calls[0][2]).toMatchObject({ action: 'create' });

    // Queries and output keep the route's action
    await controller.sanitizeQuery(ctx);
    expect(contentAPI.sanitize.query.mock.calls[0][2]).toMatchObject({ action: 'publishNow' });
  });

  it('tells the input steps which entry an update writes, from the id of the route', async () => {
    const controller = createController({ contentType: note });
    const ctx = { ...ctxFor('api::note.note.update'), params: { id: 'doc1' } };

    await controller.sanitizeInput({ title: 'b' }, ctx);
    await controller.validateInput({ title: 'b' }, ctx);

    expect(contentAPI.sanitize.input.mock.calls[0][2]).toMatchObject({ documentId: 'doc1' });
    expect(contentAPI.validate.input.mock.calls[0][2]).toMatchObject({ documentId: 'doc1' });

    // A route with no id (a create, a single type) names none; queries don't need one
    await controller.sanitizeInput({ title: 'b' }, ctxFor('api::note.note.create'));
    expect(contentAPI.sanitize.input.mock.calls[1][2]).not.toHaveProperty('documentId');

    await controller.sanitizeQuery(ctx);
    expect(contentAPI.sanitize.query.mock.calls[0][2]).not.toHaveProperty('documentId');
  });
  describe('the status and locale of the request', () => {
    const optionsOf = async (query: Record<string, unknown>, handler = 'api::note.note.find') => {
      const controller = createController({ contentType: note });
      const ctx = ctxFor(handler);

      ctx.query = query;

      await controller.sanitizeQuery(ctx);
      await controller.sanitizeInput({ title: 'b' }, ctx);
      await controller.sanitizeOutput({ title: 'b' }, ctx);

      return [
        contentAPI.sanitize.query.mock.calls[0][2],
        contentAPI.sanitize.input.mock.calls[0][2],
        contentAPI.sanitize.output.mock.calls[0][2],
      ];
    };

    it('gives the content API what the request names', async () => {
      for (const options of await optionsOf({ status: 'draft', locale: 'fr' })) {
        expect(options).toMatchObject({ status: 'draft', locale: 'fr' });
      }
    });

    it('reads any status other than exactly published as draft, as the Document Service does, and takes a locale list for all of them', async () => {
      for (const status of ['archived', 'DRAFT', 'Published', '']) {
        vi.clearAllMocks();

        // eslint-disable-next-line no-await-in-loop
        for (const options of await optionsOf({ status, locale: ['fr', 'en'] })) {
          expect(options).toMatchObject({ status: 'draft', locale: '*' });
        }
      }

      vi.clearAllMocks();

      for (const options of await optionsOf({ status: 'published' })) {
        expect(options).toMatchObject({ status: 'published' });
      }
    });

    it('names none when the request names none', async () => {
      for (const options of await optionsOf({ filters: { title: 'a' } })) {
        expect(options).not.toHaveProperty('status');
        expect(options).not.toHaveProperty('locale');
      }
    });

    describe('for the output, resolved the way the Document Service does', () => {
      const localized = {
        ...note,
        options: { draftAndPublish: true },
        pluginOptions: { i18n: { localized: true } },
      } as unknown as Struct.CollectionTypeSchema;

      const outputOf = async (query: Record<string, unknown>, handler: string) => {
        const getDefaultLocale = vi.fn(async () => 'en');

        (global.strapi as unknown as Record<string, unknown>).localization = {
          isLocalizedContentType: () => true,
          getDefaultLocale,
        };

        const ctx = ctxFor(handler);

        ctx.query = query;

        await createController({ contentType: localized }).sanitizeOutput({ title: 'b' }, ctx);

        return { options: contentAPI.sanitize.output.mock.calls[0][2], getDefaultLocale };
      };

      it.each(['api::note.note.find', 'api::note.note.findOne'])(
        'reads published in the default locale on %s',
        async (handler) => {
          const { options } = await outputOf({}, handler);

          expect(options).toMatchObject({ status: 'published', locale: 'en' });
        }
      );

      it('names no status for a write: the write guard resolves it, or the entry is unplaced', async () => {
        const { options } = await outputOf({}, 'api::note.note.update');

        expect(options).not.toHaveProperty('status');
        expect(options).toMatchObject({ locale: 'en' });
      });

      it('keeps what the request names, and asks for no default locale then', async () => {
        const { options, getDefaultLocale } = await outputOf(
          { status: 'draft', locale: 'fr' },
          'api::note.note.find'
        );

        expect(options).toMatchObject({ status: 'draft', locale: 'fr' });
        expect(getDefaultLocale).not.toHaveBeenCalled();
      });

      it('reads the scope from the query the service received, as the core sanitizeQuery gave it', async () => {
        const getDefaultLocale = vi.fn(async () => 'en');

        (global.strapi as unknown as Record<string, unknown>).localization = {
          isLocalizedContentType: () => true,
          getDefaultLocale,
        };

        const controller = createController({ contentType: localized });
        const ctx = ctxFor('api::note.note.find');

        ctx.query = { status: 'published', locale: 'en' };
        contentAPI.sanitize.query.mockResolvedValueOnce({ status: 'draft', locale: 'fr' });

        await controller.sanitizeQuery(ctx);
        await controller.sanitizeOutput({ title: 'b' }, ctx);

        expect(contentAPI.sanitize.output.mock.calls[0][2]).toMatchObject({
          status: 'draft',
          locale: 'fr',
        });
      });

      it('resolves no scope, and looks up no default locale, for a caller that is not subject-aware', async () => {
        isSubjectAware.mockReturnValueOnce(false);

        const { options, getDefaultLocale } = await outputOf(
          { status: 'draft', locale: 'fr' },
          'api::note.note.find'
        );

        expect(options).toStrictEqual({ auth, action: 'find' });
        expect(getDefaultLocale).not.toHaveBeenCalled();
      });

      it('adds neither to a type with no draft & publish and no locales', async () => {
        const controller = createController({ contentType: note });

        (global.strapi as unknown as Record<string, unknown>).localization = {
          isLocalizedContentType: () => false,
          getDefaultLocale: vi.fn(),
        };

        await controller.sanitizeOutput({ title: 'b' }, ctxFor('api::note.note.find'));

        const options = contentAPI.sanitize.output.mock.calls[0][2];

        expect(options).not.toHaveProperty('status');
        expect(options).not.toHaveProperty('locale');
      });
    });
  });
});
