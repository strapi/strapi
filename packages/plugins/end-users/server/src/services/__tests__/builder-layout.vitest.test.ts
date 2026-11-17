import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PROFILE_UID, ROLE_UID, USER_UID } from '../../constants';
import { layoutContentTypeUids } from '../../utils/layout-content-types';
import builderLayoutService, { builderLayout } from '../builder-layout';

vi.mock('../../utils/layout-content-types', () => ({ layoutContentTypeUids: vi.fn() }));

const ARTICLE = 'api::article.article';
const HOMEPAGE = 'api::homepage.homepage';
const LOCKED = 'api::locked.locked';

const relation = (target: string, kind: string, extra: Record<string, unknown> = {}) => ({
  type: 'relation',
  relation: kind,
  target,
  ...extra,
});

const SCHEMAS: Record<string, unknown> = {
  [ARTICLE]: {
    uid: ARTICLE,
    kind: 'collectionType',
    info: { displayName: 'Article' },
    attributes: {
      title: { type: 'string' },
      status: { type: 'enumeration', enum: ['draft', 'live'] },
      secret: { type: 'text', private: true },
      password: { type: 'password' },
      cover: { type: 'media', multiple: false },
      seo: { type: 'component', component: 'shared.seo' },
      zone: { type: 'dynamiczone', components: [] },
      anything: { type: 'relation', relation: 'morphToMany' },
      author: relation(USER_UID, 'oneToOne'),
      editors: relation(USER_UID, 'manyToMany'),
      comments: relation(HOMEPAGE, 'oneToMany'),
      home: relation(HOMEPAGE, 'manyToOne'),
      outside: relation(LOCKED, 'oneToOne'),
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
      publishedAt: { type: 'datetime' },
    },
  },
  [HOMEPAGE]: {
    uid: HOMEPAGE,
    kind: 'singleType',
    attributes: { headline: { type: 'string' } },
  },
  [USER_UID]: {
    uid: USER_UID,
    kind: 'collectionType',
    info: { displayName: 'User' },
    attributes: {
      email: { type: 'email' },
      name: { type: 'string' },
      emailVerified: { type: 'boolean' },
      password: { type: 'password', private: true },
      banReason: { type: 'string', private: true },
      roles: relation(ROLE_UID, 'manyToMany'),
    },
  },
  [PROFILE_UID]: {
    uid: PROFILE_UID,
    kind: 'collectionType',
    info: { displayName: 'Profile' },
    attributes: {
      user: relation(USER_UID, 'oneToOne'),
      nickname: { type: 'string' },
      plan: { type: 'enumeration', enum: ['free', 'pro'] },
      notes: { type: 'text', private: true },
    },
  },
};

const setup = () => {
  const findMany = vi.fn().mockResolvedValue([{ name: 'Editor' }, { name: 'Reader' }]);
  const strapi = {
    contentType: vi.fn((uid: string) => SCHEMAS[uid]),
    db: { query: vi.fn(() => ({ findMany })) },
  } as unknown as Core.Strapi;

  return { strapi, findMany };
};

describe('builderLayout', () => {
  beforeEach(() => {
    // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
    vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });
    vi.mocked(layoutContentTypeUids).mockReturnValue([ARTICLE, HOMEPAGE, PROFILE_UID, USER_UID]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(layoutContentTypeUids).mockReset();
  });

  it('lists Article and Profile, with the timestamps as datetimes', async () => {
    const { strapi } = setup();
    const layout = await builderLayout(strapi);
    const uids = layout.contentTypes.map(({ uid }) => uid);

    expect(uids).toEqual([ARTICLE, HOMEPAGE, PROFILE_UID, USER_UID]);

    const article = layout.contentTypes[0];

    expect(article).toMatchObject({
      uid: ARTICLE,
      displayName: 'Article',
      kind: 'collectionType',
    });
    expect(article.attributes).toEqual(
      expect.arrayContaining([
        { name: 'createdAt', type: 'datetime' },
        { name: 'updatedAt', type: 'datetime' },
        { name: 'publishedAt', type: 'datetime' },
      ])
    );
    expect(layout.contentTypes[1]).toMatchObject({ displayName: HOMEPAGE, kind: 'singleType' });
  });

  it('leaves out private, password, media, component, dynamic zone and morph attributes, and a relation to a type a role cannot be granted on', async () => {
    const layout = await builderLayout(setup().strapi);
    const names = layout.contentTypes[0].attributes.map(({ name }) => name);

    expect(names).toEqual([
      'title',
      'status',
      'author',
      'editors',
      'comments',
      'home',
      'createdAt',
      'updatedAt',
      'publishedAt',
    ]);
  });

  it('gives the values of an enumeration', async () => {
    const layout = await builderLayout(setup().strapi);

    expect(layout.contentTypes[0].attributes).toContainEqual({
      name: 'status',
      type: 'enumeration',
      enum: ['draft', 'live'],
    });
  });

  it('says whether a relation holds several entries', async () => {
    const layout = await builderLayout(setup().strapi);
    const toMany = (name: string) =>
      layout.contentTypes[0].attributes.find((attribute) => attribute.name === name)?.relation;

    expect(toMany('author')).toEqual({ target: USER_UID, toMany: false });
    expect(toMany('home')).toEqual({ target: HOMEPAGE, toMany: false });
    expect(toMany('comments')).toEqual({ target: HOMEPAGE, toMany: true });
    expect(toMany('editors')).toEqual({ target: USER_UID, toMany: true });
  });

  it('lists the relations to the end user as userRelations', async () => {
    const layout = await builderLayout(setup().strapi);

    expect(layout.contentTypes[0].userRelations).toEqual(['author', 'editors']);
    expect(layout.contentTypes[1].userRelations).toEqual([]);
  });

  it('gives the public attributes of the end user and of the profile', async () => {
    const layout = await builderLayout(setup().strapi);

    expect(layout.userAttributes.map(({ name }) => name)).toEqual([
      'email',
      'name',
      'emailVerified',
    ]);
    expect(layout.profileAttributes).toEqual([
      { name: 'user', type: 'relation', relation: { target: USER_UID, toMany: false } },
      { name: 'nickname', type: 'string' },
      { name: 'plan', type: 'enumeration', enum: ['free', 'pro'] },
    ]);
  });

  it('gives the role names, in order', async () => {
    const { strapi, findMany } = setup();
    const layout = await builderLayout(strapi);

    expect(layout.roles).toEqual(['Editor', 'Reader']);
    expect(findMany).toHaveBeenCalledWith({ select: ['name'], orderBy: { name: 'asc' } });
  });

  it('is the plugin service builder-layout', async () => {
    const { strapi } = setup();
    const service = builderLayoutService({ strapi });

    await expect(service.builderLayout()).resolves.toMatchObject({ roles: ['Editor', 'Reader'] });
  });
});
