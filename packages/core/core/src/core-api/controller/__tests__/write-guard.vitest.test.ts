import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DENY_ALL_FILTER, errors } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';
import type Koa from 'koa';

import { createWriteGuard, localeOf } from '../write-guard';

const ARTICLE = 'api::article.article';
const NOTE = 'api::note.note';

const schemaOf = (uid: string, name: string, draftAndPublish: boolean) =>
  ({
    uid,
    modelType: 'contentType',
    kind: 'collectionType',
    info: { singularName: name, pluralName: `${name}s`, displayName: name },
    options: { draftAndPublish },
    attributes: { title: { type: 'string' } },
  }) as unknown as Struct.CollectionTypeSchema;

const article = schemaOf(ARTICLE, 'article', true);
const note = schemaOf(NOTE, 'note', false);

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 } };

type Mock = ReturnType<typeof vi.fn>;

const ctxOf = (query: Record<string, unknown> = {}, state: Record<string, unknown> = { auth }) =>
  ({ query, state }) as unknown as Koa.Context;

describe('Core controllers: the write guard', () => {
  let subjectAware: boolean;
  let localized: boolean;
  let stored: number;
  let permissions: {
    isSubjectAware: Mock;
    assertWritten: Mock;
    resolveWriteStatus: Mock;
    publishIfAllowed: Mock;
    checker: { filtersFor: Mock };
  };
  let count: Mock;

  beforeEach(() => {
    subjectAware = true;
    localized = false;
    stored = 1;
    count = vi.fn(async () => stored);
    permissions = {
      isSubjectAware: vi.fn(() => subjectAware),
      assertWritten: vi.fn(async () => {}),
      resolveWriteStatus: vi.fn(async (_auth, _uid, opts) => ({
        status: opts.requested,
        publishAfterCreate: false,
      })),
      publishIfAllowed: vi.fn(async () => false),
      checker: { filtersFor: vi.fn(() => ({})) },
    };

    global.strapi = {
      contentAPI: { permissions },
      documents: vi.fn(() => ({ count })),
      localization: { isLocalizedContentType: vi.fn(() => localized) },
    } as unknown as Core.Strapi;
  });

  describe('assertCanCreate', () => {
    it('refuses with 403 when the create rows give no entry', () => {
      permissions.checker.filtersFor.mockReturnValue(DENY_ALL_FILTER);

      expect(() => createWriteGuard(article).assertCanCreate(ctxOf())).toThrow(
        errors.ForbiddenError
      );
      expect(permissions.checker.filtersFor).toHaveBeenCalledWith(auth, 'create', ARTICLE);
    });

    it('refuses when the caller holds no create rule at all', () => {
      permissions.checker.filtersFor.mockReturnValue(null);

      expect(() => createWriteGuard(article).assertCanCreate(ctxOf())).toThrow(
        errors.ForbiddenError
      );
    });

    it('lets a create with a filter or an empty filter through', () => {
      permissions.checker.filtersFor.mockReturnValue({ owner: { id: 1 } });
      expect(() => createWriteGuard(article).assertCanCreate(ctxOf())).not.toThrow();

      permissions.checker.filtersFor.mockReturnValue({});
      expect(() => createWriteGuard(article).assertCanCreate(ctxOf())).not.toThrow();
    });

    it('asks nothing of a caller that is not subject-aware', () => {
      subjectAware = false;
      permissions.checker.filtersFor.mockReturnValue(DENY_ALL_FILTER);

      expect(() => createWriteGuard(article).assertCanCreate(ctxOf())).not.toThrow();
      expect(permissions.checker.filtersFor).not.toHaveBeenCalled();
    });
  });

  describe('resolveStatus', () => {
    it('puts the resolved status in the query, where the later steps read it', async () => {
      permissions.resolveWriteStatus.mockResolvedValue({
        status: 'draft',
        publishAfterCreate: true,
      });
      const ctx = ctxOf({ status: 'published' });

      const resolved = await createWriteGuard(article).resolveStatus(ctx, { documentId: 'a1' });

      expect(resolved).toEqual({ status: 'draft', publishAfterCreate: true });
      expect(ctx.query.status).toBe('draft');
      expect(permissions.resolveWriteStatus).toHaveBeenCalledWith(auth, ARTICLE, {
        requested: 'published',
        documentId: 'a1',
      });
    });

    it('leaves the query as it came when the status did not change', async () => {
      const query = { status: 'draft' };
      const ctx = ctxOf(query);

      await createWriteGuard(article).resolveStatus(ctx, {});

      expect(ctx.query).toBe(query);
      expect(query).toEqual({ status: 'draft' });
    });

    it('adds no status to a query that sent none and got none', async () => {
      const ctx = ctxOf({});

      await createWriteGuard(note).resolveStatus(ctx, {});

      expect(ctx.query).not.toHaveProperty('status');
    });
  });

  describe('statusParam and publishes', () => {
    it('hands the service the resolved status of a subject-aware caller', () => {
      const guard = createWriteGuard(article);

      expect(guard.statusParam(ctxOf(), { status: 'draft', publishAfterCreate: false })).toEqual({
        status: 'draft',
      });
    });

    it('hands nothing over when there is no status, or the caller is not subject-aware', () => {
      const guard = createWriteGuard(article);

      expect(guard.statusParam(ctxOf(), { status: undefined, publishAfterCreate: false })).toEqual(
        {}
      );

      subjectAware = false;
      expect(guard.statusParam(ctxOf(), { status: 'draft', publishAfterCreate: false })).toEqual(
        {}
      );
    });

    it('publishes only a published status of a draft and publish type', () => {
      const published = { status: 'published' as const, publishAfterCreate: false };
      const draft = { status: 'draft' as const, publishAfterCreate: false };

      expect(createWriteGuard(article).publishes(ctxOf(), published)).toBe(true);
      expect(createWriteGuard(article).publishes(ctxOf(), draft)).toBe(false);
      expect(createWriteGuard(note).publishes(ctxOf(), published)).toBe(false);

      subjectAware = false;
      expect(createWriteGuard(article).publishes(ctxOf(), published)).toBe(false);
    });
  });

  describe('addsLocale', () => {
    beforeEach(() => {
      localized = true;
    });

    it('is true when the document has no entry in the locale yet', async () => {
      stored = 0;

      await expect(
        createWriteGuard(article).addsLocale(ctxOf({ locale: 'fr' }), 'a1')
      ).resolves.toBe(true);
      expect(count).toHaveBeenCalledWith({
        filters: { documentId: 'a1' },
        status: 'draft',
        locale: 'fr',
      });
    });

    it('is false when the entry exists', async () => {
      stored = 1;

      await expect(
        createWriteGuard(article).addsLocale(ctxOf({ locale: 'fr' }), 'a1')
      ).resolves.toBe(false);
    });

    it('asks about no status for a type without draft and publish', async () => {
      stored = 0;

      await createWriteGuard(note).addsLocale(ctxOf({}), 'n1');

      expect(count).toHaveBeenCalledWith({ filters: { documentId: 'n1' } });
    });

    it('adds no locale for a list, a wildcard, a malformed value or a type that is not localized', async () => {
      stored = 0;
      const guard = createWriteGuard(article);

      await expect(guard.addsLocale(ctxOf({ locale: '*' }), 'a1')).resolves.toBe(false);
      await expect(guard.addsLocale(ctxOf({ locale: ['fr', 'de'] }), 'a1')).resolves.toBe(false);
      await expect(guard.addsLocale(ctxOf({ locale: { x: 1 } }), 'a1')).resolves.toBe(false);

      localized = false;
      await expect(guard.addsLocale(ctxOf({ locale: 'fr' }), 'a1')).resolves.toBe(false);

      subjectAware = false;
      localized = true;
      await expect(guard.addsLocale(ctxOf({ locale: 'fr' }), 'a1')).resolves.toBe(false);

      expect(count).not.toHaveBeenCalled();
    });
  });

  describe('markCreates and markInputAction', () => {
    it('marks the context, creating its state when there is none', () => {
      const ctx = { query: {} } as unknown as Koa.Context;

      createWriteGuard(article).markCreates(ctx);

      expect(ctx.state.createsEntry).toBe(true);
    });

    it('marks the input action for a subject-aware caller', () => {
      const ctx = ctxOf();

      createWriteGuard(article).markInputAction(ctx, 'update');

      expect(ctx.state.inputAction).toBe('update');
    });

    it('leaves the input action of a caller that is not subject-aware unset', () => {
      subjectAware = false;
      const ctx = ctxOf();

      createWriteGuard(article).markInputAction(ctx, 'create');

      expect(ctx.state).not.toHaveProperty('inputAction');
    });
  });

  describe('assertWritten', () => {
    const resolved = (status: 'draft' | 'published' | undefined) => ({
      status,
      publishAfterCreate: false,
    });

    it('judges the draft, and the published version too when the write publishes', async () => {
      const guard = createWriteGuard(article);
      const written = { documentId: 'a1', locale: 'fr' };

      await guard.assertWritten(ctxOf(), 'update', written, {}, resolved('published'));

      expect(permissions.assertWritten.mock.calls).toEqual([
        [auth, 'update', ARTICLE, 'a1', { locale: 'fr', status: 'draft' }],
        [auth, 'update', ARTICLE, 'a1', { locale: 'fr', status: 'published' }],
      ]);
    });

    it('judges the draft alone for a write that does not publish', async () => {
      await createWriteGuard(article).assertWritten(
        ctxOf(),
        'create',
        { documentId: 'a1', locale: 'en' },
        {},
        resolved('draft')
      );

      expect(permissions.assertWritten).toHaveBeenCalledTimes(1);
    });

    it('judges the only version of a type without draft and publish, with no status', async () => {
      await createWriteGuard(note).assertWritten(
        ctxOf(),
        'create',
        { documentId: 'n1', locale: 'en' },
        {},
        resolved('published')
      );

      expect(permissions.assertWritten.mock.calls).toEqual([
        [auth, 'create', NOTE, 'n1', { locale: 'en', status: undefined }],
      ]);
    });

    it("takes the request's one locale when `fields` left it out of the entity", async () => {
      await createWriteGuard(article).assertWritten(
        ctxOf({ locale: 'de' }),
        'update',
        { documentId: 'a1' },
        { locale: 'de' },
        resolved('draft')
      );

      expect(permissions.assertWritten).toHaveBeenCalledWith(auth, 'update', ARTICLE, 'a1', {
        locale: 'de',
        status: 'draft',
      });
    });

    it('names no locale for a wildcard or a list', async () => {
      await createWriteGuard(article).assertWritten(
        ctxOf({ locale: '*' }),
        'update',
        { documentId: 'a1' },
        { locale: '*' },
        resolved('draft')
      );

      expect(permissions.assertWritten).toHaveBeenCalledWith(auth, 'update', ARTICLE, 'a1', {
        locale: undefined,
        status: 'draft',
      });
    });

    it('lets the failure of a judgment through, to roll the write back', async () => {
      permissions.assertWritten.mockRejectedValue(new errors.ForbiddenError());

      await expect(
        createWriteGuard(article).assertWritten(
          ctxOf(),
          'update',
          { documentId: 'a1' },
          {},
          resolved('draft')
        )
      ).rejects.toThrow(errors.ForbiddenError);
    });

    it('judges nothing for a caller that is not subject-aware', async () => {
      subjectAware = false;

      await createWriteGuard(article).assertWritten(
        ctxOf(),
        'update',
        { documentId: 'a1' },
        {},
        resolved('draft')
      );

      expect(permissions.assertWritten).not.toHaveBeenCalled();
    });
  });

  describe('publishCreated', () => {
    const read = vi.fn();

    beforeEach(() => {
      read.mockReset();
      read.mockResolvedValue({ documentId: 'a1', title: 'published' });
    });

    it('answers with the published version, read as the request asked, when the row matches', async () => {
      permissions.publishIfAllowed.mockResolvedValue(true);
      const draft = { documentId: 'a1', locale: 'fr' };

      const result = await createWriteGuard(article).publishCreated(
        ctxOf(),
        draft,
        { fields: ['title'], populate: ['tags'] },
        read
      );

      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(auth, ARTICLE, 'a1', {
        locale: 'fr',
      });
      expect(read).toHaveBeenCalledWith('a1', {
        fields: ['title'],
        populate: ['tags'],
        locale: 'fr',
        status: 'published',
      });
      expect(result).toEqual({ documentId: 'a1', title: 'published' });
    });

    it('answers with the draft when the conditioned publish row does not match', async () => {
      const draft = { documentId: 'a1', locale: 'en' };

      const result = await createWriteGuard(article).publishCreated(ctxOf(), draft, {}, read);

      expect(result).toBe(draft);
      expect(read).not.toHaveBeenCalled();
    });

    it('answers with the draft when the published version cannot be read back', async () => {
      permissions.publishIfAllowed.mockResolvedValue(true);
      read.mockResolvedValue(null);
      const draft = { documentId: 'a1', locale: 'en' };

      await expect(
        createWriteGuard(article).publishCreated(ctxOf(), draft, {}, read)
      ).resolves.toBe(draft);
    });

    it('publishes nothing for an entity without a document id', async () => {
      const entity = { title: 'no id' };

      await expect(
        createWriteGuard(article).publishCreated(ctxOf(), entity, {}, read)
      ).resolves.toBe(entity);
      expect(permissions.publishIfAllowed).not.toHaveBeenCalled();
    });
  });

  describe('localeOf', () => {
    it('gives the locale as it came, a list and a wildcard included', () => {
      expect(localeOf(ctxOf({ locale: 'fr' }))).toBe('fr');
      expect(localeOf(ctxOf({ locale: ['fr', 'de'] }))).toEqual(['fr', 'de']);
      expect(localeOf(ctxOf({ locale: '*' }))).toBe('*');
      expect(localeOf(ctxOf({}))).toBeUndefined();
    });
  });
});
