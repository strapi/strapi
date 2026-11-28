import { describe, expect, it } from 'vitest';

import { DATA_ACTIONS } from '../../../../../../shared/contracts/permissions';
import {
  describeChanges,
  sameRow,
  toEditorModel,
  toPermissionDiff,
  toPermissionRows,
} from '../editorModel';

import type {
  ConditionRef,
  DataAction,
  LayoutCondition,
  LayoutField,
  PermissionLayout,
  PermissionRow,
  RolePermission,
} from '../../../../../../shared/contracts/permissions';
import type { PermissionProblem } from '../../../../../../shared/contracts/roles';
import type { SubjectSettings } from '../editorModel';
import type { PermissionsRow } from '@strapi/admin/strapi-admin';

/* -------------------------------------------------------------------------------------------------
 * Fixtures
 * -----------------------------------------------------------------------------------------------*/

const ARTICLE = 'api::article.article';
const CATEGORY = 'api::category.category';
const HOMEPAGE = 'api::homepage.homepage';
const USER = 'plugin::end-users.user';

const IS_OWNER = 'plugin::end-users.is-owner';
const IS_SELF = 'plugin::end-users.is-self';

const field = (name: string, extra: Partial<LayoutField> = {}): LayoutField => ({
  name,
  label: name.split('.').pop() as string,
  type: 'string',
  required: false,
  engineOwned: false,
  ...extra,
});

const actionsOf = (uid: string, list: readonly DataAction[] = DATA_ACTIONS) =>
  list.map((action) => ({ action, actionId: `${uid}.${action}`, hasRules: false }));

const isOwner: LayoutCondition = {
  name: IS_OWNER,
  displayName: 'Is owner',
  source: 'builtin',
  params: [{ name: 'field', type: 'attribute', required: false, options: ['author'] }],
};

const isSelf: LayoutCondition = {
  name: IS_SELF,
  displayName: 'Is self',
  source: 'builtin',
  params: [],
};

const gated: LayoutCondition = {
  name: 'api::gated',
  displayName: 'Gated',
  source: 'builder',
  params: [{ name: 'includeDrafts', type: 'boolean', required: false, default: false }],
};

const layout: PermissionLayout = {
  contentTypes: [
    {
      uid: ARTICLE,
      label: 'Article',
      kind: 'collectionType',
      actions: actionsOf(ARTICLE),
      fields: [
        field('title', { required: true }),
        field('body'),
        field('author', { type: 'relation', relationTarget: USER }),
        field('seo', {
          type: 'component',
          children: [field('seo.metaTitle'), field('seo.shareImage')],
        }),
      ],
      locked: ['createdBy'],
      conditions: [isOwner, gated],
    },
    {
      uid: CATEGORY,
      label: 'Category',
      kind: 'collectionType',
      actions: actionsOf(CATEGORY, ['find', 'findOne', 'create', 'update', 'delete']),
      fields: [field('name', { required: true }), field('slug')],
      locked: [],
      conditions: [],
    },
    {
      uid: HOMEPAGE,
      label: 'Homepage',
      kind: 'singleType',
      actions: actionsOf(HOMEPAGE, ['find', 'create', 'update', 'delete']),
      fields: [field('headline')],
      locked: [],
      conditions: [],
    },
    {
      uid: USER,
      label: 'User',
      kind: 'collectionType',
      actions: actionsOf(USER, ['find', 'findOne', 'create', 'update']),
      fields: [field('email', { engineOwned: true }), field('username'), field('bio')],
      locked: ['Passwords, sessions and linked accounts'],
      conditions: [isSelf],
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

const ALL_ARTICLE_FIELDS = ['title', 'body', 'author', 'seo.metaTitle', 'seo.shareImage'];

const row = (
  action: string,
  properties: PermissionRow['properties'] = {},
  conditions: ConditionRef[] = [],
  subject: string | null = null
): PermissionRow => ({ action, subject, properties, conditions });

/** Stored rows as the API returns them: each with its documentId */
const stored = (rows: PermissionRow[]): RolePermission[] =>
  rows.map((permission, position) => ({ documentId: `p${position + 1}`, ...permission }));

const withoutIds = (rows: RolePermission[]): PermissionRow[] =>
  rows.map(({ action, subject, properties, conditions }) => ({
    action,
    subject,
    properties,
    conditions,
  }));

/** A row as `Permissions` reports it */
const reported = (
  action: string,
  subject: string | null,
  fields?: string[] | null
): PermissionsRow => ({
  action,
  subject,
  conditions: [],
  properties: fields === undefined ? {} : { fields },
});

const settingsFor = (own: Record<string, Partial<SubjectSettings>> = {}) =>
  Object.fromEntries(
    layout.contentTypes.map(({ uid }) => [
      uid,
      { populateDepth: null, conditions: {}, ...own[uid] } satisfies SubjectSettings,
    ])
  );

const EMPTY_DIFF = { create: [], update: [], delete: [] };

/** The role as the editor would hand it back untouched: the rows it was loaded with */
const roundTrip = (rows: RolePermission[], problems: PermissionProblem[] = []) => {
  const model = toEditorModel(layout, rows, problems);
  const next = toPermissionRows(model.rows, model.settings, layout, rows, model.stale);

  return { model, next, diff: toPermissionDiff(rows, next, [], layout) };
};

const problemOf = (documentId: string, index: number): PermissionProblem => ({
  documentId,
  index,
  action: 'x',
  key: 'conditions',
  reason: 'the condition "api::gone" is not registered',
});

const SEED_PUBLIC = [
  row(`${ARTICLE}.find`, { fields: ['title', 'body', 'author'] }),
  row(`${ARTICLE}.findOne`, { fields: ['title', 'body', 'author'] }),
];

const SEED_AUTHENTICATED = [
  ...SEED_PUBLIC,
  row(`${ARTICLE}.create`, { fields: ['title', 'body'] }, [
    { name: IS_OWNER, params: { field: 'author' } },
  ]),
  row(`${ARTICLE}.update`, { fields: ['title', 'body'] }, [
    { name: IS_OWNER, params: { field: 'author' } },
  ]),
  row(`${ARTICLE}.delete`, {}, [{ name: IS_OWNER, params: { field: 'author' } }]),
  row(`${ARTICLE}.read-drafts`, {}, [{ name: IS_OWNER, params: { field: 'author' } }]),
  row(`${ARTICLE}.publish`, {}, [{ name: IS_OWNER, params: { field: 'author' } }]),
  row(`${USER}.find`, {}, [{ name: IS_SELF, params: {} }]),
];

const SEED_EDITOR = DATA_ACTIONS.map((action) => row(`${ARTICLE}.${action}`));

/* -------------------------------------------------------------------------------------------------
 * toEditorModel
 * -----------------------------------------------------------------------------------------------*/

describe('editor model', () => {
  describe('toEditorModel', () => {
    it('builds the columns, field properties and sections', () => {
      const { layout: editor, rows, stale, settings } = toEditorModel(layout, [], []);
      const { collectionTypes, singleTypes, plugins, settings: custom } = editor.sections;

      expect(editor.conditions).toEqual([]);
      expect(collectionTypes.actions.map(({ actionId }) => actionId)).toEqual([
        'find',
        'findOne',
        'create',
        'update',
        'delete',
        'read-drafts',
        'publish',
      ]);
      expect(collectionTypes.actions.map(({ label }) => label)).toEqual([
        'Find',
        'Find one',
        'Create',
        'Update',
        'Delete',
        'Read drafts',
        'Publish',
      ]);
      expect(
        collectionTypes.actions
          .filter(({ applyToProperties }) => applyToProperties.includes('fields'))
          .map(({ actionId }) => actionId)
      ).toEqual(['find', 'findOne', 'create', 'update']);

      // A column lists the content types that have the action: Category has no drafts
      expect(
        collectionTypes.actions.find(({ actionId }) => actionId === 'publish')?.subjects
      ).toEqual([ARTICLE]);
      expect(
        collectionTypes.actions.find(({ actionId }) => actionId === 'delete')?.subjects
      ).toEqual([ARTICLE, CATEGORY]);

      const article = collectionTypes.subjects.find(({ uid }) => uid === ARTICLE);

      expect(article?.label).toBe('Article');
      expect(article?.properties).toHaveLength(1);
      expect(article?.properties[0]).toMatchObject({ label: 'Fields', value: 'fields' });
      expect(article?.properties[0].children?.map(({ value }) => value)).toEqual([
        'title',
        'body',
        'author',
        'seo',
      ]);
      expect(article?.properties[0].children?.[0]).toMatchObject({
        value: 'title',
        required: true,
      });
      // A component's fields are named by their last segment: the editor builds the path
      expect(article?.properties[0].children?.[3].children?.map(({ value }) => value)).toEqual([
        'metaTitle',
        'shareImage',
      ]);
      // There is no "All fields" row: a role granted every field loads with every cell ticked
      expect(article).not.toHaveProperty('allOption');
      expect(article?.locked).toEqual([
        { label: 'createdBy', note: 'Hidden from responses. This editor never makes it writable.' },
      ]);

      // An engine-owned field is off under Create and Update, and only there
      const user = collectionTypes.subjects.find(({ uid }) => uid === USER);

      expect(user?.properties[0].children?.[0]).toMatchObject({
        value: 'email',
        disabledActions: ['create', 'update'],
      });
      expect(user?.properties[0].children?.[1]).not.toHaveProperty('disabledActions');

      const disabledActions = collectionTypes.subjects.flatMap(({ properties }) =>
        (properties[0].children ?? []).flatMap((child) => child.disabledActions ?? [])
      );

      expect(new Set(disabledActions)).toEqual(new Set(['create', 'update']));

      expect(singleTypes.subjects.map(({ uid }) => uid)).toEqual([HOMEPAGE]);
      expect(singleTypes.actions.find(({ actionId }) => actionId === 'create')?.subjects).toEqual([
        HOMEPAGE,
      ]);

      // The plugin's routes are the Plugins tab, an API's own the settings section
      expect(plugins).toEqual([
        {
          action: 'plugin::end-users.me.find',
          displayName: 'Find',
          plugin: 'plugin::end-users',
          subCategory: 'Me',
        },
      ]);
      expect(custom).toEqual([
        {
          action: 'api::health.health.check',
          displayName: 'Check',
          category: 'api::health',
          subCategory: 'Health',
        },
      ]);

      expect(rows).toEqual([]);
      expect(stale).toEqual([]);
      expect(Object.keys(settings)).toEqual([ARTICLE, CATEGORY, HOMEPAGE, USER]);
      expect(settings[ARTICLE]).toEqual({ populateDepth: null, conditions: {} });
    });

    it('loads each stored row as the editor reads it', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: ['title', 'seo'] }),
        row(`${ARTICLE}.findOne`, { fields: null }),
        row(`${ARTICLE}.create`),
        row(`${ARTICLE}.delete`, {}, [{ name: IS_OWNER, params: { field: 'author' } }]),
        row('plugin::end-users.me.find'),
        row(`${HOMEPAGE}.find`, { fields: ['headline'] }, [], HOMEPAGE),
      ]);
      const { model } = roundTrip(rows);

      expect(model.rows).toEqual([
        // Listing a component names every one of its fields
        reported('find', ARTICLE, ['title', 'seo.metaTitle', 'seo.shareImage']),
        // `fields: null` and an absent list are every field: every cell ticked, on any action
        reported('findOne', ARTICLE, ALL_ARTICLE_FIELDS),
        reported('create', ARTICLE, ALL_ARTICLE_FIELDS),
        reported('delete', ARTICLE),
        reported('plugin::end-users.me.find', null),
        reported('find', HOMEPAGE, ['headline']),
      ]);
      // Conditions are not the editor's: they wait in the settings, by action
      expect(model.settings[ARTICLE].conditions).toEqual({
        delete: [{ name: IS_OWNER, params: { field: 'author' } }],
      });
    });

    it('shows a field an action cannot set as not ticked, and loads the rest', () => {
      const { model } = roundTrip(
        stored([row(`${USER}.update`, { fields: ['email', 'username'] })])
      );

      expect(model.rows).toEqual([reported('update', USER, ['username'])]);
    });

    it('takes one depth for the type, or Mixed when its rows differ', () => {
      const same = toEditorModel(
        layout,
        stored([
          row(`${ARTICLE}.find`, { populateDepth: 2 }),
          row(`${ARTICLE}.delete`, { populateDepth: 2 }),
          row(`${CATEGORY}.find`, { populateDepth: null }),
          row(`${USER}.find`),
        ]),
        []
      );
      const mixed = toEditorModel(
        layout,
        stored([row(`${ARTICLE}.find`, { populateDepth: 1 }), row(`${ARTICLE}.findOne`)]),
        []
      );

      expect(same.settings[ARTICLE].populateDepth).toBe(2);
      expect(same.settings[CATEGORY].populateDepth).toBeNull();
      expect(same.settings[USER].populateDepth).toBeNull();
      // A row with no depth is Unlimited, which is not 1
      expect(mixed.settings[ARTICLE].populateDepth).toBe('mixed');
    });
  });

  /* -----------------------------------------------------------------------------------------------
   * The role as stored comes back as stored
   * ---------------------------------------------------------------------------------------------*/

  describe('a role the admin did not change', () => {
    it.each([
      ['public', SEED_PUBLIC],
      ['authenticated', SEED_AUTHENTICATED],
      ['editor', SEED_EDITOR],
    ])('gives an empty diff for the seed role %s as stored', (_name, seed) => {
      const rows = stored(seed);
      const { next, diff } = roundTrip(rows);

      expect(next).toEqual(withoutIds(rows));
      expect(diff).toEqual(EMPTY_DIFF);
    });

    it('reads `fields: null` reported on an untouched row stored with every field as unchanged', () => {
      const rows = stored(SEED_EDITOR);
      const model = toEditorModel(layout, rows, []);
      // The editor reports lists, but a consumer may hand back what it was given as `null`
      const sent = model.rows.map((editorRow) =>
        editorRow.properties.fields === undefined
          ? editorRow
          : { ...editorRow, properties: { fields: null } }
      );
      const next = toPermissionRows(sent, model.settings, layout, rows, model.stale);

      expect(next).toEqual(withoutIds(rows));
      expect(toPermissionDiff(rows, next, [], layout)).toEqual(EMPTY_DIFF);
    });

    it('loads every field ticked and enabled on any action, and sends the stored row back as it is', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: null }),
        row(`${ARTICLE}.findOne`),
        row(`${ARTICLE}.create`, { fields: null }),
        row(`${ARTICLE}.update`),
        row(`${USER}.update`, { fields: null }),
      ]);
      const { model, next, diff } = roundTrip(rows);

      expect(model.rows).toEqual([
        reported('find', ARTICLE, ALL_ARTICLE_FIELDS),
        reported('findOne', ARTICLE, ALL_ARTICLE_FIELDS),
        reported('create', ARTICLE, ALL_ARTICLE_FIELDS),
        reported('update', ARTICLE, ALL_ARTICLE_FIELDS),
        // An engine-owned field is not a cell of Update: the rest of the user's fields are
        reported('update', USER, ['username', 'bio']),
      ]);
      expect(JSON.stringify(next)).toBe(JSON.stringify(withoutIds(rows)));
      expect(diff).toEqual(EMPTY_DIFF);
    });

    it('keeps `fields: null` as stored when only the conditions or the depth change, and lists the fields when a cell changes', () => {
      const rows = stored([row(`${ARTICLE}.find`, { fields: null }), row(`${ARTICLE}.update`)]);
      const model = toEditorModel(layout, rows, []);
      const loaded = model.rows;
      const own = {
        ...model.settings,
        [ARTICLE]: {
          populateDepth: 2,
          conditions: { find: [{ name: IS_OWNER, params: { field: 'author' } }] },
        },
      };

      // A condition on Find and a depth: the fields are not touched
      expect(toPermissionRows(loaded, own, layout, rows, model.stale)).toEqual([
        row(`${ARTICLE}.find`, { fields: null, populateDepth: 2 }, [
          { name: IS_OWNER, params: { field: 'author' } },
        ]),
        row(`${ARTICLE}.update`, { populateDepth: 2 }),
      ]);

      // A cell of Update unticked: that row becomes the list of the cells left, Find is as stored
      const edited = loaded.map((editorRow) =>
        editorRow.action === 'update'
          ? reported(
              'update',
              ARTICLE,
              ALL_ARTICLE_FIELDS.filter((path) => path !== 'body')
            )
          : editorRow
      );
      const next = toPermissionRows(edited, model.settings, layout, rows, model.stale);

      expect(next).toEqual([
        row(`${ARTICLE}.find`, { fields: null }),
        row(`${ARTICLE}.update`, {
          fields: ['title', 'author', 'seo.metaTitle', 'seo.shareImage'],
        }),
      ]);
      expect(toPermissionDiff(rows, next, [], layout)).toEqual({
        create: [],
        update: [
          {
            documentId: 'p2',
            properties: { fields: ['title', 'author', 'seo.metaTitle', 'seo.shareImage'] },
          },
        ],
        delete: [],
      });
    });

    it('fails closed when a type has no settings entry: a changed row keeps its stored conditions and depth', () => {
      const condition = { name: IS_OWNER, params: { field: 'author' } };
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: null, populateDepth: 2 }, [condition]),
        row(`${ARTICLE}.update`, { populateDepth: 2 }, [condition]),
      ]);
      const model = toEditorModel(layout, rows, []);
      // A cell of Update is unticked, and the type has no settings entry at all
      const edited = model.rows.map((editorRow) =>
        editorRow.action === 'update'
          ? reported(
              'update',
              ARTICLE,
              ALL_ARTICLE_FIELDS.filter((path) => path !== 'body')
            )
          : editorRow
      );
      const next = toPermissionRows(edited, {}, layout, rows, model.stale);

      expect(next).toEqual([
        row(`${ARTICLE}.find`, { fields: null, populateDepth: 2 }, [condition]),
        row(
          `${ARTICLE}.update`,
          { populateDepth: 2, fields: ['title', 'author', 'seo.metaTitle', 'seo.shareImage'] },
          [condition]
        ),
      ]);
    });

    it('disables Create and Update for roles, localizations and populated creator fields', () => {
      const readOnly: PermissionLayout = {
        ...layout,
        contentTypes: [
          {
            ...layout.contentTypes[0],
            fields: [
              field('title'),
              field('createdBy', { type: 'relation', writable: false }),
              field('localizations', { type: 'relation', writable: false }),
              field('roles', { type: 'relation', writable: false }),
            ],
          },
        ],
      };
      const subject = toEditorModel(readOnly, [], []).layout.sections.collectionTypes.subjects[0];
      const children = subject.properties[0].children ?? [];

      expect(children.find(({ value }) => value === 'title')).not.toHaveProperty('disabledActions');
      ['createdBy', 'localizations', 'roles'].forEach((name) => {
        expect(children.find(({ value }) => value === name)?.disabledActions).toEqual([
          'create',
          'update',
        ]);
      });

      // A role that lists one of them under Update is shown without it, and Create has no cell for it
      const rows = stored([row(`${ARTICLE}.update`, { fields: ['title', 'roles'] })]);
      const model = toEditorModel(readOnly, rows, []);

      expect(model.rows).toEqual([reported('update', ARTICLE, ['title'])]);
    });

    it('keeps a row that has every field but no cell the editor can tick', () => {
      // Every field of this type is engine-owned, so Create has no cell: the row is not shown
      const bare: PermissionLayout = {
        ...layout,
        contentTypes: [
          {
            ...layout.contentTypes[0],
            fields: layout.contentTypes[0].fields.map((field) => ({
              ...field,
              engineOwned: true,
              children: field.children?.map((child) => ({ ...child, engineOwned: true })),
            })),
          },
        ],
      };
      const rows = stored([row(`${ARTICLE}.create`, { fields: null })]);
      const model = toEditorModel(bare, rows, []);
      const next = toPermissionRows(model.rows, model.settings, bare, rows, model.stale);

      expect(model.rows).toEqual([]);
      expect(next).toEqual(withoutIds(rows));
      expect(toPermissionDiff(rows, next, [], bare)).toEqual(EMPTY_DIFF);
    });

    it('keeps the rows as stored, byte for byte, with their own key order and subject', () => {
      const rows = stored([
        {
          conditions: [],
          properties: { populateDepth: 2, fields: ['body', 'title'] },
          subject: ARTICLE,
          action: `${ARTICLE}.find`,
        },
      ]);
      const { next, diff } = roundTrip(rows);

      expect(diff).toEqual(EMPTY_DIFF);
      expect(JSON.stringify(next[0].properties)).toBe(
        JSON.stringify({ populateDepth: 2, fields: ['body', 'title'] })
      );
      expect(next[0].subject).toBe(ARTICLE);
    });

    it('sets aside rows with problems, keeps them as stored and deletes them only on request', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: ['title'] }),
        row(`${ARTICLE}.update`, { fields: ['title'] }, [{ name: 'api::gone' }]),
        row('api::removed.removed.find'),
      ]);
      const model = toEditorModel(layout, rows, [problemOf('p2', 1)]);

      // The refused row, and the one the layout lacks: not in the editor
      expect(model.stale.map(({ documentId }) => documentId)).toEqual(['p2', 'p3']);
      expect(model.rows).toEqual([reported('find', ARTICLE, ['title'])]);
      expect(model.settings[ARTICLE].conditions).toEqual({});

      // An unrelated change: Category Find is ticked
      const edited = [...model.rows, reported('find', CATEGORY, ['name', 'slug'])];
      const next = toPermissionRows(edited, model.settings, layout, rows, model.stale);
      const diff = toPermissionDiff(rows, next, [], layout);

      expect(diff.create).toEqual([row(`${CATEGORY}.find`, { fields: ['name', 'slug'] })]);
      expect(diff.update).toEqual([]);
      expect(diff.delete).toEqual([]);

      // On request: their ids are deleted, and an update does not win over it
      expect(toPermissionDiff(rows, next, ['p2', 'p3'], layout).delete).toEqual(['p2', 'p3']);
      expect(toPermissionDiff(rows, next, ['p2', 'p3'], layout).update).toEqual([]);
    });

    it('never deletes a row the editor does not show just because it is missing', () => {
      const rows = stored([
        row('api::removed.removed.find'),
        row(`${ARTICLE}.find`, { fields: [] }),
        row(`${ARTICLE}.findOne`, { fields: ['title'] }),
      ]);

      // `next` is what a caller that dropped everything it did not show would give: only the row
      // the admin could have unticked goes
      expect(toPermissionDiff(rows, [], [], layout)).toEqual({
        create: [],
        update: [],
        delete: ['p3'],
      });
    });

    it('lets a refused row be written over by ticking its cell, and replaced when it is removed', () => {
      const rows = stored([
        row(`${ARTICLE}.update`, { fields: ['title'] }, [{ name: 'api::gone' }], ARTICLE),
      ]);
      const model = toEditorModel(layout, rows, [problemOf('p1', 0)]);
      const edited = [reported('update', ARTICLE, ['title', 'body'])];
      const next = toPermissionRows(edited, model.settings, layout, rows, model.stale);

      expect(next).toEqual([row(`${ARTICLE}.update`, { fields: ['title', 'body'] })]);
      expect(toPermissionDiff(rows, next, [], layout)).toEqual({
        create: [],
        update: [
          {
            documentId: 'p1',
            properties: { fields: ['title', 'body'] },
            conditions: [],
          },
        ],
        delete: [],
      });

      // Removed, the refused row goes and the ticked one is created: remove wins over update
      expect(toPermissionDiff(rows, next, ['p1'], layout)).toEqual({
        create: [row(`${ARTICLE}.update`, { fields: ['title', 'body'] })],
        update: [],
        delete: ['p1'],
      });
    });

    it('treats a row on a subject other than its content type as one the layout lacks', () => {
      const model = toEditorModel(layout, stored([row(`${ARTICLE}.find`, {}, [], CATEGORY)]), []);

      expect(model.rows).toEqual([]);
      expect(model.stale).toHaveLength(1);
    });

    it('keeps a condition it does not know and a fields: [] row', () => {
      const unknown: ConditionRef = {
        name: 'api::not-in-the-layout',
        params: { nested: { list: [1, 'two', null] }, flag: false },
      };
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: [] }),
        row(`${ARTICLE}.findOne`, { fields: ['title'] }, [unknown]),
      ]);
      const { model, next, diff } = roundTrip(rows);

      // The empty row is shown unticked; the unknown condition waits in the settings
      expect(model.rows).toEqual([reported('findOne', ARTICLE, ['title'])]);
      expect(model.settings[ARTICLE].conditions.findOne).toEqual([unknown]);
      expect(model.stale).toEqual([]);
      expect(JSON.stringify(next)).toBe(JSON.stringify(withoutIds(rows)));
      expect(diff).toEqual(EMPTY_DIFF);

      // Another change leaves both as they were
      const edited = [...model.rows, reported('find', CATEGORY, ['name'])];
      const afterEdit = toPermissionRows(edited, model.settings, layout, rows, model.stale);

      expect(JSON.stringify(afterEdit.slice(0, 2))).toBe(JSON.stringify(withoutIds(rows)));
      expect(toPermissionDiff(rows, afterEdit, [], layout)).toEqual({
        ...EMPTY_DIFF,
        create: [row(`${CATEGORY}.find`, { fields: ['name'] })],
      });
    });

    it('grants a fields: [] row only when the admin ticks the action', () => {
      const rows = stored([row(`${ARTICLE}.find`, { fields: [], populateDepth: 2 })]);
      const model = toEditorModel(layout, rows, []);
      const next = toPermissionRows(
        [reported('find', ARTICLE, ['title'])],
        model.settings,
        layout,
        rows,
        model.stale
      );

      expect(toPermissionDiff(rows, next, [], layout)).toEqual({
        create: [],
        update: [{ documentId: 'p1', properties: { fields: ['title'], populateDepth: 2 } }],
        delete: [],
      });
    });

    it('keeps a stored list the editor shows in part as it is stored', () => {
      // `email` is off under Update, `legacy` is no field of the layout (a private one, say)
      const rows = stored([
        row(`${USER}.update`, { fields: ['email', 'username', 'legacy'] }),
        row(`${ARTICLE}.find`, { fields: ['title', 'seo'] }),
      ]);
      const { diff } = roundTrip(rows);

      expect(diff).toEqual(EMPTY_DIFF);
    });

    it('keeps a Create or Update row that names only disabled fields, however it is imported', () => {
      // The editor leaves `email` out of the Update form, so it shows the row unticked
      const rows = stored([
        row(`${USER}.update`, { fields: ['email'] }),
        row(`${USER}.create`, { fields: ['email', 'bio'] }),
      ]);
      const { model, next, diff } = roundTrip(rows);

      expect(model.rows).toEqual([reported('create', USER, ['bio'])]);
      expect(next).toEqual(withoutIds(rows));
      expect(diff).toEqual(EMPTY_DIFF);

      // What the editor sends back for the untouched Create row has no `email` either
      const sent = [reported('create', USER, ['bio'])];

      expect(
        toPermissionDiff(
          rows,
          toPermissionRows(sent, model.settings, layout, rows, model.stale),
          [],
          layout
        )
      ).toEqual(EMPTY_DIFF);
    });
  });

  /* -----------------------------------------------------------------------------------------------
   * What the admin changes
   * ---------------------------------------------------------------------------------------------*/

  describe('toPermissionRows', () => {
    it('grants the cells the editor ticked as an explicit list, never null', () => {
      const model = toEditorModel(layout, [], []);
      // Ticking Create, Update and Find with every cell: the editor lists each of them
      const next = toPermissionRows(
        [
          reported('create', ARTICLE, ALL_ARTICLE_FIELDS),
          reported('update', ARTICLE, ALL_ARTICLE_FIELDS),
          reported('find', ARTICLE, ALL_ARTICLE_FIELDS),
        ],
        model.settings,
        layout,
        [],
        []
      );

      expect(next).toEqual([
        row(`${ARTICLE}.create`, { fields: ALL_ARTICLE_FIELDS }),
        row(`${ARTICLE}.update`, { fields: ALL_ARTICLE_FIELDS }),
        row(`${ARTICLE}.find`, { fields: ALL_ARTICLE_FIELDS }),
      ]);
      expect(toPermissionDiff([], next, [], layout).create).toEqual(next);
    });

    it('drops the fields an action cannot set from a Create or Update list', () => {
      const model = toEditorModel(layout, [], []);
      const next = toPermissionRows(
        [
          reported('create', USER, ['email', 'username', 'bio']),
          reported('find', USER, ['email', 'username']),
          reported('update', USER, ['email']),
        ],
        model.settings,
        layout,
        [],
        []
      );

      expect(next).toEqual([
        row(`${USER}.create`, { fields: ['username', 'bio'] }),
        row(`${USER}.find`, { fields: ['email', 'username'] }),
        // Only a field the action cannot set is ticked: nothing is granted
      ]);
    });

    it('gives a row stored with every field the list of the cells left once a cell is unticked', () => {
      const rows = stored([row(`${ARTICLE}.find`, { fields: null })]);
      const model = toEditorModel(layout, rows, []);
      const left = ALL_ARTICLE_FIELDS.filter((path) => path !== 'author');
      const next = toPermissionRows(
        [reported('find', ARTICLE, left)],
        model.settings,
        layout,
        rows,
        model.stale
      );

      expect(next).toEqual([row(`${ARTICLE}.find`, { fields: left })]);
    });

    it('drops a row whose cell was unticked, and ignores what the layout does not know', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: ['title'] }),
        row(`${ARTICLE}.publish`),
      ]);
      const model = toEditorModel(layout, rows, []);
      const next = toPermissionRows(
        [
          reported('find', ARTICLE, ['title']),
          // Not in the layout: no Publish on a Category, no such content type or route
          reported('publish', CATEGORY),
          reported('find', 'api::unknown.unknown', ['x']),
          reported('api::nobody.nobody.find', null),
        ],
        model.settings,
        layout,
        rows,
        model.stale
      );

      expect(next).toEqual([row(`${ARTICLE}.find`, { fields: ['title'] })]);
      expect(toPermissionDiff(rows, next, [], layout).delete).toEqual(['p2']);
    });

    it('stores the is-owner field even with one relation', () => {
      const model = toEditorModel(layout, [], []);
      // The modal sets the only relation, and hides the picker
      const own = settingsFor({
        [ARTICLE]: { conditions: { update: [{ name: IS_OWNER, params: { field: 'author' } }] } },
      });
      const next = toPermissionRows(
        [reported('update', ARTICLE, ['title'])],
        { ...model.settings, ...own },
        layout,
        [],
        model.stale
      );

      expect(next).toEqual([
        row(`${ARTICLE}.update`, { fields: ['title'] }, [
          { name: IS_OWNER, params: { field: 'author' } },
        ]),
      ]);
    });

    it('leaves mixed depths as stored, and writes a picked depth to every row of the type', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: ['title'], populateDepth: 1 }),
        row(`${ARTICLE}.findOne`, { fields: ['title'], populateDepth: 2 }),
        row(`${ARTICLE}.delete`, {}),
        row(`${ARTICLE}.update`, { fields: [] }),
      ]);
      const model = toEditorModel(layout, rows, []);
      const tickCreate = [...model.rows, reported('create', ARTICLE, ['title'])];

      expect(model.settings[ARTICLE].populateDepth).toBe('mixed');

      // Mixed: every row keeps its depth, and a new row is Unlimited
      const asLoaded = toPermissionRows(tickCreate, model.settings, layout, rows, model.stale);

      expect(asLoaded).toEqual([
        row(`${ARTICLE}.find`, { fields: ['title'], populateDepth: 1 }),
        row(`${ARTICLE}.findOne`, { fields: ['title'], populateDepth: 2 }),
        row(`${ARTICLE}.delete`, {}),
        row(`${ARTICLE}.update`, { fields: [] }),
        row(`${ARTICLE}.create`, { fields: ['title'] }),
      ]);

      // Picked: 3 levels for all, the row the editor does not show included
      const picked = toPermissionRows(
        tickCreate,
        { ...model.settings, [ARTICLE]: { ...model.settings[ARTICLE], populateDepth: 3 } },
        layout,
        rows,
        model.stale
      );

      expect(picked.map((permission) => permission.properties.populateDepth)).toEqual([
        3, 3, 3, 3, 3,
      ]);
      expect(picked[3].properties.fields).toEqual([]);

      // Unlimited is written over a depth, and left out of a new row
      const unlimited = toPermissionRows(
        tickCreate,
        { ...model.settings, [ARTICLE]: { ...model.settings[ARTICLE], populateDepth: null } },
        layout,
        rows,
        model.stale
      );

      expect(unlimited[0].properties.populateDepth).toBeNull();
      expect(unlimited[2].properties).toEqual({});
      expect(unlimited[4].properties).toEqual({ fields: ['title'] });
    });

    it('keeps the locales of a changed row, and the subject it was stored with', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: ['title'], locales: null }, [], ARTICLE),
      ]);
      const model = toEditorModel(layout, rows, []);
      const next = toPermissionRows(
        [reported('find', ARTICLE, ['title', 'body'])],
        model.settings,
        layout,
        rows,
        model.stale
      );

      expect(next).toEqual([
        row(`${ARTICLE}.find`, { fields: ['title', 'body'], locales: null }, [], ARTICLE),
      ]);
    });

    it('keeps a condition and its params as the settings hold them, byte for byte', () => {
      const params = { includeDrafts: true, extra: { b: 1, a: [3, 2, 1] } };
      const model = toEditorModel(layout, [], []);
      const next = toPermissionRows(
        [reported('delete', ARTICLE)],
        {
          ...model.settings,
          [ARTICLE]: {
            populateDepth: null,
            conditions: { delete: [{ name: 'api::gated', params }] },
          },
        },
        layout,
        [],
        model.stale
      );

      expect(JSON.stringify(next[0].conditions)).toBe(
        JSON.stringify([{ name: 'api::gated', params }])
      );
    });

    it('treats a route of a plugin or an API as ticked or not', () => {
      const rows = stored([row('plugin::end-users.me.find'), row('api::health.health.check')]);
      const model = toEditorModel(layout, rows, []);

      expect(model.rows).toEqual([
        reported('plugin::end-users.me.find', null),
        reported('api::health.health.check', null),
      ]);

      // The health check is unticked, and a Category is added next to the plugin's route
      const next = toPermissionRows(
        [model.rows[0], reported('find', CATEGORY, ['name'])],
        model.settings,
        layout,
        rows,
        model.stale
      );

      expect(toPermissionDiff(rows, next, [], layout)).toEqual({
        create: [row(`${CATEGORY}.find`, { fields: ['name'] })],
        update: [],
        delete: ['p2'],
      });

      // And ticked from nothing
      expect(
        toPermissionRows(
          [reported('api::health.health.check', null)],
          model.settings,
          layout,
          [],
          model.stale
        )
      ).toEqual([row('api::health.health.check')]);
    });

    it('builds every row of a new role, and needs no stored row', () => {
      const model = toEditorModel(layout, [], []);
      const next = toPermissionRows(
        [reported('find', ARTICLE, ['title']), reported('delete', CATEGORY)],
        model.settings,
        layout,
        [],
        model.stale
      );

      expect(next).toEqual([
        row(`${ARTICLE}.find`, { fields: ['title'] }),
        row(`${CATEGORY}.delete`),
      ]);
      expect(toPermissionDiff([], next, [], layout)).toEqual({ ...EMPTY_DIFF, create: next });
    });
  });

  /* -----------------------------------------------------------------------------------------------
   * toPermissionDiff and sameRow
   * ---------------------------------------------------------------------------------------------*/

  describe('toPermissionDiff', () => {
    it('sends only what changed of a row, with its documentId', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: ['title'], populateDepth: 2 }),
        row(`${ARTICLE}.update`, { fields: ['title'] }),
        row(`${ARTICLE}.delete`),
      ]);
      const next = [
        row(`${ARTICLE}.find`, { fields: ['title', 'body'], populateDepth: 2 }),
        row(`${ARTICLE}.update`, { fields: ['title'] }, [
          { name: IS_OWNER, params: { field: 'author' } },
        ]),
      ];

      expect(toPermissionDiff(rows, next, [], layout)).toEqual({
        create: [],
        update: [
          { documentId: 'p1', properties: { fields: ['title', 'body'], populateDepth: 2 } },
          {
            documentId: 'p2',
            conditions: [{ name: IS_OWNER, params: { field: 'author' } }],
          },
        ],
        delete: ['p3'],
      });
    });

    it('does not send a row that only differs in how it is written', () => {
      const rows = stored([
        row(`${ARTICLE}.find`, { fields: ['title', 'body'] }, [{ name: IS_OWNER }]),
        row(`${ARTICLE}.findOne`, {}, [], ARTICLE),
      ]);
      const next = [
        row(`${ARTICLE}.find`, { fields: ['body', 'title'], populateDepth: null, locales: null }, [
          { name: IS_OWNER, params: {} },
        ]),
        row(`${ARTICLE}.findOne`, { fields: null }),
      ];

      // `locales: null` and `populateDepth: null` were not stored: absent is null, no change
      expect(toPermissionDiff(rows, next, [], layout)).toEqual(EMPTY_DIFF);
    });

    it('creates the rows that are new and never reads a stale row as one of them', () => {
      const rows = stored([row('api::removed.removed.find')]);
      const next = [row(`${CATEGORY}.find`)];

      expect(toPermissionDiff(rows, next, [], layout)).toEqual({
        create: next,
        update: [],
        delete: [],
      });
    });
  });

  describe('sameRow', () => {
    const base = row(`${ARTICLE}.find`, { fields: ['title', 'body'] }, [{ name: IS_OWNER }]);

    it('takes an absent fields, locales and populateDepth for null', () => {
      expect(
        sameRow(
          row(`${ARTICLE}.find`, {}),
          row(`${ARTICLE}.find`, { fields: null, locales: null, populateDepth: null }),
          layout
        )
      ).toBe(true);
      expect(
        sameRow(row(`${ARTICLE}.find`, {}), row(`${ARTICLE}.find`, { fields: [] }), layout)
      ).toBe(false);
      expect(
        sameRow(row(`${ARTICLE}.find`, {}), row(`${ARTICLE}.find`, { populateDepth: 0 }), layout)
      ).toBe(false);
    });

    it('compares lists as sets', () => {
      expect(
        sameRow(
          base,
          row(`${ARTICLE}.find`, { fields: ['body', 'title', 'body'] }, [{ name: IS_OWNER }]),
          layout
        )
      ).toBe(true);
      expect(
        sameRow(base, row(`${ARTICLE}.find`, { fields: ['title'] }, [{ name: IS_OWNER }]), layout)
      ).toBe(false);
      expect(
        sameRow(
          row(`${ARTICLE}.find`, { locales: ['en', 'fr'] }),
          row(`${ARTICLE}.find`, { locales: ['fr', 'en'] }),
          layout
        )
      ).toBe(true);
    });

    it('compares conditions as a set of refs with their declared defaults filled in', () => {
      const one = (conditions: ConditionRef[]) =>
        row(`${ARTICLE}.find`, { fields: ['title'] }, conditions);

      expect(
        sameRow(
          one([{ name: 'api::gated' }]),
          one([{ name: 'api::gated', params: { includeDrafts: false } }]),
          layout
        )
      ).toBe(true);
      expect(
        sameRow(
          one([{ name: 'api::gated' }]),
          one([{ name: 'api::gated', params: { includeDrafts: true } }]),
          layout
        )
      ).toBe(false);
      expect(
        sameRow(
          one([{ name: IS_OWNER, params: { field: 'author' } }, { name: 'api::gated' }]),
          one([
            { name: 'api::gated', params: {} },
            { name: IS_OWNER, params: { field: 'author' } },
          ]),
          layout
        )
      ).toBe(true);
      // No declared default for `field`: a missing param is not the one that is set
      expect(
        sameRow(
          one([{ name: IS_OWNER }]),
          one([{ name: IS_OWNER, params: { field: 'author' } }]),
          layout
        )
      ).toBe(false);
      // Params in another order are the same params
      expect(
        sameRow(
          one([{ name: 'api::unknown', params: { a: 1, b: { c: 2, d: 3 } } }]),
          one([{ name: 'api::unknown', params: { b: { d: 3, c: 2 }, a: 1 } }]),
          layout
        )
      ).toBe(true);
    });

    it('takes a row with no subject for one on the content type of its action', () => {
      expect(
        sameRow(
          row(`${ARTICLE}.find`, {}, [], null),
          row(`${ARTICLE}.find`, {}, [], ARTICLE),
          layout
        )
      ).toBe(true);
      expect(
        sameRow(
          row(`${ARTICLE}.find`, {}, [], null),
          row(`${ARTICLE}.find`, {}, [], CATEGORY),
          layout
        )
      ).toBe(false);
      expect(sameRow(row(`${ARTICLE}.find`), row(`${ARTICLE}.findOne`), layout)).toBe(false);
    });
  });

  /* -----------------------------------------------------------------------------------------------
   * describeChanges
   * ---------------------------------------------------------------------------------------------*/

  describe('describeChanges', () => {
    const snapshot = (rows: PermissionRow[], extra = {}) => ({
      name: 'Premium member',
      description: null,
      requireTwoFactor: false,
      rows,
      ...extra,
    });

    it('gives nothing for a role that did not change', () => {
      expect(
        describeChanges(snapshot(SEED_AUTHENTICATED), snapshot(SEED_AUTHENTICATED), layout)
      ).toEqual([]);
    });

    it('describes changes by content type', () => {
      const before = snapshot([
        row(`${ARTICLE}.findOne`, { fields: ['title'], populateDepth: 1 }),
        row(`${ARTICLE}.update`, { fields: ['title'], populateDepth: 1 }),
        row(`${ARTICLE}.delete`, { populateDepth: 1 }),
      ]);
      const after = snapshot([
        row(`${ARTICLE}.find`, { fields: ['title'], populateDepth: 3 }),
        row(`${ARTICLE}.findOne`, { fields: null, populateDepth: 3 }),
        row(`${ARTICLE}.update`, { fields: ['title', 'body'], populateDepth: 3 }, [
          { name: IS_OWNER, params: { field: 'author' } },
        ]),
        row(`${ARTICLE}.delete`, { populateDepth: 3 }),
        row('plugin::end-users.me.find'),
      ]);

      expect(describeChanges(before, after, layout)).toEqual([
        {
          group: 'Article',
          changes: [
            { label: 'Find', from: 'Not granted', to: 'Granted' },
            { label: 'Find fields', added: ['title'] },
            { label: 'Find one fields', from: 'title', to: 'every field, including future ones' },
            { label: 'Update fields', added: ['body'] },
            { label: 'Update conditions', added: ['Is owner (field: author)'] },
            { label: 'Populate depth', from: '1 level', to: '3 levels' },
          ],
        },
        {
          group: 'End users',
          changes: [{ label: 'Find · GET /api/users/me', from: 'Not granted', to: 'Granted' }],
        },
      ]);
    });

    it('writes a role that gets every field after a list, and the reverse', () => {
      const listed = snapshot([row(`${ARTICLE}.find`, { fields: ['title', 'body'] })]);
      const all = snapshot([row(`${ARTICLE}.find`)]);

      expect(describeChanges(listed, all, layout)).toEqual([
        {
          group: 'Article',
          changes: [
            { label: 'Find fields', from: 'body, title', to: 'every field, including future ones' },
          ],
        },
      ]);
      expect(describeChanges(all, listed, layout)[0].changes).toEqual([
        { label: 'Find fields', from: 'every field, including future ones', to: 'body, title' },
      ]);
      // No row, or an empty list, is no field: granting names what is added
      expect(describeChanges(snapshot([]), listed, layout)[0].changes).toEqual([
        { label: 'Find', from: 'Not granted', to: 'Granted' },
        { label: 'Find fields', added: ['body', 'title'] },
      ]);
    });

    it('lists the role itself first, and a removed row as not granted', () => {
      const before = snapshot([row(`${CATEGORY}.find`, { fields: ['name'] })], {
        description: 'Old',
      });
      const after = snapshot([], { name: 'Premium', description: null, requireTwoFactor: true });

      expect(describeChanges(before, after, layout)).toEqual([
        {
          group: 'Role',
          changes: [
            { label: 'Name', from: 'Premium member', to: 'Premium' },
            { label: 'Description', from: 'Old', to: '—' },
            { label: 'Require two-factor authentication', from: 'Off', to: 'On' },
          ],
        },
        {
          group: 'Category',
          changes: [
            { label: 'Find', from: 'Granted', to: 'Not granted' },
            { label: 'Find fields', removed: ['name'] },
          ],
        },
      ]);
    });

    it('shows a row with no fields as not granted, and compares a changed condition by its params', () => {
      const listed = (conditions: ConditionRef[]) =>
        snapshot([
          row(`${ARTICLE}.find`, { fields: [] }),
          row(`${ARTICLE}.update`, { fields: ['title'] }, conditions),
        ]);

      expect(
        describeChanges(
          listed([{ name: IS_OWNER, params: { field: 'author' } }]),
          listed([{ name: IS_OWNER, params: { field: 'editor' } }]),
          layout
        )
      ).toEqual([
        {
          group: 'Article',
          changes: [
            {
              label: 'Update conditions',
              added: ['Is owner (field: editor)'],
              removed: ['Is owner (field: author)'],
            },
          ],
        },
      ]);
      // A row that lists no field is not a grant, on either side
      expect(
        describeChanges(snapshot([]), snapshot([row(`${ARTICLE}.find`, { fields: [] })]), layout)
      ).toEqual([]);
    });

    it('names a condition it does not know by its name', () => {
      const out = describeChanges(
        snapshot([row(`${ARTICLE}.delete`)]),
        snapshot([row(`${ARTICLE}.delete`, {}, [{ name: 'api::legacy' }])]),
        layout
      );

      expect(out[0].changes).toEqual([{ label: 'Delete conditions', added: ['api::legacy'] }]);
    });

    it('leaves the depth out when a type has no row on a side', () => {
      const out = describeChanges(
        snapshot([]),
        snapshot([row(`${CATEGORY}.find`, { fields: ['name'], populateDepth: 2 })]),
        layout
      );

      expect(out[0].changes.map(({ label }) => label)).toEqual(['Find', 'Find fields']);
    });

    it('says Mixed for rows that differ, and tells the types apart when two share a label', () => {
      const twin = {
        ...layout,
        contentTypes: [
          layout.contentTypes[0],
          {
            ...layout.contentTypes[1],
            uid: 'api::item.item',
            label: 'Article',
            actions: actionsOf('api::item.item', ['find']),
          },
        ],
      };
      const out = describeChanges(
        snapshot([
          row(`${ARTICLE}.find`, { fields: ['title'], populateDepth: 1 }),
          row(`${ARTICLE}.findOne`, { fields: ['title'], populateDepth: 2 }),
        ]),
        snapshot([
          row(`${ARTICLE}.find`, { fields: ['title'], populateDepth: 1 }),
          row(`${ARTICLE}.findOne`, { fields: ['title'], populateDepth: 1 }),
          row('api::item.item.find', { fields: ['name'] }),
        ]),
        twin
      );

      expect(out.map(({ group }) => group)).toEqual([
        'Article (api::article.article)',
        'Article (api::item.item)',
      ]);
      expect(out[0].changes).toEqual([{ label: 'Populate depth', from: 'Mixed', to: '1 level' }]);
    });
  });
});
