import { beforeEach, describe, expect, it, vi } from 'vitest';
import { omit } from 'lodash';

import type { PermissionChecker } from '../content-api-permissions';
import { createAPISanitizers } from '../sanitize';
import { createAPIValidators } from '../validate';
import { ValidationError } from '../errors';
import type { Model } from '../types';

const USER_UID = 'plugin::end-users.user';

const user = {
  uid: USER_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
  options: {},
  attributes: { email: { type: 'string' }, name: { type: 'string' } },
} satisfies Model;

const article = {
  uid: 'api::article.article',
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: {},
  attributes: {
    title: { type: 'string' },
    body: { type: 'text' },
    author: { type: 'relation', relation: 'oneToOne', target: USER_UID },
  },
} satisfies Model;

const models: Record<string, Model> = { [article.uid]: article, [user.uid]: user };
const getModel = (uid: string) => models[uid];

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 }, ability: {} };

/** What an is-owner create stamps, and what it locks on update */
const STAMP = { author: { set: [{ documentId: 'u1' }] } };

const checkerOf = (overrides: Partial<PermissionChecker> = {}) => {
  const checker = {
    isActive: vi.fn(() => true),
    filtersFor: vi.fn(() => ({})),
    canReadDrafts: vi.fn(() => true),
    fieldsFor: vi.fn(() => ({ always: null, conditional: [] })),
    readableFields: vi.fn(() => null),
    writableFields: vi.fn(() => null),
    lockedFields: vi.fn(() => ['author']),
    stampFor: vi.fn(() => ({ ...STAMP })),
    populateDepth: vi.fn(() => null),
    record: vi.fn(),
    ...overrides,
  };

  return checker as unknown as PermissionChecker & typeof checker;
};

const apiOf = (
  permissions: PermissionChecker,
  registry: { input?: Array<(schema: Model) => (data: any) => any> } = {}
) => ({
  sanitize: createAPISanitizers({
    getModel,
    sanitizers: { input: (registry.input ?? []) as never, output: [] },
    permissions,
  }),
  validate: createAPIValidators({ getModel, permissions }),
});

const rejection = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return error as ValidationError;
  }

  throw new Error('did not throw');
};

describe('Content API permissions: the stamp and the locked fields of a write', () => {
  beforeEach(() => {
    // The relation visitors ask `strapi.auth.verify` whether the caller may read the target
    (globalThis as unknown as { strapi: unknown }).strapi = {
      contentTypes: models,
      components: {},
      getModel,
      auth: { verify: () => true },
    };
  });

  describe('sanitize.input', () => {
    it('sets the stamp on a create, with the body kept', async () => {
      const checker = checkerOf();
      const { sanitize } = apiOf(checker);

      expect(await sanitize.input({ title: 'a' }, article, { auth, action: 'create' })).toEqual({
        title: 'a',
        ...STAMP,
      });
      expect(checker.stampFor).toHaveBeenCalledWith(auth, article.uid);
      expect(checker.lockedFields).not.toHaveBeenCalled();
    });

    it('lets the stamp win over what the body sent', async () => {
      const { sanitize } = apiOf(checkerOf());

      expect(
        await sanitize.input({ title: 'a', author: { set: [{ documentId: 'u2' }] } }, article, {
          auth,
          action: 'create',
        })
      ).toEqual({ title: 'a', ...STAMP });
    });

    it('stamps after every other step: a registry sanitizer cannot strip the owner', async () => {
      const { sanitize } = apiOf(checkerOf(), {
        input: [() => (data) => omit(data, ['author', 'title'])],
      });

      expect(
        await sanitize.input({ title: 'a', body: 'b' }, article, { auth, action: 'create' })
      ).toEqual({ body: 'b', ...STAMP });
    });

    it('stamps each entry of a list', async () => {
      const { sanitize } = apiOf(checkerOf());

      expect(
        await sanitize.input([{ title: 'a' }, { title: 'b' }], article, { auth, action: 'create' })
      ).toEqual([
        { title: 'a', ...STAMP },
        { title: 'b', ...STAMP },
      ]);
    });

    it('drops the locked fields of an update, and stamps nothing', async () => {
      const checker = checkerOf({ lockedFields: vi.fn(() => ['author', 'body']) });
      const { sanitize } = apiOf(checker);

      expect(
        await sanitize.input(
          { title: 'a', body: 'b', author: { set: [{ documentId: 'u2' }] } },
          article,
          { auth, action: 'update' }
        )
      ).toEqual({ title: 'a' });
      expect(checker.lockedFields).toHaveBeenCalledWith(auth, article.uid);
      expect(checker.stampFor).not.toHaveBeenCalled();
    });

    it('leaves an update alone when nothing is locked', async () => {
      const { sanitize } = apiOf(checkerOf({ lockedFields: vi.fn(() => []) }));
      const body = { title: 'a', author: { set: [{ documentId: 'u2' }] } };

      expect(await sanitize.input(body, article, { auth, action: 'update' })).toEqual(body);
    });

    it('stamps an update that creates an entry, on top of its locked fields', async () => {
      const checker = checkerOf();
      const { sanitize } = apiOf(checker);

      expect(
        await sanitize.input({ title: 'a', author: { set: [{ documentId: 'u2' }] } }, article, {
          auth,
          action: 'update',
          creates: true,
        })
      ).toEqual({ title: 'a', ...STAMP });
      expect(checker.lockedFields).toHaveBeenCalledTimes(1);
      expect(checker.stampFor).toHaveBeenCalledTimes(1);
    });

    it('does not stamp or lock for any other action', async () => {
      const checker = checkerOf();
      const { sanitize } = apiOf(checker);

      for (const action of ['find', 'delete', 'me', undefined]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await sanitize.input({ title: 'a' }, article, { auth, action })).toEqual({
          title: 'a',
        });
      }

      expect(checker.stampFor).not.toHaveBeenCalled();
      expect(checker.lockedFields).not.toHaveBeenCalled();
    });

    it('asks an inactive checker nothing but isActive, and a missing auth nothing at all', async () => {
      const inactive = checkerOf({ isActive: vi.fn(() => false) });
      const { sanitize } = apiOf(inactive);

      for (const action of ['create', 'update']) {
        // eslint-disable-next-line no-await-in-loop
        expect(
          await sanitize.input({ title: 'a' }, article, { auth, action, creates: true })
        ).toEqual({
          title: 'a',
        });
      }

      expect(inactive.isActive).toHaveBeenCalled();
      expect(inactive.stampFor).not.toHaveBeenCalled();
      expect(inactive.lockedFields).not.toHaveBeenCalled();

      const active = checkerOf();

      expect(
        await apiOf(active).sanitize.input({ title: 'a' }, article, { action: 'create' })
      ).toEqual({
        title: 'a',
      });
      expect(active.isActive).not.toHaveBeenCalled();
      expect(active.stampFor).not.toHaveBeenCalled();
    });
  });

  describe('validate.input', () => {
    it('refuses a create whose body sends a key the stamp sets, naming it', async () => {
      const checker = checkerOf();
      const { validate } = apiOf(checker);

      for (const author of [{ set: [{ documentId: 'u2' }] }, null, {}]) {
        // eslint-disable-next-line no-await-in-loop
        const error = await rejection(() =>
          validate.input({ title: 'a', author }, article, { auth, action: 'create' })
        );

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Invalid key author: it is set by the server');
        expect(error.details).toMatchObject({ key: 'author', source: 'body' });
      }

      await expect(
        validate.input({ title: 'a' }, article, { auth, action: 'create' })
      ).resolves.toBeUndefined();
      expect(checker.lockedFields).not.toHaveBeenCalled();
    });

    it('refuses an update whose body sends a locked field, naming it', async () => {
      const checker = checkerOf({ lockedFields: vi.fn(() => ['author', 'body']) });
      const { validate } = apiOf(checker);

      for (const field of ['author', 'body']) {
        // eslint-disable-next-line no-await-in-loop
        const error = await rejection(() =>
          validate.input({ title: 'a', [field]: 'x' }, article, { auth, action: 'update' })
        );

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe(`Invalid key ${field}: it can not be changed`);
        expect(error.details).toMatchObject({ key: field, source: 'body' });
      }

      await expect(
        validate.input({ title: 'a' }, article, { auth, action: 'update' })
      ).resolves.toBeUndefined();
      expect(checker.stampFor).not.toHaveBeenCalled();
    });

    it('names the field for a caller who could not read the related type too', async () => {
      // A role without `find` on the user is refused the relation by `throwRestrictedRelations`
      // with another reason: the check comes first, so every role gets the same answer
      (globalThis as unknown as { strapi: { auth: unknown } }).strapi.auth = {
        verify() {
          throw new Error('forbidden');
        },
      };

      const { validate } = apiOf(checkerOf());

      for (const action of ['create', 'update']) {
        // eslint-disable-next-line no-await-in-loop
        const error = await rejection(() =>
          validate.input({ author: { set: [{ documentId: 'u2' }] } }, article, { auth, action })
        );

        expect(error.details).toMatchObject({ key: 'author' });
        expect(error.message).toMatch(/^Invalid key author: /);
      }
    });

    it('refuses both on an update that creates an entry', async () => {
      const checker = checkerOf({
        lockedFields: vi.fn(() => ['body']),
        stampFor: vi.fn(() => ({ author: { set: [{ documentId: 'u1' }] } })),
      });
      const { validate } = apiOf(checker);
      const options = { auth, action: 'update', creates: true };

      expect(
        (await rejection(() => validate.input({ body: 'x' }, article, options))).details
      ).toMatchObject({
        key: 'body',
      });
      expect(
        (await rejection(() => validate.input({ author: null }, article, options))).details
      ).toMatchObject({ key: 'author' });
      await expect(validate.input({ title: 'a' }, article, options)).resolves.toBeUndefined();
    });

    it('checks each entry of a list', async () => {
      const { validate } = apiOf(checkerOf());

      await expect(
        validate.input([{ title: 'a' }, { author: null }], article, { auth, action: 'create' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('asks an inactive checker nothing but isActive', async () => {
      const inactive = checkerOf({ isActive: vi.fn(() => false) });
      const { validate } = apiOf(inactive);

      for (const action of ['create', 'update']) {
        // eslint-disable-next-line no-await-in-loop
        await expect(
          validate.input({ title: 'a', author: null }, article, { auth, action, creates: true })
        ).resolves.toBeUndefined();
      }

      expect(inactive.stampFor).not.toHaveBeenCalled();
      expect(inactive.lockedFields).not.toHaveBeenCalled();
    });
  });
});
