import { http, HttpResponse } from 'msw';

import { server } from '../../../../tests/server';

import type { ConditionListItem } from '../../../../../shared/contracts/conditions';
import type {
  BoundRoute,
  LayoutField,
  PermissionLayout,
} from '../../../../../shared/contracts/permissions';
import type { RoleDetail } from '../../../../../shared/contracts/roles';

/**
 * A project to edit roles of, and the roles to edit, for the pages of the role editor. Two
 * collection types (Article, whose Update route has a policy, and Category), a single type, one
 * plugin's route and one of the project's own.
 */

const field = (name: string, extra: Partial<LayoutField> = {}): LayoutField => ({
  name,
  label: name.split('.').pop() as string,
  type: 'string',
  required: false,
  engineOwned: false,
  ...extra,
});

const actionsOf = (uid: string, rules: string[] = []) =>
  ['find', 'findOne', 'create', 'update', 'delete', 'read-drafts', 'publish'].map((action) => ({
    action: action as 'find',
    actionId: `${uid}.${action}`,
    hasRules: rules.includes(action),
  }));

export const ARTICLE = 'api::article.article';
export const CATEGORY = 'api::category.category';
export const TAG = 'api::tag.tag';

export const LAYOUT: PermissionLayout = {
  contentTypes: [
    {
      uid: ARTICLE,
      label: 'Article',
      kind: 'collectionType',
      actions: actionsOf(ARTICLE, ['update']),
      fields: [
        field('title', { required: true }),
        field('body'),
        field('seo', { type: 'component', children: [field('seo.metaTitle')] }),
      ],
      locked: [],
      conditions: [],
    },
    {
      uid: CATEGORY,
      label: 'Category',
      kind: 'collectionType',
      actions: actionsOf(CATEGORY).slice(0, 5),
      fields: [field('name'), field('slug')],
      locked: [],
      conditions: [],
    },
    {
      uid: 'api::homepage.homepage',
      label: 'Homepage',
      kind: 'singleType',
      actions: actionsOf('api::homepage.homepage').slice(0, 4),
      fields: [field('headline')],
      locked: [],
      conditions: [],
    },
  ],
  groups: [
    {
      id: 'plugin::end-users',
      kind: 'plugin',
      label: 'End users',
      categories: [
        {
          label: 'Me',
          routes: [
            {
              actionId: 'plugin::end-users.me.find',
              label: 'Find',
              route: 'GET /api/users/me',
              hasRules: false,
            },
          ],
        },
      ],
    },
    {
      id: 'api::health',
      kind: 'custom',
      label: 'Health',
      categories: [
        {
          label: 'Health',
          routes: [
            {
              actionId: 'api::health.health.check',
              label: 'Check',
              route: 'GET /api/health',
              hasRules: false,
            },
          ],
        },
      ],
    },
  ],
};

/**
 * The same project with a third collection type, for what is asked from three types on (the
 * "select all" of a column)
 */
export const WIDE_LAYOUT: PermissionLayout = {
  ...LAYOUT,
  contentTypes: [
    ...LAYOUT.contentTypes,
    {
      uid: TAG,
      label: 'Tag',
      kind: 'collectionType',
      actions: actionsOf(TAG).slice(0, 5),
      fields: [field('label')],
      locked: [],
      conditions: [],
    },
  ],
};

/** The routes bound to Article. Its Update route runs a policy. */
export const ARTICLE_ROUTES: BoundRoute[] = [
  { actionId: `${ARTICLE}.find`, method: 'GET', path: '/api/articles', rules: [] },
  { actionId: `${ARTICLE}.findOne`, method: 'GET', path: '/api/articles/:id', rules: [] },
  { actionId: `${ARTICLE}.create`, method: 'POST', path: '/api/articles', rules: [] },
  {
    actionId: `${ARTICLE}.update`,
    method: 'PUT',
    path: '/api/articles/:id',
    rules: [{ kind: 'policy', name: 'global::owner-only', label: 'Owner only', config: {} }],
  },
  { actionId: `${ARTICLE}.delete`, method: 'DELETE', path: '/api/articles/:id', rules: [] },
];

/** A role with two rows, at revision 4 */
export const PREMIUM: RoleDetail = {
  documentId: 'p1',
  name: 'Premium member',
  description: 'Paid subscribers. Can read drafts and every article field.',
  type: 'custom',
  requireTwoFactor: true,
  usersCount: 212,
  createdAt: '2026-11-02T09:00:00.000Z',
  updatedAt: '2026-11-02T09:00:00.000Z',
  revision: 4,
  permissions: [
    {
      documentId: 'p1',
      action: `${ARTICLE}.find`,
      subject: null,
      properties: { fields: ['title', 'body', 'seo.metaTitle'] },
      conditions: [],
    },
    {
      documentId: 'p2',
      action: `${ARTICLE}.read-drafts`,
      subject: null,
      properties: {},
      conditions: [],
    },
  ],
  problems: [],
  namedBy: [],
};

/** The same role with two more rows the server now refuses: a deleted condition, a deleted field */
export const PREMIUM_WITH_PROBLEMS: RoleDetail = {
  ...PREMIUM,
  permissions: [
    ...PREMIUM.permissions,
    {
      documentId: 'p9',
      action: `${CATEGORY}.findOne`,
      subject: null,
      properties: { fields: ['name', 'slug'] },
      conditions: [{ name: 'plugin::gone.is-vip' }],
    },
    {
      documentId: 'p10',
      action: `${ARTICLE}.update`,
      subject: null,
      properties: { fields: ['title', 'gone'] },
      conditions: [],
    },
  ],
  problems: [
    {
      documentId: 'p9',
      index: 2,
      action: `${CATEGORY}.findOne`,
      key: 'conditions',
      reason: '"plugin::gone.is-vip" is not a registered condition',
    },
    {
      documentId: 'p10',
      index: 3,
      action: `${ARTICLE}.update`,
      key: 'properties',
      reason: `"gone" is not a field of ${ARTICLE}`,
    },
  ],
};

export const PUBLIC: RoleDetail = {
  documentId: 'public',
  name: 'Public',
  description: 'Default role given to unauthenticated user.',
  type: 'public',
  requireTwoFactor: false,
  usersCount: 0,
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  revision: 0,
  permissions: [],
  problems: [],
  namedBy: [],
};

/**
 * The server the role pages read: the layout, each of `roles` by its `documentId`, and the routes
 * bound to what the details pane opens (`routes` by content type or group id; none for the others),
 * and the `conditions` a save is checked against (none by default).
 * Writes are the test's own (`server.use` with an `http.put` or `http.post`).
 */
export const serveRoles = (
  roles: RoleDetail[] = [PREMIUM, PUBLIC],
  layout = LAYOUT,
  routes: Record<string, BoundRoute[]> = { [ARTICLE]: ARTICLE_ROUTES },
  conditions: ConditionListItem[] = []
) => {
  server.use(
    http.get('/end-users/conditions', () => HttpResponse.json({ data: conditions })),
    http.get('/end-users/permissions/layout', () => HttpResponse.json({ data: layout })),
    http.get('/end-users/permissions/routes', ({ request }) =>
      HttpResponse.json({
        data: routes[new URL(request.url).searchParams.get('subject') ?? ''] ?? [],
      })
    ),
    http.get('/end-users/roles/:documentId', ({ params }) => {
      const role = roles.find(({ documentId }) => documentId === params.documentId);

      return role
        ? HttpResponse.json({ data: role })
        : HttpResponse.json(
            { error: { status: 404, name: 'NotFoundError', message: 'Not Found', details: {} } },
            { status: 404 }
          );
    })
  );
};
