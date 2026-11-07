import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DENY_ALL_FILTER, errors } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { createController } from '..';

const ARTICLE = 'api::article.article';
const HOME = 'api::home.home';
const NOTE = 'api::note.note';

const schemaOf = (uid: string, kind: string, name: string, draftAndPublish: boolean) => ({
  uid,
  modelType: 'contentType',
  kind,
  info: { singularName: name, pluralName: `${name}s`, displayName: name },
  options: { draftAndPublish },
  attributes: { title: { type: 'string' } },
});

const article = schemaOf(
  ARTICLE,
  'collectionType',
  'article',
  true
) as unknown as Struct.CollectionTypeSchema;
const note = schemaOf(
  NOTE,
  'collectionType',
  'note',
  false
) as unknown as Struct.CollectionTypeSchema;
const home = schemaOf(HOME, 'singleType', 'home', true) as unknown as Struct.SingleTypeSchema;

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 } };

const next = async () => {};

type Mock = ReturnType<typeof vi.fn>;

describe('Core controllers: the publish gate, the owner stamp and the first writes', () => {
  let subjectAware: boolean;
  let localized: boolean;
  let stored: number;
  let resolved: { status: string | undefined; publishAfterCreate: boolean } | null;
  let permissions: {
    isSubjectAware: Mock;
    assertEntry: Mock;
    assertWritten: Mock;
    resolveWriteStatus: Mock;
    publishIfAllowed: Mock;
    checker: { filtersFor: Mock };
  };
  let validate: { query: Mock; input: Mock };
  let sanitize: { query: Mock; input: Mock; output: Mock };
  let service: Record<string, Mock>;
  let transaction: Mock;
  let count: Mock;
  let findFirst: Mock;
  let countOthers: Mock;
  /** The query's `status` as each step saw it */
  let statusSeen: Record<string, unknown>;

  beforeEach(() => {
    subjectAware = true;
    localized = false;
    stored = 1;
    resolved = null;
    statusSeen = {};
    count = vi.fn(async () => stored);
    findFirst = vi.fn(async () => ({ documentId: 'h1' }));
    countOthers = vi.fn(async () => 0);
    transaction = vi.fn(async (callback: () => unknown) => callback());

    permissions = {
      isSubjectAware: vi.fn(() => subjectAware),
      assertEntry: vi.fn(async () => {}),
      assertWritten: vi.fn(async () => {}),
      // A caller that is not subject-aware gets the status it asked for, whatever else is set
      resolveWriteStatus: vi.fn(async (_auth, _uid, opts) =>
        subjectAware && resolved ? resolved : { status: opts.requested, publishAfterCreate: false }
      ),
      publishIfAllowed: vi.fn(async () => false),
      checker: { filtersFor: vi.fn(() => ({})) },
    };
    validate = {
      query: vi.fn(async (query: Record<string, unknown>) => {
        statusSeen.validate = query.status;
      }),
      input: vi.fn(async () => {}),
    };
    sanitize = {
      query: vi.fn(async (query: Record<string, unknown>) => {
        statusSeen.sanitize = query.status;

        return { ...query };
      }),
      input: vi.fn(async (data: unknown) => data),
      output: vi.fn(async (data: unknown) => data),
    };
    service = {
      create: vi.fn(async () => ({ documentId: 'new1', locale: 'en', title: 'draft' })),
      createOrUpdate: vi.fn(async () => ({
        id: 7,
        documentId: 'h1',
        locale: 'en',
        title: 'draft',
      })),
      update: vi.fn(async () => ({ documentId: 'a1', locale: 'fr', title: 'draft' })),
      findOne: vi.fn(async () => ({ documentId: 'new1', title: 'published' })),
      find: vi.fn(async () => ({ documentId: 'h1', title: 'published' })),
    };

    global.strapi = {
      contentAPI: { sanitize, validate, permissions },
      config: { get: () => undefined },
      db: { query: vi.fn(() => ({ findOne: findFirst, count: countOthers })), transaction },
      documents: vi.fn(() => ({ count })),
      localization: { isLocalizedContentType: vi.fn(() => localized) },
      service: vi.fn(() => service),
    } as unknown as Core.Strapi;
  });

  const ctxFor = (handler: string, query: Record<string, unknown> = {}) =>
    ({
      query,
      params: { id: 'a1' },
      request: { body: { data: { title: 'b' } } },
      state: { auth, route: { method: 'POST', path: '/x', handler } },
    }) as any;

  /** Whether `first` ran before `then` */
  const ranBefore = (first: Mock, then: Mock) =>
    first.mock.invocationCallOrder[0] < then.mock.invocationCallOrder[0];

  describe('a create', () => {
    it('resolves the status before the query is validated and sanitized, and writes it', async () => {
      resolved = { status: 'draft', publishAfterCreate: false };

      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.create`, { status: 'published', populate: 'tags' });

      await controller.create(ctx, next);

      expect(permissions.resolveWriteStatus).toHaveBeenCalledWith(auth, ARTICLE, {
        requested: 'published',
      });
      // The drafts gate and the population of related types read this status
      expect(statusSeen).toEqual({ validate: 'draft', sanitize: 'draft' });
      expect(ranBefore(permissions.resolveWriteStatus, validate.query)).toBe(true);
      expect(service.create).toHaveBeenCalledWith({
        status: 'draft',
        populate: 'tags',
        data: { title: 'b' },
      });
      expect(ctx.status).toBe(201);
    });

    it('gives a request that names no status the one the caller is allowed', async () => {
      resolved = { status: 'published', publishAfterCreate: false };

      const controller = createController({ contentType: article });

      await controller.create(ctxFor(`${ARTICLE}.create`), next);

      expect(statusSeen).toEqual({ validate: 'published', sanitize: 'published' });
      expect(service.create).toHaveBeenCalledWith({ status: 'published', data: { title: 'b' } });
    });

    it('sends what it always sent for a caller that is not subject-aware', async () => {
      subjectAware = false;
      resolved = { status: 'draft', publishAfterCreate: true };

      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.create`, { populate: 'tags' });

      await controller.create(ctx, next);

      // Not even a `status` key: the service's own default stands
      expect(ctx.query).toEqual({ populate: 'tags' });
      expect(service.create).toHaveBeenCalledWith({ populate: 'tags', data: { title: 'b' } });
      expect(permissions.checker.filtersFor).not.toHaveBeenCalled();
    });

    it('writes a draft, then publishes it when it matches the conditioned publish, in one transaction', async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(true);

      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.create`, { populate: 'tags', fields: ['title'] });

      await controller.create(ctx, next);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(auth, ARTICLE, 'new1', {
        locale: 'en',
      });
      expect(ranBefore(service.create, permissions.publishIfAllowed)).toBe(true);
      // The published version answers, read as the request asked
      expect(service.findOne).toHaveBeenCalledWith('new1', {
        fields: ['title'],
        populate: 'tags',
        locale: 'en',
        status: 'published',
      });
      expect(sanitize.output).toHaveBeenCalledWith(
        { documentId: 'new1', title: 'published' },
        article,
        expect.anything()
      );
    });

    it('answers with the draft when the new entry does not match the publish condition', async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(false);

      const controller = createController({ contentType: article });

      await controller.create(ctxFor(`${ARTICLE}.create`), next);

      expect(service.findOne).not.toHaveBeenCalled();
      expect(sanitize.output).toHaveBeenCalledWith(
        { documentId: 'new1', locale: 'en', title: 'draft' },
        article,
        expect.anything()
      );
    });

    it('rolls the create back when the publish fails', async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockRejectedValue(
        new errors.ValidationError('title is required')
      );

      const controller = createController({ contentType: article });

      await expect(controller.create(ctxFor(`${ARTICLE}.create`), next)).rejects.toBeInstanceOf(
        errors.ValidationError
      );
      // The transaction is the one that holds both: the failure leaves through it
      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('refuses a caller whose create rows give no entry, and writes nothing', async () => {
      for (const filters of [DENY_ALL_FILTER, null]) {
        permissions.checker.filtersFor.mockReturnValue(filters);

        const controller = createController({ contentType: article });
        const ctx = ctxFor(`${ARTICLE}.create`);

        // eslint-disable-next-line no-await-in-loop
        await expect(controller.create(ctx, next)).rejects.toBeInstanceOf(errors.ForbiddenError);
      }

      expect(permissions.checker.filtersFor).toHaveBeenCalledWith(auth, 'create', ARTICLE);
      expect(service.create).not.toHaveBeenCalled();
      expect(validate.query).not.toHaveBeenCalled();
    });

    it('lets through a caller whose create rows hold, or who has none', async () => {
      const controller = createController({ contentType: article });

      for (const filters of [{}, { author: { documentId: { $eq: 'u1' } } }]) {
        permissions.checker.filtersFor.mockReturnValue(filters);

        // eslint-disable-next-line no-await-in-loop
        await controller.create(ctxFor(`${ARTICLE}.create`), next);
      }

      expect(service.create).toHaveBeenCalledTimes(2);
    });

    it('does not read the create rows of a caller that is not subject-aware', async () => {
      subjectAware = false;
      permissions.checker.filtersFor.mockReturnValue(DENY_ALL_FILTER);

      const controller = createController({ contentType: article });

      await controller.create(ctxFor(`${ARTICLE}.create`), next);

      expect(permissions.checker.filtersFor).not.toHaveBeenCalled();
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('tells the input steps it is a create, whatever the route handler is named', async () => {
      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.publishNow`);

      await controller.create(ctx, next);

      // The owner stamp, the body-owner refusal and the locks key off the core handler that runs
      expect(ctx.state.inputAction).toBe('create');

      // Not for a caller that is not subject-aware: its registered sanitizers see the route's action
      subjectAware = false;

      const tokenCtx = ctxFor(`${ARTICLE}.publishNow`);

      await controller.create(tokenCtx, next);

      expect(tokenCtx.state.inputAction).toBeUndefined();
    });

    it('is not a create for the input steps: no creates flag', async () => {
      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.create`);

      await controller.create(ctx, next);

      expect(ctx.state.createsEntry).toBeUndefined();
      expect(sanitize.input.mock.calls[0][2]).not.toHaveProperty('creates');
    });
  });

  describe('an update of a collection type', () => {
    it('resolves the status for the document and its locale before the query is validated', async () => {
      resolved = { status: 'draft', publishAfterCreate: false };

      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.update`, { locale: 'fr', status: 'published' });

      await controller.update(ctx, next);

      expect(permissions.resolveWriteStatus).toHaveBeenCalledWith(auth, ARTICLE, {
        requested: 'published',
        documentId: 'a1',
        locale: 'fr',
      });
      expect(statusSeen).toEqual({ validate: 'draft', sanitize: 'draft' });
      expect(service.update).toHaveBeenCalledWith('a1', {
        locale: 'fr',
        status: 'draft',
        data: { title: 'b' },
      });
      // A draft publishes nothing: only the draft is checked
      expect(permissions.assertEntry.mock.calls.map(([, action]) => action)).toEqual(['update']);
    });

    it('checks the versions a publish replaces when the update will publish', async () => {
      resolved = { status: 'published', publishAfterCreate: false };

      const controller = createController({ contentType: article });

      await controller.update(ctxFor(`${ARTICLE}.update`, { locale: 'fr' }), next);

      expect(permissions.assertEntry.mock.calls).toEqual([
        [auth, 'update', ARTICLE, 'a1', { locale: 'fr' }],
        [auth, 'publish', ARTICLE, 'a1', { locale: 'fr' }],
      ]);
      expect(ranBefore(permissions.assertEntry, service.update)).toBe(true);
    });

    it('writes nothing, and answers 404, when the publish check fails', async () => {
      resolved = { status: 'published', publishAfterCreate: false };
      permissions.assertEntry.mockImplementation(async (_auth, action) => {
        if (action === 'publish') {
          throw new errors.NotFoundError('Not Found');
        }
      });

      const controller = createController({ contentType: article });

      await expect(controller.update(ctxFor(`${ARTICLE}.update`), next)).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
      expect(service.update).not.toHaveBeenCalled();
    });

    it('has no publish to check on a type without draft & publish, or for a caller that is not subject-aware', async () => {
      resolved = { status: 'published', publishAfterCreate: false };

      const controller = createController({ contentType: note });

      await controller.update(ctxFor(`${NOTE}.update`), next);

      expect(permissions.assertEntry.mock.calls.map(([, action]) => action)).toEqual(['update']);

      subjectAware = false;
      permissions.assertEntry.mockClear();

      await createController({ contentType: article }).update(ctxFor(`${ARTICLE}.update`), next);

      expect(permissions.assertEntry.mock.calls.map(([, action]) => action)).toEqual(['update']);
      // Whatever was resolved, a caller that is not subject-aware sends its own query
      expect(service.update).toHaveBeenLastCalledWith('a1', { data: { title: 'b' } });
    });

    it('is not a create when the document has an entry in the locale, or the type is not localized', async () => {
      const controller = createController({ contentType: article });

      // Not localized: nothing to add, and nothing is counted
      await controller.update(ctxFor(`${ARTICLE}.update`, { locale: 'fr' }), next);

      expect(count).not.toHaveBeenCalled();

      // Localized, with an entry there
      localized = true;
      stored = 1;
      permissions.assertWritten.mockClear();

      const ctx = ctxFor(`${ARTICLE}.update`, { locale: 'fr' });

      await controller.update(ctx, next);

      expect(count).toHaveBeenCalledWith({
        filters: { documentId: 'a1' },
        status: 'draft',
        locale: 'fr',
      });
      expect(ctx.state.createsEntry).toBeUndefined();
      // Written in the transaction that judges it, as an update
      expect(permissions.assertWritten.mock.calls.map(([, action]) => action)).toEqual(['update']);

      // A list or '*' adds no locale
      count.mockClear();

      await controller.update(ctxFor(`${ARTICLE}.update`, { locale: '*' }), next);
      await controller.update(ctxFor(`${ARTICLE}.update`, { locale: ['en', 'fr'] }), next);

      expect(count).not.toHaveBeenCalled();
    });

    it('writes an update that adds a locale as a create: stamped, in a transaction, checked once written', async () => {
      localized = true;
      stored = 0;
      resolved = { status: 'published', publishAfterCreate: false };

      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.update`, { locale: 'fr' });

      await controller.update(ctx, next);

      // As a create: no document to match a conditioned publish with, no publish replaced
      expect(permissions.resolveWriteStatus).toHaveBeenCalledWith(auth, ARTICLE, {
        requested: undefined,
        locale: 'fr',
      });
      expect(ctx.state.createsEntry).toBe(true);
      expect(sanitize.input.mock.calls[0][2]).toMatchObject({ action: 'update', creates: true });
      expect(validate.input.mock.calls[0][2]).toMatchObject({ action: 'update', creates: true });
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permissions.assertEntry.mock.calls.map(([, action]) => action)).toEqual([
        'update',
        'update',
      ]);
      // The second check is after the write: the new version is what it judges
      expect(permissions.assertEntry.mock.invocationCallOrder[1]).toBeGreaterThan(
        service.update.mock.invocationCallOrder[0]
      );
      // The data written is judged as a create, for the draft and for the published version
      expect(
        permissions.assertWritten.mock.calls.map(([, action, , , scope]) => [action, scope.status])
      ).toEqual([
        ['create', 'draft'],
        ['create', 'published'],
      ]);
      expect(permissions.assertWritten.mock.invocationCallOrder[0]).toBeGreaterThan(
        service.update.mock.invocationCallOrder[0]
      );
    });

    it('decides a conditioned publish on the draft as written, in the transaction that writes it', async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(true);

      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.update`, { locale: 'fr', fields: ['title'] });

      await controller.update(ctx, next);

      // No publish check before the write: the stored versions are not what gets published
      expect(permissions.assertEntry.mock.calls.map(([, action]) => action)).toEqual(['update']);
      expect(service.update).toHaveBeenCalledWith('a1', {
        locale: 'fr',
        fields: ['title'],
        status: 'draft',
        data: { title: 'b' },
      });
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(auth, ARTICLE, 'a1', {
        locale: 'fr',
      });
      expect(ranBefore(service.update, permissions.publishIfAllowed)).toBe(true);
      expect(service.findOne).toHaveBeenCalledWith('a1', {
        fields: ['title'],
        locale: 'fr',
        status: 'published',
      });
      expect(ctx.state.inputAction).toBe('update');
    });

    it("publishes the request's locale when fields leave the locale out of the written draft", async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(true);
      // The write selected only the title: the entity names no locale
      service.update.mockResolvedValue({ documentId: 'a1', title: 'draft' });

      const controller = createController({ contentType: article });

      await controller.update(
        ctxFor(`${ARTICLE}.update`, { locale: 'fr', fields: ['title'] }),
        next
      );

      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(auth, ARTICLE, 'a1', {
        locale: 'fr',
      });
      expect(service.findOne).toHaveBeenCalledWith('a1', {
        fields: ['title'],
        locale: 'fr',
        status: 'published',
      });

      // A request naming no one locale leaves it to the Document Service's default
      permissions.publishIfAllowed.mockClear();

      await controller.update(ctxFor(`${ARTICLE}.update`, { fields: ['title'] }), next);
      await controller.update(
        ctxFor(`${ARTICLE}.update`, { locale: '*', fields: ['title'] }),
        next
      );

      expect(permissions.publishIfAllowed.mock.calls.map((call) => call[3])).toEqual([
        { locale: undefined },
        { locale: undefined },
      ]);
    });

    it('answers with the draft, and publishes nothing, when the draft as written does not match', async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(false);

      const controller = createController({ contentType: article });
      const ctx = ctxFor(`${ARTICLE}.update`);

      await controller.update(ctx, next);

      expect(service.findOne).not.toHaveBeenCalled();
      expect(sanitize.output.mock.calls[0][0]).toEqual({
        documentId: 'a1',
        locale: 'fr',
        title: 'draft',
      });
    });

    it('refuses an update that adds a locale to a caller whose create rows give no entry, and writes nothing', async () => {
      localized = true;
      stored = 0;
      permissions.checker.filtersFor.mockReturnValue(DENY_ALL_FILTER);

      const controller = createController({ contentType: article });

      await expect(
        controller.update(ctxFor(`${ARTICLE}.update`, { locale: 'fr' }), next)
      ).rejects.toBeInstanceOf(errors.ForbiddenError);
      expect(permissions.checker.filtersFor).toHaveBeenCalledWith(auth, 'create', ARTICLE);
      expect(service.update).not.toHaveBeenCalled();

      // An update of an entry that is there is no create
      stored = 1;

      await controller.update(ctxFor(`${ARTICLE}.update`, { locale: 'fr' }), next);

      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('rolls the write back, and answers 404, when the version it adds does not match', async () => {
      localized = true;
      stored = 0;
      permissions.assertEntry
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new errors.NotFoundError('Not Found'));

      const controller = createController({ contentType: article });

      await expect(
        controller.update(ctxFor(`${ARTICLE}.update`, { locale: 'fr' }), next)
      ).rejects.toBeInstanceOf(errors.NotFoundError);
      // The transaction held the write: its failure takes the write with it
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('publishes the version it adds when it matches the conditioned publish', async () => {
      localized = true;
      stored = 0;
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(true);

      const controller = createController({ contentType: article });

      await controller.update(ctxFor(`${ARTICLE}.update`, { locale: 'fr' }), next);

      // The locale of the version the update wrote
      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(auth, ARTICLE, 'a1', {
        locale: 'fr',
      });
      expect(service.findOne).toHaveBeenCalledWith('a1', { locale: 'fr', status: 'published' });
    });
  });

  describe('an update of a single type', () => {
    it('is a create when there is no document yet: stamped, checked for create, nothing to match', async () => {
      findFirst.mockResolvedValue(null);

      const controller = createController({ contentType: home });
      const ctx = ctxFor(`${HOME}.update`);

      await controller.update(ctx, next);

      expect(permissions.checker.filtersFor).toHaveBeenCalledWith(auth, 'create', HOME);
      expect(permissions.resolveWriteStatus).toHaveBeenCalledWith(auth, HOME, {
        requested: undefined,
        locale: undefined,
      });
      expect(ctx.state.createsEntry).toBe(true);
      expect(sanitize.input.mock.calls[0][2]).toMatchObject({ action: 'update', creates: true });
      expect(service.createOrUpdate).toHaveBeenCalledTimes(1);
      // Nothing to match before the write; the written document is held to the update checks once
      // written, in the transaction that writes it, which also makes sure it is the only one
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permissions.assertEntry.mock.calls).toEqual([[auth, 'update', HOME, 'h1', {}]]);
      expect(ranBefore(service.createOrUpdate, permissions.assertEntry)).toBe(true);
      expect(countOthers).toHaveBeenCalledWith({ where: { documentId: { $ne: 'h1' } } });
    });

    it('holds a document another request created since the first look to the update checks, before the write', async () => {
      // None at the first look; one there when the transaction looks again
      findFirst.mockResolvedValueOnce(null).mockResolvedValue({ documentId: 'other' });
      permissions.assertEntry.mockRejectedValueOnce(new errors.NotFoundError('Not Found'));

      const controller = createController({ contentType: home });

      await expect(controller.update(ctxFor(`${HOME}.update`), next)).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
      expect(permissions.assertEntry).toHaveBeenCalledWith(auth, 'update', HOME, 'other', {});
      expect(service.createOrUpdate).not.toHaveBeenCalled();
    });

    it('rolls the first write back when the written document is not the only one, or not the one checked', async () => {
      findFirst.mockResolvedValue(null);
      // Another request created a document of its own meanwhile
      countOthers.mockResolvedValueOnce(1);

      const controller = createController({ contentType: home });

      await expect(controller.update(ctxFor(`${HOME}.update`), next)).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(service.createOrUpdate).toHaveBeenCalledTimes(1);

      // The transaction found one and the service wrote another
      findFirst.mockReset();
      findFirst.mockResolvedValueOnce(null).mockResolvedValue({ documentId: 'other' });

      await expect(controller.update(ctxFor(`${HOME}.update`), next)).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
    });

    it('refuses, and rolls back, a write the service made to a document the transaction did not see', async () => {
      // The controller's looks find nothing; the service's own lookup finds a document another
      // request created in between, and updates it
      findFirst.mockResolvedValue(null);
      service.createOrUpdate.mockResolvedValueOnce({ documentId: 'other', title: 'draft' });
      // It is not the caller's: its owner is someone else's
      permissions.assertEntry.mockRejectedValueOnce(new errors.NotFoundError('Not Found'));

      const controller = createController({ contentType: home });

      await expect(controller.update(ctxFor(`${HOME}.update`), next)).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
      expect(permissions.assertEntry).toHaveBeenCalledWith(auth, 'update', HOME, 'other', {});
      // Checked once written, in the transaction that wrote it: the refusal rolls it back
      expect(ranBefore(service.createOrUpdate, permissions.assertEntry)).toBe(true);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(sanitize.output).not.toHaveBeenCalled();
    });

    it("lets a creator's first PUT through: the create stamp makes the new document theirs", async () => {
      findFirst.mockResolvedValue(null);
      // is-owner: the document this write created carries the caller, stamped as its owner
      permissions.assertEntry.mockResolvedValue(undefined);

      const controller = createController({ contentType: home });
      const ctx = ctxFor(`${HOME}.update`);

      await controller.update(ctx, next);

      expect(ctx.state.createsEntry).toBe(true);
      expect(permissions.assertEntry).toHaveBeenCalledWith(auth, 'update', HOME, 'h1', {});
      expect(sanitize.output).toHaveBeenCalledTimes(1);
    });

    it('refuses an update that adds a locale to a caller whose create rows give no entry', async () => {
      localized = true;
      stored = 0;
      permissions.checker.filtersFor.mockReturnValue(DENY_ALL_FILTER);

      const controller = createController({ contentType: home });

      await expect(
        controller.update(ctxFor(`${HOME}.update`, { locale: 'fr' }), next)
      ).rejects.toBeInstanceOf(errors.ForbiddenError);
      expect(service.createOrUpdate).not.toHaveBeenCalled();
    });

    it("publishes the request's locale of a single type when fields leave the locale out", async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(true);
      service.createOrUpdate.mockResolvedValue({ documentId: 'h1', title: 'draft' });

      const controller = createController({ contentType: home });

      await controller.update(ctxFor(`${HOME}.update`, { locale: 'fr', fields: ['title'] }), next);

      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(auth, HOME, 'h1', {
        locale: 'fr',
      });
      expect(service.find).toHaveBeenCalledWith({
        fields: ['title'],
        locale: 'fr',
        status: 'published',
      });
    });

    it('decides a conditioned publish of an existing document on the draft as written', async () => {
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(true);

      const controller = createController({ contentType: home });

      await controller.update(ctxFor(`${HOME}.update`), next);

      expect(permissions.assertEntry.mock.calls.map(([, action]) => action)).toEqual(['update']);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(ranBefore(service.createOrUpdate, permissions.publishIfAllowed)).toBe(true);
      expect(service.find).toHaveBeenCalledWith({ locale: 'en', status: 'published' });
    });

    it('refuses the first update of a caller whose create rows give no entry', async () => {
      findFirst.mockResolvedValue(null);
      permissions.checker.filtersFor.mockReturnValue(DENY_ALL_FILTER);

      const controller = createController({ contentType: home });

      await expect(controller.update(ctxFor(`${HOME}.update`), next)).rejects.toBeInstanceOf(
        errors.ForbiddenError
      );
      expect(service.createOrUpdate).not.toHaveBeenCalled();
    });

    it('does not refuse an update of an existing document for lack of a create row', async () => {
      permissions.checker.filtersFor.mockReturnValue(DENY_ALL_FILTER);

      const controller = createController({ contentType: home });
      const ctx = ctxFor(`${HOME}.update`);

      await controller.update(ctx, next);

      expect(ctx.state.createsEntry).toBeUndefined();
      expect(service.createOrUpdate).toHaveBeenCalledTimes(1);
    });

    it('resolves the status for the existing document, and checks the publish when it publishes', async () => {
      resolved = { status: 'published', publishAfterCreate: false };

      const controller = createController({ contentType: home });

      await controller.update(ctxFor(`${HOME}.update`, { locale: 'fr' }), next);

      expect(permissions.resolveWriteStatus).toHaveBeenCalledWith(auth, HOME, {
        requested: undefined,
        documentId: 'h1',
        locale: 'fr',
      });
      expect(permissions.assertEntry.mock.calls).toEqual([
        [auth, 'update', HOME, 'h1', { locale: 'fr' }],
        [auth, 'publish', HOME, 'h1', { locale: 'fr' }],
      ]);
      expect(service.createOrUpdate).toHaveBeenCalledWith({
        locale: 'fr',
        status: 'published',
        data: { title: 'b' },
      });
    });

    it('writes a draft and no publish check when the caller cannot publish the document', async () => {
      resolved = { status: 'draft', publishAfterCreate: false };

      const controller = createController({ contentType: home });

      await controller.update(ctxFor(`${HOME}.update`), next);

      expect(statusSeen).toEqual({ validate: 'draft', sanitize: 'draft' });
      expect(permissions.assertEntry.mock.calls.map(([, action]) => action)).toEqual(['update']);
      expect(service.createOrUpdate).toHaveBeenCalledWith({
        status: 'draft',
        data: { title: 'b' },
      });
    });

    it('publishes the first document of a conditioned publish when it matches, in one transaction', async () => {
      findFirst.mockResolvedValue(null);
      resolved = { status: 'draft', publishAfterCreate: true };
      permissions.publishIfAllowed.mockResolvedValue(true);

      const controller = createController({ contentType: home });

      await controller.update(ctxFor(`${HOME}.update`, { populate: 'tags' }), next);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permissions.publishIfAllowed).toHaveBeenCalledWith(auth, HOME, 'h1', { locale: 'en' });
      expect(service.find).toHaveBeenCalledWith({
        populate: 'tags',
        locale: 'en',
        status: 'published',
      });
    });

    it('writes what a caller that is not subject-aware always wrote, with nothing looked up', async () => {
      subjectAware = false;
      resolved = { status: 'draft', publishAfterCreate: true };

      const controller = createController({ contentType: home });
      const ctx = ctxFor(`${HOME}.update`, { status: 'published' });

      await controller.update(ctx, next);

      expect(ctx.query).toEqual({ status: 'published' });
      expect(service.createOrUpdate).toHaveBeenCalledWith({
        status: 'published',
        data: { title: 'b' },
      });
      expect(global.strapi.db.query).not.toHaveBeenCalled();
      expect(permissions.assertEntry).not.toHaveBeenCalled();
      expect(permissions.checker.filtersFor).not.toHaveBeenCalled();
      expect(count).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});
