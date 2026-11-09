import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { ACCOUNT_UID, PROFILE_UID, USER_UID } from '../../constants';
import { loadUserExtras, splitUserWrites } from '../user-extras';

const profileSchema = {
  uid: PROFILE_UID,
  modelType: 'contentType',
  kind: 'collectionType',
  attributes: {
    user: { type: 'relation', relation: 'oneToOne', target: 'plugin::end-users.user' },
    bio: { type: 'string' },
    secretNote: { type: 'string', private: true },
    hidden: { type: 'string' },
    email: { type: 'string' },
    avatar: { type: 'media', multiple: false },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

const setup = () => {
  const profiles = [
    {
      id: 1,
      documentId: 'p1',
      user: { documentId: 'u1' },
      bio: 'one',
      secretNote: 's',
      hidden: 'h',
      email: 'profile@example.com',
    },
    { id: 2, documentId: 'p2', user: { documentId: 'u2' }, bio: 'two', hidden: 'h' },
  ];
  const accounts = [
    { userId: 'u1', providerId: 'github' },
    { userId: 'u1', providerId: 'credential' },
    { userId: 'u2', providerId: 'google' },
    { userId: 'u2', providerId: 'github' },
  ];
  const findMany = vi.fn<(params: Record<string, unknown>) => void>();
  const documents = vi.fn((uid: string) => ({
    async findMany(params: Record<string, unknown>) {
      findMany(params);

      return uid === PROFILE_UID ? profiles : accounts;
    },
  }));
  // The caller's role cannot read `hidden`
  const output = vi.fn(async (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'hidden'))
  );
  const strapi = {
    documents,
    contentType: (uid: string) =>
      uid === USER_UID ? { uid, attributes: { username: {}, name: {}, email: {} } } : profileSchema,
    contentAPI: { sanitize: { output } },
  } as unknown as Core.Strapi;

  // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
  vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });

  return { strapi, documents, findMany, output };
};

describe('loadUserExtras', () => {
  it('falls back to the carried provider when the user has no account', async () => {
    const strapi = {
      documents: () => ({ findMany: async () => [] }),
      contentType: (uid: string) =>
        uid === USER_UID ? { uid, attributes: { provider: {} } } : profileSchema,
      contentAPI: { sanitize: { output: async (data: unknown) => data } },
      db: {
        query: () => ({
          findMany: async () => [
            { documentId: 'u1', provider: 'github' },
            { documentId: 'u2', provider: null },
          ],
        }),
      },
    } as unknown as Core.Strapi;
    vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });

    const extras = await loadUserExtras(strapi, {}, [{ documentId: 'u1' }, { documentId: 'u2' }]);

    expect(extras.get('u1')?.provider).toBe('github');
    expect(extras.get('u2')?.provider).toBe('local');
  });

  it('makes one profile query and one accounts query for many users', async () => {
    const { strapi, documents, findMany } = setup();

    const extras = await loadUserExtras(strapi, { strategy: {} }, [
      { documentId: 'u1' },
      { documentId: 'u2' },
    ]);

    expect(documents.mock.calls.map(([uid]) => uid).sort()).toEqual([ACCOUNT_UID, PROFILE_UID]);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { userId: { $in: ['u1', 'u2'] } } })
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { user: { documentId: { $in: ['u1', 'u2'] } } } })
    );
    expect(extras.get('u1')?.provider).toBe('local');
    expect(extras.get('u2')?.provider).toBe('google');
  });

  it('makes no query for no users', async () => {
    const { strapi, documents } = setup();

    expect((await loadUserExtras(strapi, {}, [])).size).toBe(0);
    expect(documents).not.toHaveBeenCalled();
  });

  it('drops a profile field the caller cannot read and any key that collides with a user key', async () => {
    const { strapi, output } = setup();
    const auth = { strategy: { name: 'end-users' } };

    const extras = await loadUserExtras(strapi, auth, [
      { documentId: 'u1', email: 'user@example.com' } as { documentId: string },
    ]);

    expect(output).toHaveBeenCalledWith(
      { id: 1, documentId: 'p1', bio: 'one', hidden: 'h', user: { documentId: 'u1' } },
      profileSchema,
      expect.objectContaining({ auth })
    );
    expect(extras.get('u1')?.profile).toEqual({ bio: 'one' });
  });
});

describe('splitUserWrites', () => {
  it('gives a key the user and the profile both have to the user', () => {
    const { strapi } = setup();

    // `email` is an attribute of both: on a read the user's value wins, so a write goes there too
    expect(splitUserWrites(strapi, { email: 'a@b.io', bio: 'b' })).toMatchObject({
      user: { email: 'a@b.io' },
      profile: { bio: 'b' },
    });
  });

  it('routes profile keys to the profile and lists the refused ones', () => {
    const { strapi } = setup();

    expect(
      splitUserWrites(strapi, {
        bio: 'b',
        username: 'u',
        role: 1,
        confirmed: true,
        blocked: false,
        provider: 'x',
        secretNote: 'n',
        avatar: 1,
      })
    ).toEqual({
      user: { username: 'u', secretNote: 'n', avatar: 1 },
      profile: { bio: 'b' },
      refused: ['role', 'confirmed', 'blocked', 'provider'],
    });
  });
});
