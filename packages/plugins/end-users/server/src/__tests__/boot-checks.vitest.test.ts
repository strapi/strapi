import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { assertLockedUser, assertOneWayRelations, assertProfileUser } from '../boot-checks';
import register from '../register';
import { PROFILE_UID, USER_UID } from '../constants';
import profile from '../content-types/profile';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();

  return { ...actual, existsSync: vi.fn(() => false) };
});

const APP_ROOT = '/srv/strapi-app';
const DIST_EXTENSIONS = join(APP_ROOT, 'dist', 'src', 'extensions');
const USER_EXTENSION = 'src/extensions/end-users/content-types/user/schema.json';

// Paths that "exist" for the current test. existsSync is mocked to consult this set.
const onDisk = new Set<string>();

const fakeStrapi = (contentTypes: Record<string, unknown> = {}) =>
  ({
    dirs: {
      app: { root: APP_ROOT },
      dist: { extensions: DIST_EXTENSIONS },
    },
    contentTypes,
  }) as unknown as Core.Strapi;

const strapiWithFile = (relativePath: string) => {
  onDisk.add(join(APP_ROOT, relativePath));

  return fakeStrapi();
};

beforeEach(() => {
  onDisk.clear();
  vi.mocked(existsSync).mockImplementation((path) => onDisk.has(String(path)));
});

describe('assertLockedUser', () => {
  it('refuses a user extension schema and names the file', () => {
    expect(() => assertLockedUser(strapiWithFile(USER_EXTENSION))).toThrow(
      /extensions\/end-users\/content-types\/user\/schema\.json/
    );
  });

  it('says what to do instead', () => {
    expect(() => assertLockedUser(strapiWithFile(USER_EXTENSION))).toThrow(
      'The end-user type is locked; add custom fields to plugin::end-users.profile instead'
    );
  });

  it('refuses a compiled user extension in the dist extensions dir', () => {
    onDisk.add(join(DIST_EXTENSIONS, 'end-users', 'content-types', 'user', 'schema.json'));

    expect(() => assertLockedUser(fakeStrapi())).toThrow(
      /dist\/src\/extensions\/end-users\/content-types\/user\/schema\.json/
    );
  });

  it('accepts an app with no user extension', () => {
    expect(() => assertLockedUser(fakeStrapi())).not.toThrow();
  });

  it('ignores extensions to other plugins that happen to have a user type', () => {
    expect(() =>
      assertLockedUser(
        strapiWithFile('src/extensions/users-permissions/content-types/user/schema.json')
      )
    ).not.toThrow();
  });
});

describe('assertOneWayRelations', () => {
  it('refuses a two-sided relation to the user and names the uid and attribute', () => {
    const cts = {
      'api::article.article': {
        attributes: {
          author: {
            type: 'relation',
            relation: 'manyToOne',
            target: USER_UID,
            inversedBy: 'articles',
          },
        },
      },
    };

    expect(() => assertOneWayRelations(cts)).toThrow(/api::article\.article.*author/);
  });

  it('refuses a mappedBy relation to the user', () => {
    const cts = {
      'api::profile.profile': {
        attributes: {
          user: { type: 'relation', relation: 'oneToOne', target: USER_UID, mappedBy: 'profile' },
        },
      },
    };

    expect(() => assertOneWayRelations(cts)).toThrow(/api::profile\.profile.*user/);
  });

  it('says what to do instead', () => {
    const cts = {
      'api::article.article': {
        attributes: {
          author: {
            type: 'relation',
            relation: 'manyToOne',
            target: USER_UID,
            inversedBy: 'articles',
          },
        },
      },
    };

    expect(() => assertOneWayRelations(cts)).toThrow(
      'Relations to plugin::end-users.user must be one-way (oneWay or manyWay); remove inversedBy/mappedBy'
    );
  });

  it('accepts oneWay and manyWay relations to the user', () => {
    const cts = {
      'api::article.article': {
        attributes: {
          author: { type: 'relation', relation: 'oneToOne', target: USER_UID },
          editors: { type: 'relation', relation: 'manyToMany', target: USER_UID },
        },
      },
    };

    expect(() => assertOneWayRelations(cts)).not.toThrow();
  });

  it.each([
    ['inversedBy', { inversedBy: null }],
    ['mappedBy', { mappedBy: null }],
  ])(
    'refuses a relation to the user with a %s that is there but null, as the database layer reads it',
    (_name, extra) => {
      const cts = {
        'api::article.article': {
          attributes: {
            author: { type: 'relation', relation: 'manyToOne', target: USER_UID, ...extra },
          },
        },
      };

      expect(() => assertOneWayRelations(cts)).toThrow(
        'api::article.article attribute "author": Relations to plugin::end-users.user must be one-way'
      );
    }
  );

  it('ignores two-sided relations to other content types', () => {
    const cts = {
      'api::article.article': {
        attributes: {
          category: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::category.category',
            inversedBy: 'articles',
          },
        },
      },
    };

    expect(() => assertOneWayRelations(cts)).not.toThrow();
  });

  it('ignores scalar attributes', () => {
    const cts = {
      'api::article.article': {
        attributes: {
          title: { type: 'string', target: USER_UID, inversedBy: 'titles' },
        },
      },
    };

    expect(() => assertOneWayRelations(cts)).not.toThrow();
  });
});

type ContentTypes = Parameters<typeof assertProfileUser>[0];

const profileWith = (user?: Record<string, unknown>): ContentTypes => ({
  [PROFILE_UID]: { attributes: user === undefined ? {} : { user } },
});

const STOCK_USER = {
  type: 'relation',
  relation: 'oneToOne',
  target: USER_UID,
  required: true,
  configurable: false,
};

describe('assertProfileUser', () => {
  it('accepts the profile type as the plugin ships it', () => {
    expect(() =>
      assertProfileUser({ [PROFILE_UID]: profile.schema } as unknown as ContentTypes)
    ).not.toThrow();
  });

  it('accepts a profile type with the project fields next to `user`', () => {
    expect(() =>
      assertProfileUser({
        [PROFILE_UID]: {
          attributes: { user: STOCK_USER, company: { type: 'string' }, bio: { type: 'text' } },
        },
      })
    ).not.toThrow();
  });

  it('refuses a relation stored as oneWay: the Content-Type Builder name, not a kind the database knows', () => {
    expect(() => assertProfileUser(profileWith({ ...STOCK_USER, relation: 'oneWay' }))).toThrow(
      /attribute "user": not a one-way relation \(stored as oneWay, where the plugin ships oneToOne\)/
    );
  });

  it('refuses a profile type without the `user` attribute, and names the uid and attribute', () => {
    expect(() =>
      assertProfileUser({ [PROFILE_UID]: { attributes: { company: { type: 'string' } } } })
    ).toThrow(/plugin::end-users\.profile attribute "user": missing/);
  });

  it('refuses a profile type with no attributes at all', () => {
    expect(() => assertProfileUser({ [PROFILE_UID]: {} })).toThrow(/attribute "user": missing/);
  });

  it('refuses the profile type being absent', () => {
    expect(() => assertProfileUser({})).toThrow(/attribute "user": missing/);
  });

  it('refuses `user` turned into something that is not a relation', () => {
    expect(() => assertProfileUser(profileWith({ type: 'integer' }))).toThrow(
      /plugin::end-users\.profile attribute "user": not a one-way relation/
    );
  });

  it.each(['manyToOne', 'manyToMany', 'oneToMany', 'manyWay', 'morphToOne'])(
    'refuses a %s relation, which is not one user',
    (relation) => {
      expect(() => assertProfileUser(profileWith({ ...STOCK_USER, relation }))).toThrow(
        /attribute "user": not a one-way relation/
      );
    }
  );

  it('refuses a relation to another content type', () => {
    expect(() => assertProfileUser(profileWith({ ...STOCK_USER, target: 'admin::user' }))).toThrow(
      'plugin::end-users.profile attribute "user": targets admin::user, not plugin::end-users.user'
    );
  });

  it('refuses a relation with an inversedBy', () => {
    expect(() => assertProfileUser(profileWith({ ...STOCK_USER, inversedBy: 'profile' }))).toThrow(
      /attribute "user": has an inverse side/
    );
  });

  it.each([
    ['an inversedBy of null', { inversedBy: null }],
    ['a mappedBy of null', { mappedBy: null }],
    ['an inversedBy of undefined', { inversedBy: undefined }],
  ])(
    'refuses a relation with %s: it is there, which is what the database layer reads',
    (_name, extra) => {
      expect(() => assertProfileUser(profileWith({ ...STOCK_USER, ...extra }))).toThrow(
        /attribute "user": has an inverse side/
      );
    }
  );

  it('refuses a relation with a mappedBy', () => {
    expect(() => assertProfileUser(profileWith({ ...STOCK_USER, mappedBy: 'profile' }))).toThrow(
      /attribute "user": has an inverse side/
    );
  });

  it('says what to keep', () => {
    expect(() => assertProfileUser(profileWith())).toThrow(
      'the profile type keeps its "user" attribute as the plugin ships it: a one-way relation to plugin::end-users.user, with no inversedBy or mappedBy'
    );
  });

  it('looks only at the profile type', () => {
    expect(() =>
      assertProfileUser({
        ...profileWith(STOCK_USER),
        'api::article.article': { attributes: { user: { type: 'string' } } },
      })
    ).not.toThrow();
  });
});

describe('register', () => {
  it('runs the locked-user check at boot', () => {
    expect(() => register({ strapi: strapiWithFile(USER_EXTENSION) })).toThrow(
      /extensions\/end-users\/content-types\/user\/schema\.json/
    );
  });

  it('runs the relation check over every registered content type at boot', () => {
    const strapi = fakeStrapi({
      'api::article.article': {
        attributes: {
          author: {
            type: 'relation',
            relation: 'manyToOne',
            target: USER_UID,
            inversedBy: 'articles',
          },
        },
      },
    });

    expect(() => register({ strapi })).toThrow(/api::article\.article.*author/);
  });

  it('runs the profile check at boot, after the relation check', () => {
    expect(() => register({ strapi: fakeStrapi(profileWith()) })).toThrow(
      /plugin::end-users\.profile attribute "user": missing/
    );
    expect(() =>
      register({
        strapi: fakeStrapi({
          ...profileWith(),
          'api::article.article': {
            attributes: {
              author: { type: 'relation', target: USER_UID, inversedBy: 'articles' },
            },
          },
        }),
      })
    ).toThrow(/api::article\.article.*author/);
  });

  it('boots when the user type is untouched and every relation is one-way', async () => {
    // what the rest of register needs besides the checks: an engine, the registries (content types
    // are added to one, the strategy is registered with `auth`), the db naming
    const engine = { schema: () => [] };
    const base = fakeStrapi({
      ...profileWith(STOCK_USER),
      'api::article.article': {
        attributes: {
          author: { type: 'relation', relation: 'oneToOne', target: USER_UID },
        },
      },
    }) as unknown as { dirs?: Record<string, unknown> };
    const strapi = {
      ...base,
      // The plugin's own services; GraphQL is optional and not installed here
      plugin: (name: string) =>
        name === 'graphql'
          ? undefined
          : { service: () => ({ get: () => engine, register: vi.fn() }) },
      documents: { use: vi.fn() },
      get: () => ({ add: vi.fn(), register: vi.fn() }),
      db: { metadata: {} },
      // Explain mode's middleware and query param, and the engine-owned fields validator
      server: { use: vi.fn() },
      contentAPI: {
        addQueryParams: vi.fn(),
        permissions: { providers: { condition: { register: vi.fn(async () => {}) } } },
      },
      validators: { add: vi.fn() },
      // No project conditions to load
      dirs: {
        ...base.dirs,
        dist: {
          ...(base.dirs?.dist as Record<string, unknown>),
          src: '/nonexistent-end-users-boot-checks',
        },
      },
    } as unknown as Core.Strapi;

    // The checks throw at once; the conditions are the promise register returns
    let registered: Promise<void> | undefined;

    expect(() => {
      registered = register({ strapi });
    }).not.toThrow();
    await expect(registered).resolves.toBeUndefined();
  });
});
