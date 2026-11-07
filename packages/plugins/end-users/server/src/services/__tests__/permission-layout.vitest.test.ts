import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core, Modules } from '@strapi/types';

import type { BuilderConditionV2 } from '../../../../shared/builder/types';
import type { LayoutContentType, LayoutField } from '../../../../shared/contracts/permissions';
import { isOwner, isSelf } from '../../conditions';
import { PERMISSION_UID, PROFILE_UID, ROLE_UID, USER_UID } from '../../constants';
import { builderRecordsOf } from '../../utils/builder/registry';
import { layoutContentTypeUids } from '../../utils/layout-content-types';
import permissionLayoutService from '../permission-layout';
import permissionService from '../permission';
import { appliesTo } from './utils/applies-to';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;

/** Draft & publish, a component, a relation to the user, a private attribute */
const ARTICLE = 'api::article.article';
/** A single type without draft & publish */
const HOMEPAGE = 'api::homepage.homepage';
/** One of the engine's tables: never in the layout */
const SESSION = 'plugin::end-users.session';
const SEO = 'shared.seo';
const OG = 'shared.og';
const LOOP = 'shared.loop';

const relation = (target: string, extra: Record<string, unknown> = {}) => ({
  type: 'relation',
  relation: 'oneToOne',
  target,
  ...extra,
});

interface Schema {
  uid: string;
  kind?: string;
  info?: { displayName: string };
  attributes: Record<string, Record<string, unknown>>;
}

/** What `strapi.contentType(uid)` gives */
const CONTENT_TYPES: Record<string, Schema> = {
  [ARTICLE]: {
    uid: ARTICLE,
    kind: 'collectionType',
    info: { displayName: 'Article' },
    attributes: {
      title: { type: 'string', required: true },
      body: { type: 'text' },
      secret: { type: 'text', private: true },
      // What Strapi's own schema marks private on every content type
      createdBy: relation('admin::user', { private: true }),
      updatedBy: relation('admin::user', { private: true }),
      locale: { type: 'string', private: true },
      localizations: relation(ARTICLE, { relation: 'oneToMany', private: true }),
      seo: { type: 'component', repeatable: false, component: SEO },
      loop: { type: 'component', repeatable: false, component: LOOP },
      blocks: { type: 'dynamiczone', components: [SEO] },
      cover: { type: 'media', multiple: false },
      owner: relation(USER_UID),
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
      publishedAt: { type: 'datetime' },
    },
  },
  [HOMEPAGE]: {
    uid: HOMEPAGE,
    kind: 'singleType',
    info: { displayName: 'Homepage' },
    // `locale` is a non-private attribute of a localized type
    attributes: { title: { type: 'string' }, locale: { type: 'string' } },
  },
  [USER_UID]: {
    uid: USER_UID,
    kind: 'collectionType',
    info: { displayName: 'User' },
    attributes: {
      email: { type: 'email' },
      emailVerified: { type: 'boolean' },
      twoFactorEnabled: { type: 'boolean' },
      banned: { type: 'boolean', private: true },
      failedSignIns: { type: 'integer', private: true },
      lockedUntil: { type: 'datetime', private: true },
      role: { type: 'string', private: true },
      createdBy: relation('admin::user', { private: true }),
      updatedBy: relation('admin::user', { private: true }),
      roles: relation(ROLE_UID, { relation: 'manyToMany' }),
    },
  },
  [SESSION]: {
    uid: SESSION,
    kind: 'collectionType',
    info: { displayName: 'Session' },
    attributes: { userId: { type: 'string' } },
  },
  [PROFILE_UID]: {
    uid: PROFILE_UID,
    kind: 'collectionType',
    info: { displayName: 'Profile' },
    attributes: { user: relation(USER_UID) },
  },
  // No Content API route at all
  [PERMISSION_UID]: {
    uid: PERMISSION_UID,
    kind: 'collectionType',
    info: { displayName: 'Permission' },
    attributes: { action: { type: 'string' } },
  },
};

/** What `strapi.getModel(uid)` gives for a component */
const COMPONENTS: Record<string, Schema> = {
  [SEO]: {
    uid: SEO,
    attributes: {
      metaTitle: { type: 'string', required: true },
      og: { type: 'component', repeatable: false, component: OG },
      hidden: { type: 'string', private: true },
    },
  },
  // A component's own `updatedAt` is a field like any other: only a content type's system attributes are not
  [OG]: { uid: OG, attributes: { title: { type: 'string' }, updatedAt: { type: 'datetime' } } },
  // A component that holds itself: its second level is a leaf, not an endless tree
  [LOOP]: { uid: LOOP, attributes: { again: { type: 'component', component: LOOP } } },
};

/** Route actions: what `providers.action` holds */
const ACTIONS = [
  `${ARTICLE}.find`,
  `${ARTICLE}.findOne`,
  `${ARTICLE}.create`,
  `${ARTICLE}.update`,
  `${ARTICLE}.delete`,
  // A project's own route for the one `publish` every type with draft & publish has
  `${ARTICLE}.publish`,
  // Not a data action: a route of its own
  `${ARTICLE}.stats`,
  `${HOMEPAGE}.find`,
  `${HOMEPAGE}.update`,
  `${HOMEPAGE}.delete`,
  `${USER_UID}.find`,
  `${USER_UID}.findOne`,
  `${USER_UID}.update`,
  `${SESSION}.find`,
  'plugin::end-users.me.find',
  'plugin::end-users.me.updateProfile',
  'plugin::end-users.permissions.forCaller',
  'plugin::end-users.auth.handle',
  'api::health.health.index',
];

/** `read-drafts` and `publish` of a type with draft & publish, and a single type's `create` */
const SYNTHETIC_ACTIONS = [`${ARTICLE}.read-drafts`, `${ARTICLE}.publish`, `${HOMEPAGE}.create`];

const route = (
  method: string,
  path: string,
  scope: string,
  config: Record<string, unknown> = {}
) => ({ method, path, handler: 'x.y', config: { auth: { scope: [scope] }, ...config } });

function audit() {}

/** What `strapi.contentAPI.getRoutesMap()` gives: the routes by the API or plugin that has them */
const routesMap = () => ({
  'api::article': [
    route('GET', '/api/articles', `${ARTICLE}.find`),
    route('GET', '/api/articles/:id', `${ARTICLE}.findOne`),
    route('POST', '/api/articles', `${ARTICLE}.create`),
    route('PUT', '/api/articles/:id', `${ARTICLE}.update`, { policies: ['global::x'] }),
    route('DELETE', '/api/articles/:id', `${ARTICLE}.delete`),
    route('POST', '/api/articles/:id/publish', `${ARTICLE}.publish`, {
      middlewares: ['global::audit-publish'],
    }),
    route('GET', '/api/articles/stats', `${ARTICLE}.stats`),
  ],
  'api::homepage': [
    route('GET', '/api/homepage', `${HOMEPAGE}.find`),
    route('PUT', '/api/homepage', `${HOMEPAGE}.update`),
    route('DELETE', '/api/homepage', `${HOMEPAGE}.delete`),
  ],
  'api::health': [
    route('GET', '/api/health', 'api::health.health.index', {
      policies: [{ name: 'global::rate-limit', config: { max: 5 } }],
      middlewares: [{ name: 'global::cache', config: { ttl: 60 } }, audit, () => {}],
    }),
  ],
  'plugin::end-users': [
    route('GET', '/api/users/me', 'plugin::end-users.me.find', { prefix: '' }),
    route('PUT', '/api/users/me/profile', 'plugin::end-users.me.updateProfile', {
      middlewares: ['plugin::end-users.endpoint-allowlist'],
    }),
    route('GET', '/api/end-users/permissions/me', 'plugin::end-users.permissions.forCaller'),
    { method: 'GET', path: '/api/auth/:path*', handler: 'auth.handle', config: { auth: false } },
    route('GET', '/api/users', `${USER_UID}.find`),
    route('GET', '/api/users/:id', `${USER_UID}.findOne`),
    route('PUT', '/api/users/:id', `${USER_UID}.update`),
    route('GET', '/api/sessions', `${SESSION}.find`),
  ],
});

/** A project condition on any type, naming one of its attributes: no `source`, so a plugin's */
const flagged = {
  name: 'api::flagged',
  displayName: 'Flagged',
  params: {
    field: { type: 'attribute', required: true },
    value: { type: 'boolean', default: true },
  },
  query: () => true,
} satisfies ContentApiConditionDefinition;

const CONDITIONS: ContentApiConditionDefinition[] = [isSelf, isOwner, flagged];

const setup = ({
  getRoutesMap = vi.fn(async () => routesMap()),
}: { getRoutesMap?: ReturnType<typeof vi.fn> } = {}) => {
  const subjectOf = (action: string) => {
    const end = action.lastIndexOf('.');
    const uid = end > 0 ? action.slice(0, end) : null;

    return uid !== null && CONTENT_TYPES[uid]?.uid === uid ? uid : null;
  };

  const list = vi.fn(() => CONDITIONS);
  const service = vi.fn((name: string) => {
    if (name !== 'condition') throw new Error(`unexpected service ${name}`);

    return { list };
  });

  const strapi = {
    contentTypes: CONTENT_TYPES,
    contentType: (uid: string) => CONTENT_TYPES[uid],
    getModel: (uid: string) => CONTENT_TYPES[uid] ?? COMPONENTS[uid],
    plugin: vi.fn(() => ({ service })),
    contentAPI: {
      getRoutesMap,
      permissions: {
        subjectOf,
        conditions: { appliesTo },
        providers: {
          action: { keys: () => ACTIONS, has: (key: string) => ACTIONS.includes(key) },
          syntheticAction: {
            keys: () => SYNTHETIC_ACTIONS,
            has: (key: string) => SYNTHETIC_ACTIONS.includes(key),
          },
        },
      },
    },
  } as unknown as Core.Strapi;

  // `relationsTo` (what `is-owner` and the role checks share) reads the global
  vi.stubGlobal('strapi', strapi);

  return { strapi, getRoutesMap, layout: permissionLayoutService({ strapi }) };
};

const namesOf = (fields: LayoutField[]) => fields.map(({ name }) => name);

describe('permission layout service', () => {
  let layout: ReturnType<typeof setup>['layout'];
  let strapi: Core.Strapi;

  const contentType = async (uid: string): Promise<LayoutContentType> => {
    const found = (await layout.getLayout()).contentTypes.find((each) => each.uid === uid);

    expect(found, uid).toBeDefined();

    return found as LayoutContentType;
  };

  const action = async (uid: string, name: string) =>
    (await contentType(uid)).actions.find((each) => each.action === name);

  beforeEach(() => {
    ({ layout, strapi } = setup());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('the content types', () => {
    it('lists those with a registered data action, and leaves out the engine`s types', async () => {
      const uids = (await layout.getLayout()).contentTypes.map((each) => each.uid);

      // `profile` has no action registered here, `session` is the engine's, `permission` has no route
      expect(uids).toEqual([ARTICLE, HOMEPAGE, USER_UID]);
      expect(layoutContentTypeUids(strapi)).toEqual(uids);
    });

    it('lists the registered actions in column order', async () => {
      expect((await contentType(ARTICLE)).actions.map((each) => each.action)).toEqual([
        'find',
        'findOne',
        'create',
        'update',
        'delete',
        'read-drafts',
        'publish',
      ]);
      // A single type is created by its `update` route, so its `create` is a synthetic action
      expect((await contentType(HOMEPAGE)).actions.map((each) => each.action)).toEqual([
        'find',
        'create',
        'update',
        'delete',
      ]);
      expect((await action(ARTICLE, 'find'))?.actionId).toBe('api::article.article.find');
      expect((await action(HOMEPAGE, 'create'))?.actionId).toBe('api::homepage.homepage.create');
    });

    it('gives each its label and kind', async () => {
      expect(await contentType(ARTICLE)).toMatchObject({
        label: 'Article',
        kind: 'collectionType',
      });
      expect(await contentType(HOMEPAGE)).toMatchObject({ label: 'Homepage', kind: 'singleType' });
    });

    it('has one Publish column when a project has its own publish route', async () => {
      const { actions } = await contentType(ARTICLE);

      expect(actions.filter((each) => each.action === 'publish')).toHaveLength(1);
      expect((await action(ARTICLE, 'publish'))?.hasRules).toBe(true);
    });
  });

  describe('the fields', () => {
    it('types and nests them, and leaves a project type`s private attributes out altogether', async () => {
      const { fields, locked } = await contentType(ARTICLE);

      // The schema's order, without the private `secret`
      expect(namesOf(fields)).toEqual(['title', 'body', 'seo', 'loop', 'blocks', 'cover', 'owner']);
      // Locked rows are the end-user type's secrets only: `secret` is neither a field nor a locked row
      expect(locked).toEqual([]);

      const field = (name: string) => fields.find((each) => each.name === name) as LayoutField;

      expect(field('title')).toEqual({
        name: 'title',
        label: 'title',
        type: 'string',
        required: true,
        engineOwned: false,
      });
      expect(field('body')).toMatchObject({ type: 'text', required: false });
      expect(field('owner')).toMatchObject({ type: 'relation', relationTarget: USER_UID });
      expect(field('cover').type).toBe('media');
      // A relation, media and a dynamic zone are leaves
      expect(field('owner').children).toBeUndefined();
      expect(field('cover').children).toBeUndefined();
      expect(field('blocks').children).toBeUndefined();
    });

    it('nests a component`s attributes under dotted names, as deep as components go', async () => {
      const { fields } = await contentType(ARTICLE);
      const seo = fields.find(({ name }) => name === 'seo') as LayoutField;

      expect(seo.type).toBe('component');
      // The component's private attribute is not a field
      expect(namesOf(seo.children as LayoutField[])).toEqual(['seo.metaTitle', 'seo.og']);
      expect((seo.children as LayoutField[])[0]).toMatchObject({
        label: 'metaTitle',
        type: 'string',
        required: true,
      });

      const og = (seo.children as LayoutField[])[1];

      expect(namesOf(og.children as LayoutField[])).toEqual(['seo.og.title', 'seo.og.updatedAt']);
    });

    it('stops at a component that holds itself', async () => {
      const { fields } = await contentType(ARTICLE);
      const loop = fields.find(({ name }) => name === 'loop') as LayoutField;
      const [again] = loop.children as LayoutField[];

      expect(again.name).toBe('loop.again');
      expect(again.children).toBeUndefined();
    });

    it('leaves out what every caller reads whatever a role grants: createdAt, updatedAt, publishedAt and locale, never writable through a field list', async () => {
      // `ALWAYS_READABLE` in `@strapi/utils`' field rules: read whatever the rows list, so no field to grant
      for (const uid of [ARTICLE, HOMEPAGE, USER_UID]) {
        const names = namesOf((await contentType(uid)).fields);

        for (const system of ['createdAt', 'updatedAt', 'publishedAt', 'locale']) {
          expect(names, `${uid} ${system}`).not.toContain(system);
        }
      }

      // They are in the schema, so a condition may still filter on them
      const flagged = (await contentType(ARTICLE)).conditions.find(
        ({ name }) => name === 'api::flagged'
      );

      expect(flagged?.params[0].options).toEqual(
        expect.arrayContaining(['createdAt', 'updatedAt', 'publishedAt'])
      );
    });

    it('marks the user`s engine-owned fields, and locks what is never shown', async () => {
      const { fields, locked } = await contentType(USER_UID);
      const engineOwned = fields.filter((each) => each.engineOwned).map(({ name }) => name);

      expect(engineOwned).toEqual(['emailVerified', 'twoFactorEnabled']);
      // `banned` and `role` are private (`createdBy` and `updatedBy` too, as on every type, but they
      // are not locked rows); the user's secrets live in other tables. This is the only type with locked rows
      expect(locked).toEqual([
        'banned',
        'failedSignIns',
        'lockedUntil',
        'role',
        'Passwords, sessions and linked accounts',
      ]);

      // Another type's field of the same name is not the plugin's
      expect((await contentType(ARTICLE)).fields.some((each) => each.engineOwned)).toBe(false);
      expect((await contentType(HOMEPAGE)).locked).toEqual([]);
    });

    it('marks the fields no request writes: the user`s roles, and localizations and the creators when a type shows them', async () => {
      const user = (await contentType(USER_UID)).fields;

      expect(user.find(({ name }) => name === 'roles')).toMatchObject({ writable: false });
      expect(user.find(({ name }) => name === 'email')).not.toHaveProperty('writable');

      const { attributes } = CONTENT_TYPES[ARTICLE];
      const before = { ...attributes };

      try {
        // A type that populates its creators and keeps its localizations in the Content API
        attributes.createdBy = relation('admin::user');
        attributes.updatedBy = relation('admin::user', { writable: false });
        attributes.localizations = relation(ARTICLE, { relation: 'oneToMany' });

        const { fields } = (await setup().layout.getLayout()).contentTypes.find(
          ({ uid }) => uid === ARTICLE
        ) as LayoutContentType;

        ['createdBy', 'updatedBy', 'localizations'].forEach((name) => {
          expect(fields.find((each) => each.name === name)).toMatchObject({ writable: false });
        });
        expect(fields.find(({ name }) => name === 'title')).not.toHaveProperty('writable');
      } finally {
        CONTENT_TYPES[ARTICLE].attributes = before;
      }
    });

    it('lists only fields the row checks accept', async () => {
      const permission = permissionService({ strapi });

      const flatten = (fields: LayoutField[]): string[] =>
        fields.flatMap((field) => [field.name, ...flatten(field.children ?? [])]);

      const rows = (await layout.getLayout()).contentTypes.map((each) => ({
        action: `${each.uid}.find`,
        subject: null,
        properties: { fields: flatten(each.fields) },
        conditions: [],
      }));

      expect(rows.length).toBeGreaterThan(0);
      expect(() => permission.checkRows(rows)).not.toThrow();
    });
  });

  describe('the conditions', () => {
    it('lists those that apply to the type, with the params they declare', async () => {
      expect((await contentType(ARTICLE)).conditions.map(({ name }) => name)).toEqual([
        'plugin::end-users.is-owner',
        'api::flagged',
      ]);
      expect((await contentType(USER_UID)).conditions.map(({ name }) => name)).toEqual([
        'plugin::end-users.is-self',
        'api::flagged',
      ]);
      // No relation to the user: not `is-owner`
      expect((await contentType(HOMEPAGE)).conditions.map(({ name }) => name)).toEqual([
        'api::flagged',
      ]);
    });

    it('gives is-owner its relations to the user as the options of its field', async () => {
      const [owner] = (await contentType(ARTICLE)).conditions;

      expect(owner).toEqual({
        name: 'plugin::end-users.is-owner',
        displayName: 'Is owner',
        source: 'builtin',
        params: [
          { name: 'field', type: 'attribute', required: false, options: ['owner'] },
          // It only matters when an entry is created: the modal shows it on the Create row only
          {
            name: 'setOnCreate',
            type: 'boolean',
            required: false,
            default: true,
            createOnly: true,
          },
        ],
      });
    });

    it('marks the params of a builder condition: create-only when only a stamp reads them, and the kind a field input takes', async () => {
      const definition: ContentApiConditionDefinition = {
        name: 'api::builder',
        displayName: 'Builder',
        source: 'builder',
        params: {
          pick: { type: 'attribute' },
          stamped: { type: 'string', default: 'y' },
          read: { type: 'string', default: 'z' },
        },
        query: () => true,
      };
      const condition: BuilderConditionV2 = {
        version: 2,
        slug: 'builder',
        displayName: 'Builder',
        appliesTo: { kind: 'all' },
        inputs: [
          { name: 'pick', kind: 'field', accepts: 'text', required: false },
          { name: 'stamped', kind: 'text', required: false, default: 'y' },
          { name: 'read', kind: 'text', required: false, default: 'z' },
        ],
        who: { match: 'all', checks: [] },
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'check',
              target: { input: 'pick' },
              operator: '$eq',
              value: { kind: 'input', name: 'read' },
            },
          ],
        },
        onSave: {
          stamp: [
            { field: 'title', value: { kind: 'input', name: 'stamped' } },
            { field: 'body', value: { kind: 'input', name: 'read' } },
          ],
          locked: [],
        },
      };

      CONDITIONS.push(definition);

      try {
        builderRecordsOf(strapi).set('api::builder', { condition, stale: [] });

        const found = (await contentType(ARTICLE)).conditions.find(
          ({ name }) => name === 'api::builder'
        );

        expect(found?.params).toEqual([
          // Only the fields of that kind are offered, which is what a save accepts
          {
            name: 'pick',
            type: 'attribute',
            required: false,
            accepts: 'text',
            options: ['title', 'body'],
          },
          { name: 'stamped', type: 'string', required: false, default: 'y', createOnly: true },
          { name: 'read', type: 'string', required: false, default: 'z' },
        ]);
      } finally {
        CONDITIONS.pop();
      }
    });

    it('requires the field of is-owner when the type has no single relation to the user, as the save check does', async () => {
      const { attributes } = CONTENT_TYPES[ARTICLE] as { attributes: Record<string, unknown> };
      const fieldOf = async () =>
        (await contentType(ARTICLE)).conditions
          .find(({ name }) => name === 'plugin::end-users.is-owner')
          ?.params.find(({ name }) => name === 'field');

      try {
        attributes.reviewer = relation(USER_UID);
        // (the one-relation case, `required: false`, is the test above)
        expect(await fieldOf()).toMatchObject({ required: true, options: ['owner', 'reviewer'] });
      } finally {
        delete attributes.reviewer;
      }
    });

    it('gives an attribute param with no target every non-private attribute, and a condition with no source is a plugin`s', async () => {
      const { conditions } = await contentType(ARTICLE);
      const found = conditions.find(({ name }) => name === 'api::flagged');

      expect(found).toMatchObject({ displayName: 'Flagged', source: 'plugin' });
      expect(found?.params).toEqual([
        {
          name: 'field',
          type: 'attribute',
          required: true,
          // Not `secret`
          options: [
            'title',
            'body',
            'seo',
            'loop',
            'blocks',
            'cover',
            'owner',
            'createdAt',
            'updatedAt',
            'publishedAt',
          ],
        },
        { name: 'value', type: 'boolean', required: false, default: true },
      ]);
    });
  });

  describe('the routes', () => {
    it('groups the route-only actions by plugin or API and controller, readably', async () => {
      const { groups } = await layout.getLayout();

      // The API's or plugin's key, in the order the registry gives them
      expect(groups.map(({ id, kind }) => [id, kind])).toEqual([
        ['api::article', 'custom'],
        ['api::health', 'custom'],
        ['plugin::end-users', 'plugin'],
      ]);

      expect(groups[0]).toEqual({
        id: 'api::article',
        kind: 'custom',
        label: 'Article',
        categories: [
          {
            label: 'Article',
            routes: [
              {
                actionId: 'api::article.article.stats',
                label: 'Stats',
                route: 'GET /api/articles/stats',
                hasRules: false,
              },
            ],
          },
        ],
      });
      expect(groups[1]).toMatchObject({
        label: 'Health',
        categories: [
          {
            label: 'Health',
            routes: [
              { actionId: 'api::health.health.index', label: 'Index', route: 'GET /api/health' },
            ],
          },
        ],
      });
      expect(groups[2]).toMatchObject({
        label: 'End users',
        categories: [
          {
            label: 'Me',
            routes: [
              { actionId: 'plugin::end-users.me.find', label: 'Find', route: 'GET /api/users/me' },
              {
                actionId: 'plugin::end-users.me.updateProfile',
                label: 'Update profile',
                route: 'PUT /api/users/me/profile',
              },
            ],
          },
        ],
      });
    });

    it('leaves out forCaller, auth:false routes, the engine`s types and the data actions of a type in the layout', async () => {
      const { groups } = await layout.getLayout();
      const actionIds = groups.flatMap(({ categories }) =>
        categories.flatMap(({ routes }) => routes.map(({ actionId }) => actionId))
      );

      expect(actionIds.sort()).toEqual([
        'api::article.article.stats',
        'api::health.health.index',
        'plugin::end-users.me.find',
        'plugin::end-users.me.updateProfile',
      ]);
    });

    it('merges the routes of one action into one row', async () => {
      ({ layout } = setup({
        getRoutesMap: vi.fn(async () => ({
          'api::health': [
            route('GET', '/api/health', 'api::health.health.index'),
            route('POST', '/api/health', 'api::health.health.index', { policies: ['global::x'] }),
          ],
        })),
      }));

      const { groups } = await layout.getLayout();

      expect(groups[0].categories[0].routes).toEqual([
        {
          actionId: 'api::health.health.index',
          label: 'Index',
          route: 'GET /api/health, POST /api/health',
          hasRules: true,
        },
      ]);
    });

    it('flags the actions whose route has a policy or a middleware', async () => {
      expect((await action(ARTICLE, 'update'))?.hasRules).toBe(true);
      expect((await action(ARTICLE, 'find'))?.hasRules).toBe(false);
      // A synthetic action has no route
      expect((await action(ARTICLE, 'read-drafts'))?.hasRules).toBe(false);
      expect((await action(HOMEPAGE, 'create'))?.hasRules).toBe(false);

      const { groups } = await layout.getLayout();
      const rows = groups.flatMap(({ categories }) => categories.flatMap(({ routes }) => routes));
      const hasRules = (actionId: string) =>
        rows.find((row) => row.actionId === actionId)?.hasRules;

      expect(hasRules('api::health.health.index')).toBe(true);
      expect(hasRules('plugin::end-users.me.updateProfile')).toBe(true);
      expect(hasRules('plugin::end-users.me.find')).toBe(false);
    });

    it('gives the routes bound to a content type with their rules', async () => {
      const routes = await layout.getRoutesFor(ARTICLE);

      expect(routes.map(({ actionId }) => actionId)).toEqual([
        'api::article.article.find',
        'api::article.article.findOne',
        'api::article.article.create',
        'api::article.article.update',
        'api::article.article.delete',
        'api::article.article.publish',
      ]);
      expect(routes).toContainEqual({
        actionId: 'api::article.article.update',
        method: 'PUT',
        path: '/api/articles/:id',
        rules: [{ kind: 'policy', name: 'global::x', label: 'X', config: {} }],
      });
      expect(routes).toContainEqual({
        actionId: 'api::article.article.find',
        method: 'GET',
        path: '/api/articles',
        rules: [],
      });
    });

    it('gives the routes of a route group, policies before middlewares, each by its readable name', async () => {
      const routes = await layout.getRoutesFor('api::health');

      expect(routes).toEqual([
        {
          actionId: 'api::health.health.index',
          method: 'GET',
          path: '/api/health',
          rules: [
            { kind: 'policy', name: 'global::rate-limit', label: 'Rate limit', config: { max: 5 } },
            { kind: 'middleware', name: 'global::cache', label: 'Cache', config: { ttl: 60 } },
            { kind: 'middleware', name: 'audit', label: 'Audit', config: {} },
            { kind: 'middleware', name: 'anonymous', label: 'Anonymous', config: {} },
          ],
        },
      ]);

      expect((await layout.getRoutesFor('plugin::end-users')).map(({ path }) => path)).toEqual([
        '/api/users/me',
        '/api/users/me/profile',
      ]);
      expect((await layout.getRoutesFor('plugin::end-users'))[1].rules).toEqual([
        {
          kind: 'middleware',
          name: 'plugin::end-users.endpoint-allowlist',
          label: 'Endpoint allowlist',
          config: {},
        },
      ]);
    });

    it('answers a content type with no routes of its actions with none, and anything else with a not found', async () => {
      await expect(layout.getRoutesFor(USER_UID)).resolves.toHaveLength(3);
      await expect(layout.getRoutesFor('api::nope.nope')).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      // A content type left out of the layout, a group with no route of its own, an inherited key
      await expect(layout.getRoutesFor(SESSION)).rejects.toMatchObject({ name: 'NotFoundError' });
      await expect(layout.getRoutesFor('api::homepage')).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      await expect(layout.getRoutesFor('constructor')).rejects.toMatchObject({
        name: 'NotFoundError',
      });
    });
  });

  describe('what a rule shows of its config', () => {
    const SECRET = '[redacted]';
    const NOT_JSON = '[unserializable]';

    /** The rules of one route, as `getRoutesFor` serves them, for a route with this `config` */
    const servedRules = async (config: Record<string, unknown>) => {
      const { layout: fresh } = setup({
        getRoutesMap: vi.fn(async () => ({
          'api::health': [route('GET', '/api/health', 'api::health.health.index', config)],
        })),
      });

      return (await fresh.getRoutesFor('api::health'))[0].rules;
    };

    /** What a route's policy shows of the `config` it is given */
    const servedConfig = async (config: unknown) =>
      (await servedRules({ policies: [{ name: 'global::probe', config }] }))[0].config;

    it('redacts the value under a secret-like key, at any depth and inside lists', async () => {
      const served = await servedConfig({
        max: 5,
        label: 'ok',
        apiKey: 'k1',
        api_key: 'k2',
        'x-api-key': 'k3',
        Authorization: 'Bearer abc',
        clientSecret: 's',
        privateKey: 'p',
        password: 'pw',
        passwd: 'pw',
        dsn: 'https://user:pass@host/1',
        redirectURL: 'https://example.com/cb',
        tokens: ['a', 'b'],
        nested: { ok: true, db: { secret: 's', host: 'h' } },
        list: [{ name: 'a', token: 't' }, [{ credentials: { user: 'u' } }], 'plain', 3, null],
      });

      expect(served).toEqual({
        max: 5,
        label: 'ok',
        apiKey: SECRET,
        api_key: SECRET,
        'x-api-key': SECRET,
        Authorization: SECRET,
        clientSecret: SECRET,
        privateKey: SECRET,
        password: SECRET,
        passwd: SECRET,
        dsn: SECRET,
        redirectURL: SECRET,
        tokens: SECRET,
        nested: { ok: true, db: { secret: SECRET, host: 'h' } },
        list: [{ name: 'a', token: SECRET }, [{ credentials: SECRET }], 'plain', 3, null],
      });
    });

    it.each([
      ['uri', 'redirectUri'],
      ['pass', 'passphrase'],
      ['pwd', 'dbPwd'],
      ['conn', 'connectionName'],
      ['cookie', 'cookieName'],
      ['session', 'sessionStore'],
      ['jwt', 'jwtAlgorithm'],
      ['bearer', 'bearerPrefix'],
      ['salt', 'saltRounds'],
      ['sign', 'signatureHeader'],
      ['hmac', 'hmacAlgorithm'],
      ['webhook', 'webhookTarget'],
    ])('redacts a value under a key with %s in it, even a harmless one', async (_part, key) => {
      expect(
        await servedConfig({ [key]: 'x', nested: { [key]: 5 }, list: [{ [key]: true }] })
      ).toEqual({ [key]: SECRET, nested: { [key]: SECRET }, list: [{ [key]: SECRET }] });
    });

    describe('shows only what looks safe, under any key', () => {
      it('shows numbers, booleans, null and short plain strings', async () => {
        expect(
          await servedConfig({
            max: 5,
            ratio: -0.5,
            enabled: false,
            nothing: null,
            label: 'per minute',
            scope: 'plugin::end-users.is-owner',
            methods: ['GET', 'POST'],
            counts: [1, 2],
          })
        ).toEqual({
          max: 5,
          ratio: -0.5,
          enabled: false,
          nothing: null,
          label: 'per minute',
          scope: 'plugin::end-users.is-owner',
          methods: ['GET', 'POST'],
          counts: [1, 2],
        });
      });

      it.each([
        ['a URL with credentials', 'https://user:hunter2@db.internal/app'],
        ['a URL', 'redis://cache.internal:6379'],
        ['a bearer header', 'Bearer abc'],
        ['a bearer header in any case', 'bearer abc'],
        ['a 40-character hex digest', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'],
        ['a prefixed key', ['sk', 'live', 'abcdefghijklmnopqrstuvwx'].join('_')],
        ['base64', 'dXNlcjpodW50ZXIyLXNlY3JldC12YWx1ZQ=='],
        ['a JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl'],
        ['a base64url run', 'abc-DEF_ghi-JKL_mno-PQR'],
      ])('redacts %s under a key that says nothing', async (_what, value) => {
        expect(
          await servedConfig({ note: value, list: [value, 'ok'], deep: { note: value } })
        ).toEqual({
          note: SECRET,
          list: [SECRET, 'ok'],
          deep: { note: SECRET },
        });
      });

      it('redacts a string longer than 64 characters, and keeps one that is exactly 64', async () => {
        // Words and spaces, so that no run of characters is long enough to look like a key
        const sixtyFour = 'a '.repeat(32);

        expect(sixtyFour).toHaveLength(64);
        expect(await servedConfig({ shown: sixtyFour, hidden: `${sixtyFour}b` })).toEqual({
          shown: sixtyFour,
          hidden: SECRET,
        });
      });

      it('redacts a run of 20 base64 or hex characters, and keeps one of 19', async () => {
        expect(
          await servedConfig({
            shown: `id ${'a'.repeat(19)} end`,
            hidden: `id ${'a'.repeat(20)} end`,
          })
        ).toEqual({ shown: `id ${'a'.repeat(19)} end`, hidden: SECRET });
      });

      it('hides a config that is a list whole, whatever strings it holds', async () => {
        expect(await servedConfig(['https://user:hunter2@db.internal'])).toEqual({ value: SECRET });
      });
    });

    it('shows nothing of a config that is not an object of named settings: no key says what it is', async () => {
      class Settings {
        key = 'sk_live_123';
      }

      for (const config of ['sk_live_123', 42, true, ['a', { token: 't' }], new Settings()]) {
        expect(await servedConfig(config), String(config)).toEqual({ value: SECRET });
      }

      // No config is no settings
      expect(await servedConfig(undefined)).toEqual({});
      expect(await servedConfig(null)).toEqual({});
    });

    it('copies a config that holds itself or is not JSON, so that it always serializes', async () => {
      const config: Record<string, unknown> = { a: 1, omitted: undefined };

      config.self = config;
      config.child = { back: config, list: [config] };
      config.big = 10n;
      config.fn = () => {};
      config.symbol = Symbol('s');
      config.date = new Date(0);
      config.pattern = /x/;
      config.map = new Map([['k', 'v']]);
      config.notANumber = Number.NaN;
      config.instance = new (class Thing {
        x = 1;
      })();

      const served = await servedConfig(config);

      expect(served).toEqual({
        a: 1,
        self: NOT_JSON,
        child: { back: NOT_JSON, list: [NOT_JSON] },
        big: NOT_JSON,
        fn: NOT_JSON,
        symbol: NOT_JSON,
        date: NOT_JSON,
        pattern: NOT_JSON,
        map: NOT_JSON,
        notANumber: NOT_JSON,
        instance: NOT_JSON,
      });
      expect(() => JSON.stringify(served)).not.toThrow();
    });

    it('stops at a depth, and at a getter that throws', async () => {
      const deep: Record<string, unknown> = {};
      let at = deep;

      for (let level = 0; level < 20; level += 1) {
        const next: Record<string, unknown> = {};

        at.next = next;
        at = next;
      }

      let node: unknown = await servedConfig(deep);
      let levels = 0;

      while (typeof node === 'object' && node !== null) {
        node = (node as Record<string, unknown>).next;
        levels += 1;
      }

      expect(node).toBe(NOT_JSON);
      expect(levels).toBeLessThan(20);

      // The part that cannot be read is not shown; the rest is
      const inner = {
        get boom(): never {
          throw new Error('not for you');
        },
      };

      expect(await servedConfig({ ok: 1, inner })).toEqual({ ok: 1, inner: NOT_JSON });
    });

    it('shows a middleware that is a module path by the last part of the path, never the path', async () => {
      const rules = await servedRules({
        middlewares: [
          { resolve: '/srv/app/src/middlewares/custom-thing.js', config: { token: 't', ttl: 1 } },
          { resolve: 'C:\\srv\\app\\other.js' },
          { resolve: './' },
        ],
      });

      expect(rules).toEqual([
        {
          kind: 'middleware',
          name: 'custom-thing',
          label: 'Custom thing',
          config: { token: SECRET, ttl: 1 },
        },
        { kind: 'middleware', name: 'other', label: 'Other', config: {} },
        { kind: 'middleware', name: 'anonymous', label: 'Anonymous', config: {} },
      ]);
      expect(JSON.stringify(rules)).not.toMatch(/srv|[\\/]/);
    });

    it('never touches the config the router runs: the answer is a copy', async () => {
      const deepFreeze = (value: unknown): void => {
        if (typeof value === 'object' && value !== null) {
          Object.values(value).forEach(deepFreeze);
          Object.freeze(value);
        }
      };

      const live = { max: 5, apiKey: 'live-key', nested: { secret: 's', list: [{ token: 't' }] } };
      const before = structuredClone(live);

      // A write to it would throw: a module runs in strict mode
      deepFreeze(live);

      const [{ config }] = await servedRules({
        policies: [{ name: 'global::probe', config: live }],
      });

      expect(live).toEqual(before);
      expect(config).not.toBe(live);
      expect((config as { nested: unknown }).nested).not.toBe(live.nested);
      expect(config).toEqual({
        max: 5,
        apiKey: SECRET,
        nested: { secret: SECRET, list: [{ token: SECRET }] },
      });
    });
  });

  describe('building', () => {
    it('builds once and keeps it, for a layout and for routes alike', async () => {
      const { layout: fresh, getRoutesMap } = setup();

      const [first, second] = await Promise.all([fresh.getLayout(), fresh.getLayout()]);
      await fresh.getRoutesFor(ARTICLE);

      expect(first).toBe(second);
      expect(await fresh.getLayout()).toBe(first);
      expect(getRoutesMap).toHaveBeenCalledTimes(1);
    });

    it('does not keep a build that failed', async () => {
      const getRoutesMap = vi
        .fn()
        .mockRejectedValueOnce(new Error('registry not ready'))
        .mockImplementation(async () => routesMap());
      const { layout: fresh } = setup({ getRoutesMap });

      await expect(fresh.getLayout()).rejects.toThrow('registry not ready');
      await expect(fresh.getLayout()).resolves.toMatchObject({
        contentTypes: [{ uid: ARTICLE }, { uid: HOMEPAGE }, { uid: USER_UID }],
      });
      expect(getRoutesMap).toHaveBeenCalledTimes(2);
    });
  });
});
