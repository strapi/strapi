import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DENY_ALL_FILTER, errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import type { ConditionUser, ContentApiPermission } from '../types';

const ARTICLE = 'api::article.article';
const NOTE = 'api::note.note';
const USER_UID = 'plugin::end-users.user';

const user: ConditionUser = {
  uid: USER_UID,
  id: 7,
  documentId: 'u1',
  roles: [{ documentId: 'r1' }],
};

const OK_TITLE = { title: { $startsWith: 'ok' } };
/** What `filtersFor` gives for a row with the one condition */
const FILTERS = { $or: [{ $and: [{ $or: [OK_TITLE] }] }] };
const startsOk = [{ name: 'test.starts-ok' }];

const contentApi = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => [
      name,
      Object.assign(() => {}, { [Symbol.for('__type__')]: ['content-api'] }),
    ])
  );

describe('Content API permissions: assertWritten', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;
  let count: ReturnType<typeof vi.fn>;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    count = vi.fn(async () => 1);
    query = vi.fn(() => ({ count }));

    const contentTypes = {
      [ARTICLE]: { uid: ARTICLE, options: { draftAndPublish: true } },
      [NOTE]: { uid: NOTE, options: { draftAndPublish: false } },
    };

    global.strapi = {
      isLoaded: false,
      log: { debug: vi.fn() },
      contentTypes,
      contentType: (uid: string) => (contentTypes as Record<string, unknown>)[uid],
      db: { query },
      localization: {
        isLocalizedContentType: (contentType: { uid: string }) => contentType.uid === ARTICLE,
        getDefaultLocale: async () => 'en',
      },
      apis: {
        article: { controllers: { article: contentApi('find', 'create', 'update') } },
        note: { controllers: { note: contentApi('find', 'create', 'update') } },
      },
      plugins: {},
    } as unknown as Core.Strapi;

    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    await p.providers.condition.register({
      name: 'test.starts-ok',
      displayName: 'Starts with ok',
      query: OK_TITLE,
    });
  });

  const authOf = async (rows: ContentApiPermission[]) => ({
    strategy: { name: 'end-users' },
    credentials: user,
    ability: await p.generateAbility(rows, { user }),
  });

  const conditioned = (uid: string) =>
    authOf(
      ['create', 'update'].map((verb) => ({ action: `${uid}.${verb}`, conditions: startsOk }))
    );

  it('passes when the written version matches the create filters', async () => {
    const auth = await conditioned(ARTICLE);

    await expect(
      p.assertWritten(auth, 'create', ARTICLE, 'a1', { locale: 'en', status: 'draft' })
    ).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledWith(ARTICLE);
    expect(count).toHaveBeenCalledTimes(1);
  });

  it('throws a 403 PolicyError when it does not', async () => {
    const auth = await conditioned(ARTICLE);

    count.mockResolvedValue(0);

    const error = await p
      .assertWritten(auth, 'update', ARTICLE, 'a1', { locale: 'en', status: 'draft' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(errors.PolicyError);
    expect((error as errors.PolicyError).details?.status ?? 403).toBe(403);
    expect((error as errors.PolicyError).message).toBe(
      'This change is outside what your role allows.'
    );
  });

  it('refuses a caller whose rows for the action give no entry', async () => {
    const auth = await authOf([{ action: `${ARTICLE}.create`, conditions: [{ name: 'nobody' }] }]);

    count.mockResolvedValue(0);

    await expect(
      p.assertWritten(auth, 'create', ARTICLE, 'a1', { status: 'draft' })
    ).rejects.toBeInstanceOf(errors.PolicyError);

    expect(count.mock.calls[0][0].where.$and).toStrictEqual([DENY_ALL_FILTER]);
  });

  it('is a no-op for an ability that is not subject-aware', async () => {
    const routeAbility = await p.engine.generateAbility([{ action: `${ARTICLE}.create` }]);
    const token = { strategy: { name: 'api-token' }, credentials: {}, ability: routeAbility };

    for (const auth of [token, null, undefined, {}, { ability: null }]) {
      await expect(
        p.assertWritten(auth, 'create', ARTICLE, 'a1', { status: 'draft' })
      ).resolves.toBeUndefined();
    }

    expect(count).not.toHaveBeenCalled();
  });

  it('is a no-op when the rows for the action have no entry filter', async () => {
    const auth = await authOf([
      { action: `${ARTICLE}.create` },
      { action: `${ARTICLE}.update`, conditions: startsOk },
    ]);

    await expect(
      p.assertWritten(auth, 'create', ARTICLE, 'a1', { status: 'draft' })
    ).resolves.toBeUndefined();

    expect(count).not.toHaveBeenCalled();
  });

  it('counts the written locale and status only', async () => {
    const auth = await conditioned(ARTICLE);

    await p.assertWritten(auth, 'create', ARTICLE, 'a1', { locale: 'nl', status: 'draft' });
    await p.assertWritten(auth, 'update', ARTICLE, 'a1', { locale: 'nl', status: 'published' });

    expect(count).toHaveBeenNthCalledWith(1, {
      where: { documentId: 'a1', locale: 'nl', publishedAt: null, $and: [FILTERS] },
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      where: { documentId: 'a1', locale: 'nl', publishedAt: { $notNull: true }, $and: [FILTERS] },
    });
  });

  it('counts the default locale when the write names none, on a localized type only', async () => {
    const auth = await conditioned(ARTICLE);

    await p.assertWritten(auth, 'create', ARTICLE, 'a1', { status: 'draft' });

    expect(count).toHaveBeenCalledWith({
      where: { documentId: 'a1', locale: 'en', publishedAt: null, $and: [FILTERS] },
    });
  });

  it('counts no status on a type without draft & publish', async () => {
    const auth = await conditioned(NOTE);

    await p.assertWritten(auth, 'create', NOTE, 'n1', {});

    expect(count).toHaveBeenCalledWith({ where: { documentId: 'n1', $and: [FILTERS] } });
  });

  it('refuses what it cannot name, whoever asks', async () => {
    const auth = await conditioned(ARTICLE);
    const route = await p.engine.generateAbility([{ action: `${ARTICLE}.create` }]);
    const token = { strategy: { name: 'api-token' }, credentials: {}, ability: route };

    await expect(
      p.assertWritten(auth, 'create', ARTICLE, '', { status: 'draft' })
    ).rejects.toBeInstanceOf(errors.PolicyError);
    await expect(
      p.assertWritten(auth, 'create', 'api::nope.nope' as never, 'a1', {})
    ).rejects.toBeInstanceOf(errors.PolicyError);
    await expect(
      p.assertWritten(token, 'delete' as never, ARTICLE, 'a1', {})
    ).rejects.toBeInstanceOf(errors.PolicyError);

    expect(count).not.toHaveBeenCalled();
  });

  it('tells explain mode the written-data check ran, and only for a subject-aware caller', async () => {
    const auth = await conditioned(ARTICLE);
    const route = await p.engine.generateAbility([{ action: `${ARTICLE}.create` }]);
    const token = { strategy: { name: 'api-token' }, credentials: {}, ability: route };

    expect(p.readExplain(auth).entryChecked).toBe(false);

    await p.assertWritten(auth, 'create', ARTICLE, 'a1', { status: 'draft' });
    await p.assertWritten(token, 'create', ARTICLE, 'a1', { status: 'draft' });

    expect(p.readExplain(auth).entryChecked).toBe(true);
    expect(p.readExplain(token).entryChecked).toBe(false);
  });
});
