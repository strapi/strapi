import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errors } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { createController } from '..';

const HOME = 'api::home.home';
const NOTE = 'api::note.note';

const schemaOf = (uid: string, kind: string, name: string) => ({
  uid,
  modelType: 'contentType',
  kind,
  info: { singularName: name, pluralName: `${name}s`, displayName: name },
  options: {},
  attributes: { title: { type: 'string' } },
});

const home = schemaOf(HOME, 'singleType', 'home') as unknown as Struct.SingleTypeSchema;
const note = schemaOf(NOTE, 'collectionType', 'note') as unknown as Struct.CollectionTypeSchema;

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 } };

const next = async () => {};

describe('Core controllers: the stored entry is checked before a write', () => {
  let subjectAware: boolean;
  let permissions: {
    isSubjectAware: ReturnType<typeof vi.fn>;
    assertEntry: ReturnType<typeof vi.fn>;
    assertWritten: ReturnType<typeof vi.fn>;
    resolveWriteStatus: ReturnType<typeof vi.fn>;
    publishIfAllowed: ReturnType<typeof vi.fn>;
    checker: { filtersFor: ReturnType<typeof vi.fn> };
  };
  let findOne: ReturnType<typeof vi.fn>;
  let dbQuery: ReturnType<typeof vi.fn>;
  let service: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    subjectAware = true;
    permissions = {
      isSubjectAware: vi.fn(() => subjectAware),
      assertEntry: vi.fn(async () => {}),
      assertWritten: vi.fn(async () => {}),
      // What a caller with no publish gate gets: the status as requested
      resolveWriteStatus: vi.fn(async (_auth, _uid, opts) => ({
        status: opts.requested,
        publishAfterCreate: false,
      })),
      publishIfAllowed: vi.fn(async () => false),
      checker: { filtersFor: vi.fn(() => ({})) },
    };
    findOne = vi.fn(async () => ({ documentId: 'home1' }));
    dbQuery = vi.fn(() => ({ findOne, count: vi.fn(async () => 0) }));
    service = {
      createOrUpdate: vi.fn(async () => ({ documentId: 'home1', title: 'b' })),
      update: vi.fn(async () => ({ documentId: 'n1', title: 'b' })),
      delete: vi.fn(async () => ({ deletedEntries: 1 })),
    };

    global.strapi = {
      contentAPI: {
        sanitize: {
          output: vi.fn(async (data: unknown) => data),
          input: vi.fn(async (data: unknown) => data),
          query: vi.fn(async (query: unknown) => query),
        },
        validate: { query: vi.fn(async () => {}), input: vi.fn(async () => {}) },
        permissions,
      },
      config: { get: () => undefined },
      db: { query: dbQuery, transaction: vi.fn(async (callback: () => unknown) => callback()) },
      localization: { isLocalizedContentType: vi.fn(() => false) },
      service: vi.fn(() => service),
    } as unknown as Core.Strapi;
  });

  const ctxFor = (handler: string, query: Record<string, unknown> = { locale: 'fr' }) =>
    ({
      query,
      params: { id: 'n1' },
      request: { body: { data: { title: 'b' } } },
      state: { auth, route: { method: 'PUT', path: '/x', handler } },
    }) as any;

  /** Whether `first` ran before `then` */
  const ranBefore = (first: ReturnType<typeof vi.fn>, then: ReturnType<typeof vi.fn>) =>
    first.mock.invocationCallOrder[0] < then.mock.invocationCallOrder[0];

  describe('a single type', () => {
    it('calls assertEntry with the existing document of a single type and skips it when there is none', async () => {
      const controller = createController({ contentType: home });

      await controller.update(ctxFor(`${HOME}.update`), next);
      await controller.delete(ctxFor(`${HOME}.delete`), next);

      expect(dbQuery).toHaveBeenCalledWith(HOME);
      expect(findOne).toHaveBeenCalledWith({ select: ['documentId'] });
      expect(permissions.assertEntry.mock.calls).toEqual([
        [auth, 'update', HOME, 'home1', { locale: 'fr' }],
        [auth, 'delete', HOME, 'home1', { locale: 'fr' }],
      ]);
      expect(ranBefore(permissions.assertEntry, service.createOrUpdate)).toBe(true);
      expect(service.delete).toHaveBeenCalledTimes(1);

      // No document yet: the first update creates it, with nothing to check before the write; the
      // document it wrote is checked once written
      permissions.assertEntry.mockClear();
      findOne.mockResolvedValue(null);

      await controller.update(ctxFor(`${HOME}.update`), next);

      expect(permissions.assertEntry.mock.calls).toEqual([
        [auth, 'update', HOME, 'home1', { locale: 'fr' }],
      ]);
      expect(service.createOrUpdate).toHaveBeenCalledTimes(2);
    });

    it('passes the locale as it came: "*" and a list name several locales to check', async () => {
      const controller = createController({ contentType: home });

      await controller.delete(ctxFor(`${HOME}.delete`, { locale: '*' }), next);
      await controller.delete(ctxFor(`${HOME}.delete`, { locale: ['en', 'fr'] }), next);
      await controller.update(ctxFor(`${HOME}.update`, {}), next);

      expect(permissions.assertEntry.mock.calls.map(([, , , , opts]) => opts)).toEqual([
        { locale: '*' },
        { locale: ['en', 'fr'] },
        { locale: undefined },
      ]);
    });

    it('answers 404 to a delete when there is no document, as a refused one does, not a 204', async () => {
      const controller = createController({ contentType: home });

      findOne.mockResolvedValue(null);

      const remove = ctxFor(`${HOME}.delete`);
      // The error a refused delete throws (assertEntry's), word for word
      const rejection = expect(controller.delete(remove, next)).rejects;

      await rejection.toBeInstanceOf(errors.NotFoundError);
      await rejection.toMatchObject({ name: 'NotFoundError', message: 'Not Found', details: {} });
      expect(permissions.assertEntry).not.toHaveBeenCalled();
      expect(service.delete).not.toHaveBeenCalled();
      expect(remove.status).toBeUndefined();
    });

    it('still answers 204 to a delete with no document for an ability that is not subject-aware', async () => {
      subjectAware = false;
      findOne.mockResolvedValue(null);

      const controller = createController({ contentType: home });
      const remove = ctxFor(`${HOME}.delete`);

      await controller.delete(remove, next);

      expect(dbQuery).not.toHaveBeenCalled();
      expect(service.delete).toHaveBeenCalledTimes(1);
      expect(remove.status).toBe(204);
    });

    it('writes nothing when the existing document does not match', async () => {
      const controller = createController({ contentType: home });

      permissions.assertEntry.mockRejectedValue(new errors.NotFoundError('Not Found'));

      const update = ctxFor(`${HOME}.update`);
      const remove = ctxFor(`${HOME}.delete`);

      await expect(controller.update(update, next)).rejects.toBeInstanceOf(errors.NotFoundError);
      await expect(controller.delete(remove, next)).rejects.toBeInstanceOf(errors.NotFoundError);

      expect(service.createOrUpdate).not.toHaveBeenCalled();
      expect(service.delete).not.toHaveBeenCalled();
      expect(remove.status).toBeUndefined();
    });

    it('looks nothing up for an ability that is not subject-aware', async () => {
      subjectAware = false;

      const controller = createController({ contentType: home });

      await controller.update(ctxFor(`${HOME}.update`), next);
      await controller.delete(ctxFor(`${HOME}.delete`), next);

      expect(permissions.isSubjectAware).toHaveBeenCalledWith(auth);
      expect(dbQuery).not.toHaveBeenCalled();
      expect(permissions.assertEntry).not.toHaveBeenCalled();
      expect(service.createOrUpdate).toHaveBeenCalledTimes(1);
      expect(service.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('a collection type', () => {
    it('calls assertEntry with the route id and the query locale before the service', async () => {
      const controller = createController({ contentType: note });

      await controller.update(ctxFor(`${NOTE}.update`), next);
      await controller.delete(ctxFor(`${NOTE}.delete`, {}), next);

      expect(permissions.assertEntry.mock.calls).toEqual([
        [auth, 'update', NOTE, 'n1', { locale: 'fr' }],
        [auth, 'delete', NOTE, 'n1', { locale: undefined }],
      ]);
      expect(ranBefore(permissions.assertEntry, service.update)).toBe(true);
      expect(service.update).toHaveBeenCalledWith('n1', expect.anything());
      expect(service.delete).toHaveBeenCalledWith('n1', {});
      // The id is the check's: nothing is looked up for a collection type
      expect(dbQuery).not.toHaveBeenCalled();
    });

    it('passes the locale as it came: "*" and a list name several locales to check', async () => {
      const controller = createController({ contentType: note });

      await controller.delete(ctxFor(`${NOTE}.delete`, { locale: '*' }), next);
      await controller.delete(ctxFor(`${NOTE}.delete`, { locale: ['en', 'fr'] }), next);
      await controller.update(ctxFor(`${NOTE}.update`, { locale: ['en', 'fr'] }), next);

      expect(
        permissions.assertEntry.mock.calls.map(([, action, , , opts]) => [action, opts])
      ).toEqual([
        ['delete', { locale: '*' }],
        ['delete', { locale: ['en', 'fr'] }],
        ['update', { locale: ['en', 'fr'] }],
      ]);
    });

    it('writes nothing when the stored entry does not match', async () => {
      const controller = createController({ contentType: note });

      permissions.assertEntry.mockRejectedValue(new errors.NotFoundError('Not Found'));

      const remove = ctxFor(`${NOTE}.delete`);

      await expect(controller.update(ctxFor(`${NOTE}.update`), next)).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
      await expect(controller.delete(remove, next)).rejects.toBeInstanceOf(errors.NotFoundError);

      expect(service.update).not.toHaveBeenCalled();
      expect(service.delete).not.toHaveBeenCalled();
      expect(remove.status).toBeUndefined();
    });
  });
});
