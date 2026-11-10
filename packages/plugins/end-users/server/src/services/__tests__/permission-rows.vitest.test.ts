import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core, Modules } from '@strapi/types';

import type {
  BuilderConditionV2,
  BuilderInput,
  EntryCheck,
  EntryGroup,
} from '../../../../shared/builder/types';
import { isOwner, isSelf, ownerField } from '../../conditions';
import { PERMISSION_UID, PROFILE_UID, ROLE_UID, USER_UID } from '../../constants';
import { ALWAYS_ALLOWED_SCOPES } from '../../strategies/end-users';
import { builderRecordsOf } from '../../utils/builder/registry';
import type { PermissionRow } from '../../utils/permission-row';
import permissionService from '../permission';
import { appliesTo } from './utils/applies-to';
import { createTransaction } from '../../__tests__/utils/fake-strapi';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;

/** Draft & publish, a component, one relation to the end user */
const ARTICLE_UID = 'api::article.article';
/** Draft & publish, no relation to the end user */
const TAG_UID = 'api::tag.tag';
/** No draft & publish, one relation to the end user */
const NOTE_UID = 'api::note.note';
/** Two relations to the end user: the owner can't be guessed */
const REVIEW_UID = 'api::review.review';
const SEO_UID = 'shared.seo';
const OG_UID = 'shared.og';

const relation = (target: string, extra: Record<string, unknown> = {}) => ({
  type: 'relation',
  relation: 'manyToOne',
  target,
  ...extra,
});

/** What `strapi.contentType(uid)` gives */
const CONTENT_TYPES: Record<string, { uid: string; attributes: Record<string, unknown> }> = {
  [ARTICLE_UID]: {
    uid: ARTICLE_UID,
    attributes: {
      title: { type: 'string' },
      body: { type: 'text' },
      seo: { type: 'component', repeatable: false, component: SEO_UID },
      blocks: { type: 'dynamiczone', components: [SEO_UID] },
      author: relation(USER_UID, { relation: 'oneToOne' }),
      tags: relation(TAG_UID, { relation: 'oneToMany' }),
    },
  },
  [TAG_UID]: { uid: TAG_UID, attributes: { name: { type: 'string' } } },
  [NOTE_UID]: {
    uid: NOTE_UID,
    attributes: { title: { type: 'string' }, owner: relation(USER_UID, { relation: 'oneToOne' }) },
  },
  [REVIEW_UID]: {
    uid: REVIEW_UID,
    attributes: {
      body: { type: 'text' },
      score: { type: 'integer' },
      author: relation(USER_UID),
      reviewers: relation(USER_UID, { relation: 'manyToMany' }),
    },
  },
  [USER_UID]: {
    uid: USER_UID,
    attributes: {
      email: { type: 'email' },
      username: { type: 'string' },
      roles: relation(ROLE_UID, { relation: 'manyToMany' }),
    },
  },
  [PROFILE_UID]: {
    uid: PROFILE_UID,
    attributes: { user: relation(USER_UID, { relation: 'oneToOne' }) },
  },
};

/** What `strapi.getModel(uid)` gives for a component */
const COMPONENTS: Record<string, { uid: string; attributes: Record<string, unknown> }> = {
  [SEO_UID]: {
    uid: SEO_UID,
    attributes: {
      metaTitle: { type: 'string' },
      og: { type: 'component', repeatable: false, component: OG_UID },
    },
  },
  [OG_UID]: { uid: OG_UID, attributes: { title: { type: 'string' } } },
};

/** Route actions: what `providers.action` holds */
const ACTIONS = new Set<string>([
  `${ARTICLE_UID}.find`,
  `${ARTICLE_UID}.findOne`,
  `${ARTICLE_UID}.create`,
  `${TAG_UID}.find`,
  `${NOTE_UID}.find`,
  `${NOTE_UID}.update`,
  `${REVIEW_UID}.find`,
  `${USER_UID}.update`,
  `${PROFILE_UID}.find`,
  'plugin::end-users.me.find',
  ...ALWAYS_ALLOWED_SCOPES,
]);

/** `read-drafts` and `publish` of the draft & publish types: what `providers.syntheticAction` holds */
const SYNTHETIC_ACTIONS = new Set<string>([
  `${ARTICLE_UID}.publish`,
  `${ARTICLE_UID}.read-drafts`,
  `${TAG_UID}.publish`,
  `${TAG_UID}.read-drafts`,
]);

/** A project condition on reviews only, with a required number */
const minScore = {
  name: 'api::min-score',
  displayName: 'Min score',
  subjects: [REVIEW_UID],
  params: { min: { type: 'number', required: true } },
  query: { score: { $gte: '$params.min' } },
} satisfies ContentApiConditionDefinition;

/** A project condition on any type, naming one of its attributes */
const flagged = {
  name: 'api::flagged',
  displayName: 'Flagged',
  params: {
    field: { type: 'attribute', required: true },
    value: { type: 'boolean', default: true },
  },
  query: () => true,
} satisfies ContentApiConditionDefinition;

/**
 * Conditions whose `subjects` function is broken: it throws, or it is async. Core reads either as a
 * condition that applies to no type, and `checkRows` has to as well.
 */
const throwingSubjects = {
  name: 'api::throwing-subjects',
  displayName: 'Throwing subjects',
  subjects() {
    throw new Error('subjects exploded');
  },
  query: () => true,
} satisfies ContentApiConditionDefinition;

const asyncSubjects = {
  name: 'api::async-subjects',
  displayName: 'Async subjects',
  subjects: (async () => true) as unknown as (uid: string) => boolean,
  query: () => true,
} satisfies ContentApiConditionDefinition;

/** A builder condition as the loader registers it: its definition, and the file as version 2 */
const builderCondition = (
  slug: string,
  input: BuilderInput,
  which: EntryGroup
): { definition: ContentApiConditionDefinition; file: BuilderConditionV2 } => ({
  definition: {
    name: `api::${slug}`,
    displayName: slug,
    source: 'builder',
    params: {
      by: {
        type: 'attribute',
        ...(typeof input.accepts === 'object' && { relationTarget: input.accepts.relation }),
      },
    },
    query: () => true,
  },
  file: {
    version: 2,
    slug,
    displayName: slug,
    appliesTo: { kind: 'all' },
    inputs: [input],
    who: { match: 'all', checks: [] },
    which,
    onSave: { stamp: [], locked: [] },
  },
});

const byCheck = (operator: string): EntryCheck => ({
  kind: 'check',
  target: { input: 'by' },
  operator,
  value: { kind: 'fixed', value: 'x' },
});
const group = (match: 'all' | 'any' | 'none', ...items: EntryGroup['items']): EntryGroup => ({
  kind: 'group',
  match,
  items,
});
const FIELD = { name: 'by', kind: 'field', required: false } as const;
const USER = { relation: USER_UID };

const BUILDER = [
  // Takes a number field
  builderCondition('by-number', { ...FIELD, accepts: 'number' }, group('all', byCheck('$gte'))),
  // Takes a relation to the end user, and only says "is"
  builderCondition('is-by', { ...FIELD, accepts: USER }, group('all', byCheck('$eq'))),
  // The same, negated by its operator, and by a `none` group around a check that isn't negating
  builderCondition('not-by', { ...FIELD, accepts: USER }, group('all', byCheck('$ne'))),
  builderCondition(
    'none-by',
    { ...FIELD, accepts: USER },
    group('all', group('none', byCheck('$eq')))
  ),
];

const CONDITIONS: ContentApiConditionDefinition[] = [
  isSelf,
  isOwner,
  minScore,
  flagged,
  throwingSubjects,
  asyncSubjects,
  ...BUILDER.map(({ definition }) => definition),
];

const row = (action: string, extra: Partial<PermissionRow> = {}): PermissionRow => ({
  action,
  subject: null,
  properties: {},
  conditions: [],
  ...extra,
});

const OWNER = isOwner.name;

/**
 * A fake of what `checkRows` and `applyDiff` reach for. Its `subjectOf` is core's: the text before
 * the action's last `.`, when `strapi.contentType` knows that uid. The condition provider's `get`
 * gives the registered definition by name, as core's does.
 */
const setup = () => {
  const permissions = {
    findMany: vi.fn(async () => [] as Array<Record<string, unknown>>),
    createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    update: vi.fn(async () => ({ id: 1 })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };
  const roles = { findOne: vi.fn(async () => ({ id: 7 })) };
  const query = vi.fn((uid: string) => (uid === PERMISSION_UID ? permissions : roles));
  const { transaction } = createTransaction();
  const plugin = vi.fn(() => ({ service: () => ({ invalidate() {} }) }));

  const contentType = (uid: string) => CONTENT_TYPES[uid];
  const getModel = (uid: string) => CONTENT_TYPES[uid] ?? COMPONENTS[uid];

  const subjectOf = (action: string) => {
    const end = action.lastIndexOf('.');
    const uid = end > 0 ? action.slice(0, end) : null;

    return uid !== null && contentType(uid)?.uid === uid ? uid : null;
  };

  const definitions = new Map(CONDITIONS.map((definition) => [definition.name, definition]));
  const condition = {
    get(ref: string | { name: string; params?: Record<string, unknown> }) {
      const { name, params } = typeof ref === 'string' ? { name: ref, params: {} } : ref;
      const definition = definitions.get(name);

      return definition && { name, definition, params: { ...params } };
    },
  };

  const strapi = {
    contentType,
    getModel,
    db: { query, transaction },
    plugin,
    contentAPI: {
      permissions: {
        subjectOf,
        conditions: { appliesTo },
        providers: {
          action: { has: (key: string) => ACTIONS.has(key) },
          syntheticAction: { has: (key: string) => SYNTHETIC_ACTIONS.has(key) },
          condition,
        },
      },
    },
  } as unknown as Core.Strapi;

  for (const { definition, file } of BUILDER) {
    builderRecordsOf(strapi).set(definition.name, { condition: file, stale: [] });
  }

  // `relationsToUser` (what `is-owner` and the role checks share) reads the global
  vi.stubGlobal('strapi', strapi);

  return { permission: permissionService({ strapi }), permissions, transaction };
};

describe('permission rows the engine can trust', () => {
  let permission: ReturnType<typeof setup>['permission'];

  beforeEach(() => {
    ({ permission } = setup());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** The refusal of `rows`, which must name permission `n` and its `key` */
  const refusalOf = (rows: PermissionRow[], n: number, key: string) => {
    let thrown: unknown;

    try {
      permission.checkRows(rows);
    } catch (error) {
      thrown = error;
    }

    expect(thrown, JSON.stringify(rows[n])).toMatchObject({
      name: 'ValidationError',
      message: expect.stringMatching(
        new RegExp(
          `^Permission ${n} \\(${rows[n].action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\): `
        )
      ),
      details: { errors: [expect.objectContaining({ path: ['permissions', n, key] })] },
    });

    return (thrown as Error).message;
  };

  const accepts = (rows: PermissionRow[]) => {
    expect(() => permission.checkRows(rows), JSON.stringify(rows)).not.toThrow();
  };

  describe('findProblems', () => {
    it('lists every row that breaks a rule, with its place, action, part and reason', () => {
      const rows = [
        row('plugin::end-users.me.find'),
        row('api::nope.nope.find'),
        row(`${ARTICLE_UID}.find`, { properties: { fields: ['title', 'gone'] } }),
        row(`${NOTE_UID}.update`, { conditions: [{ name: 'api::removed' }] }),
      ];

      expect(permission.findProblems(rows)).toEqual([
        {
          index: 1,
          action: 'api::nope.nope.find',
          key: 'action',
          reason: expect.stringMatching(/no Content API route or synthetic action/),
        },
        {
          index: 2,
          action: `${ARTICLE_UID}.find`,
          key: 'properties',
          reason: expect.stringContaining('"gone"'),
        },
        {
          index: 3,
          action: `${NOTE_UID}.update`,
          key: 'conditions',
          reason: '"api::removed" is not a registered condition',
        },
      ]);
    });

    it('lists a row once, for the first rule it breaks', () => {
      // Its action is unknown and its field is not an attribute: the action comes first
      const problems = permission.findProblems([
        row('api::nope.nope.find', { properties: { fields: ['nope'] } }),
      ]);

      expect(problems).toHaveLength(1);
      expect(problems[0].key).toBe('action');
    });

    it('lists none for rows the engine can trust, and for no rows', () => {
      expect(permission.findProblems([])).toEqual([]);
      expect(
        permission.findProblems([
          row(`${ARTICLE_UID}.find`, { properties: { fields: ['title', 'seo.metaTitle'] } }),
        ])
      ).toEqual([]);
    });

    it('does not throw for a row it finds a problem with, which is what a stored row can be', () => {
      expect(() =>
        permission.findProblems([row('api::nope.nope.find'), row('plugin::end-users.me.find')])
      ).not.toThrow();
    });

    it('is the list checkRows throws the first entry of', () => {
      const rows = [
        row('plugin::end-users.me.find'),
        row('api::nope.a.find'),
        row('api::nope.b.find'),
      ];
      const [first] = permission.findProblems(rows);

      expect(first.index).toBe(1);
      expect(() => permission.checkRows(rows)).toThrow(
        expect.objectContaining({
          message: `Permission ${first.index} (${first.action}): ${first.reason}`,
        })
      );
    });
  });

  describe('checkRows', () => {
    it('accepts the rows the role editor writes', () => {
      accepts([
        row('plugin::end-users.me.find'),
        row(`${ARTICLE_UID}.find`, { properties: { fields: ['title', 'seo'], populateDepth: 2 } }),
        row(`${ARTICLE_UID}.findOne`, { subject: ARTICLE_UID }),
        row(`${NOTE_UID}.update`, { conditions: [{ name: OWNER, params: { field: 'owner' } }] }),
        row(`${USER_UID}.update`, { subject: USER_UID, conditions: [{ name: isSelf.name }] }),
        row(`${PROFILE_UID}.find`, { conditions: [{ name: OWNER, params: { field: 'user' } }] }),
      ]);
    });

    it('refuses an imported row whose action no route or synthetic action has', () => {
      const message = refusalOf([row('api::nope.nope.find')], 0, 'action');

      expect(message).toMatch(/no Content API route or synthetic action/);
    });

    it('names the first row that breaks a rule, by its place in the list', () => {
      refusalOf([row('plugin::end-users.me.find'), row('api::nope.nope.find')], 1, 'action');
    });

    it('carries the refusal as a path a front end can point at', () => {
      expect(() => permission.checkRows([row('api::nope.nope.find')])).toThrow(
        expect.objectContaining({
          details: {
            errors: [
              {
                path: ['permissions', 0, 'action'],
                message: expect.stringContaining('Permission 0 (api::nope.nope.find)'),
                name: 'ValidationError',
              },
            ],
          },
        })
      );
    });

    it('refuses an action every caller has without a grant', () => {
      for (const action of ALWAYS_ALLOWED_SCOPES) {
        expect(refusalOf([row(action)], 0, 'action')).toMatch(/always allowed/);
      }
    });

    it("refuses a subject that is not the action's content type", () => {
      expect(refusalOf([row(`${ARTICLE_UID}.find`, { subject: TAG_UID })], 0, 'subject')).toContain(
        ARTICLE_UID
      );
      refusalOf([row('plugin::end-users.me.find', { subject: NOTE_UID })], 0, 'subject');

      accepts([row(`${ARTICLE_UID}.find`, { subject: ARTICLE_UID })]);
      accepts([row(`${ARTICLE_UID}.find`, { subject: null })]);
    });

    it('refuses a field the subject does not have and accepts a component sub-path', () => {
      const fields = (list: string[], subject: string | null = null) =>
        row(`${ARTICLE_UID}.find`, { subject, properties: { fields: list } });

      expect(refusalOf([fields(['title', 'nope'])], 0, 'properties')).toContain('"nope"');
      // A sub-path goes through components only: not a scalar, a relation or a dynamic zone
      refusalOf([fields(['title.length'])], 0, 'properties');
      refusalOf([fields(['author.email'])], 0, 'properties');
      refusalOf([fields(['blocks.metaTitle'])], 0, 'properties');
      refusalOf([fields(['seo.nope'])], 0, 'properties');
      refusalOf([fields(['seo.og.nope'])], 0, 'properties');
      refusalOf([fields(['seo.'])], 0, 'properties');
      refusalOf([fields([''])], 0, 'properties');
      // The id and documentId are always there, and no field list names them
      refusalOf([fields(['documentId'])], 0, 'properties');
      // A key the registry finds on Object.prototype is not an attribute
      refusalOf([fields(['constructor'])], 0, 'properties');

      accepts([fields(['seo.metaTitle'])]);
      accepts([fields(['seo.og.title', 'seo', 'author', 'tags', 'blocks'], ARTICLE_UID)]);
      accepts([fields([])]);
      accepts([row(`${ARTICLE_UID}.find`, { properties: { fields: null } })]);
    });

    it('refuses a populateDepth that is not a non-negative integer', () => {
      for (const populateDepth of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        refusalOf([row(`${ARTICLE_UID}.find`, { properties: { populateDepth } })], 0, 'properties');
      }

      for (const populateDepth of [0, 3, null]) {
        accepts([row(`${ARTICLE_UID}.find`, { properties: { populateDepth } })]);
      }
    });

    it('refuses fields or conditions on a route-only row', () => {
      const action = 'plugin::end-users.me.find';

      expect(refusalOf([row(action, { properties: { fields: ['x'] } })], 0, 'properties')).toMatch(
        /no content type/
      );
      refusalOf([row(action, { conditions: [{ name: isSelf.name }] })], 0, 'conditions');

      accepts([row(action, { properties: { fields: null } })]);
      accepts([row(action, { properties: { fields: [] } })]);
    });

    it('refuses an unregistered condition and is-owner on a type with no relation to the user', () => {
      expect(
        refusalOf(
          [row(`${NOTE_UID}.find`, { conditions: [{ name: 'api::nope' }] })],
          0,
          'conditions'
        )
      ).toMatch(/"api::nope" is not a registered condition/);
      expect(
        refusalOf([row(`${TAG_UID}.find`, { conditions: [{ name: OWNER }] })], 0, 'conditions')
      ).toMatch(new RegExp(`does not apply to ${TAG_UID}`));
      refusalOf(
        [row(`${NOTE_UID}.find`, { conditions: [{ name: isSelf.name }] })],
        0,
        'conditions'
      );
    });

    it('requires field on is-owner when the subject has two user relations and accepts it with field naming one', () => {
      const owned = (uid: string, params?: Record<string, unknown>) =>
        row(`${uid}.find`, { conditions: [{ name: OWNER, ...(params && { params }) }] });

      expect(refusalOf([owned(REVIEW_UID)], 0, 'conditions')).toMatch(
        /needs "field".*2 relations to plugin::end-users\.user \(author, reviewers\)/
      );
      refusalOf([owned(REVIEW_UID, { field: null })], 0, 'conditions');
      refusalOf([owned(REVIEW_UID, { field: 'body' })], 0, 'conditions');
      refusalOf([owned(REVIEW_UID, { field: 'nope' })], 0, 'conditions');
      refusalOf([owned(REVIEW_UID, { field: 42 })], 0, 'conditions');
      refusalOf([owned(NOTE_UID, { field: 'title' })], 0, 'conditions');
      refusalOf([owned(REVIEW_UID, { field: 'author', setOnCreate: 'yes' })], 0, 'conditions');

      accepts([owned(REVIEW_UID, { field: 'author' })]);
      accepts([owned(REVIEW_UID, { field: 'reviewers', setOnCreate: false })]);
      accepts([owned(NOTE_UID)]);
      accepts([owned(NOTE_UID, { field: 'owner' })]);
    });

    // A project condition keeps its own undeclared params (`$params.<name>`). A built-in
    // reads only the ones it declares, so a param it doesn't know is a typo that does nothing: with
    // one user relation, `{ feild: 'author' }` would quietly take that relation
    it('refuses a param a built-in condition does not declare, with the ones it does', () => {
      const owned = (uid: string, params?: Record<string, unknown>) =>
        row(`${uid}.find`, { conditions: [{ name: OWNER, ...(params && { params }) }] });
      const self = (params?: Record<string, unknown>) =>
        row(`${USER_UID}.update`, {
          conditions: [{ name: isSelf.name, ...(params && { params }) }],
        });

      expect(refusalOf([owned(NOTE_UID, { feild: 'owner' })], 0, 'conditions')).toMatch(
        /plugin::end-users\.is-owner" takes only field, setOnCreate, not "feild"/
      );
      refusalOf([owned(NOTE_UID, { field: 'owner', extra: 1 })], 0, 'conditions');
      refusalOf([owned(NOTE_UID, { setOnCreate: true, other: null })], 0, 'conditions');
      // The typo is what the message names, not the field it left out
      expect(refusalOf([owned(REVIEW_UID, { feild: 'author' })], 0, 'conditions')).toContain(
        '"feild"'
      );
      expect(refusalOf([self({ field: 'x' })], 0, 'conditions')).toMatch(
        /plugin::end-users\.is-self" takes no params, not "field"/
      );
      // Whichever condition of the row it is on
      refusalOf(
        [
          row(`${NOTE_UID}.find`, {
            conditions: [{ name: OWNER }, { name: OWNER, params: { nope: 1 } }],
          }),
        ],
        0,
        'conditions'
      );

      accepts([owned(NOTE_UID), owned(NOTE_UID, {}), owned(NOTE_UID, { field: 'owner' })]);
      accepts([owned(NOTE_UID, { field: 'owner', setOnCreate: false })]);
      accepts([self(), self({})]);
    });

    it('reads a subjects function that throws or is async as core does: the condition applies to nothing', () => {
      for (const { name } of [throwingSubjects, asyncSubjects]) {
        expect(
          refusalOf([row(`${NOTE_UID}.find`, { conditions: [{ name }] })], 0, 'conditions'),
          name
        ).toContain(`the condition "${name}" does not apply to ${NOTE_UID}`);
      }
    });

    it('keeps accepting undeclared params on a project condition', () => {
      accepts([
        row(`${REVIEW_UID}.find`, {
          conditions: [{ name: minScore.name, params: { min: 3, extra: 'read as $params.extra' } }],
        }),
        row(`${NOTE_UID}.find`, {
          conditions: [{ name: flagged.name, params: { field: 'title', note: 'kept' } }],
        }),
      ]);
    });

    it("accepts is-owner exactly when the condition's own ownerField names a field", () => {
      const { checkRows } = permission;
      const isAccepted = (rows: PermissionRow[]) => {
        try {
          checkRows(rows);

          return true;
        } catch {
          return false;
        }
      };

      for (const uid of [NOTE_UID, REVIEW_UID, ARTICLE_UID, PROFILE_UID]) {
        for (const params of [{}, { field: 'author' }, { field: 'owner' }, { field: 'user' }]) {
          const accepted = isAccepted([
            row(`${uid}.find`, { conditions: [{ name: OWNER, params }] }),
          ]);

          expect(accepted, `${uid} ${JSON.stringify(params)}`).toBe(
            ownerField(uid, params) !== undefined
          );
        }
      }
    });

    it('checks the declared params of any condition: required, typed, and attributes of the subject', () => {
      const scored = (params?: Record<string, unknown>) =>
        row(`${REVIEW_UID}.find`, {
          conditions: [{ name: minScore.name, ...(params && { params }) }],
        });
      const flaggedOn = (params?: Record<string, unknown>) =>
        row(`${NOTE_UID}.find`, {
          conditions: [{ name: flagged.name, ...(params && { params }) }],
        });

      expect(refusalOf([scored()], 0, 'conditions')).toMatch(/needs "min"/);
      expect(refusalOf([scored({ min: '3' })], 0, 'conditions')).toMatch(/"min" is a number/);
      refusalOf(
        [row(`${NOTE_UID}.find`, { conditions: [{ name: minScore.name, params: { min: 3 } }] })],
        0,
        'conditions'
      );
      refusalOf([flaggedOn()], 0, 'conditions');
      refusalOf([flaggedOn({ field: 'nope' })], 0, 'conditions');
      refusalOf([flaggedOn({ field: 'title', value: 'yes' })], 0, 'conditions');

      accepts([scored({ min: 3 })]);
      accepts([flaggedOn({ field: 'title' })]);
      // A param the definition doesn't declare is the condition's own business ($params.<name>)
      accepts([flaggedOn({ field: 'owner', extra: 'kept' })]);
    });

    it('checks every condition of a row, and names the row', () => {
      const message = refusalOf(
        [
          row(`${NOTE_UID}.find`),
          row(`${NOTE_UID}.update`, {
            conditions: [{ name: OWNER }, { name: 'api::nope' }],
          }),
        ],
        1,
        'conditions'
      );

      expect(message).toContain('api::nope');
    });

    it('accepts read-drafts and publish on a draft-and-publish type only', () => {
      accepts([row(`${TAG_UID}.publish`), row(`${TAG_UID}.read-drafts`, { subject: TAG_UID })]);
      accepts([
        row(`${ARTICLE_UID}.read-drafts`, {
          properties: { fields: ['title', 'seo.metaTitle'] },
          conditions: [{ name: OWNER }],
        }),
      ]);

      refusalOf([row(`${NOTE_UID}.publish`)], 0, 'action');
      refusalOf([row(`${NOTE_UID}.read-drafts`, { subject: NOTE_UID })], 0, 'action');
    });

    it('checks nothing it is not given: an empty list is fine', () => {
      accepts([]);
    });
  });

  describe('a builder condition`s field input', () => {
    const bound = (condition: string, field: string, uid = REVIEW_UID) =>
      row(`${uid}.find`, { conditions: [{ name: `api::${condition}`, params: { by: field } }] });

    it('takes a field of the kind the input accepts, and refuses another kind, naming the type and the field', () => {
      accepts([bound('by-number', 'score')]);

      const message = refusalOf([bound('by-number', 'body')], 0, 'conditions');

      expect(message).toMatch(/"by" takes a number field/);
      expect(message).toMatch(/"body" is a text field of api::review\.review/);
    });

    it('takes a to-many relation when the condition does not negate it', () => {
      accepts([bound('is-by', 'reviewers'), bound('is-by', 'author', REVIEW_UID)]);
    });

    it.each([
      ['a negating operator', 'not-by'],
      ['a none group', 'none-by'],
    ])('refuses a to-many relation under %s, naming the field and the input', (_, condition) => {
      const message = refusalOf([bound(condition, 'reviewers')], 0, 'conditions');

      expect(message).toMatch(/"by"/);
      expect(message).toMatch(/reviewers/);
      expect(message).toMatch(/to-many relation/);
    });

    it.each(['not-by', 'none-by'])('takes a to-one relation under %s', (condition) => {
      accepts([bound(condition, 'author')]);
    });
  });

  describe('a row that binds a param the builder condition no longer declares', () => {
    it('is saved without it, and a condition that is not a builder`s keeps its params', async () => {
      const { permission: service, permissions } = setup();

      await service.applyDiff('role-1', {
        create: [
          row(`${REVIEW_UID}.find`, {
            conditions: [
              { name: 'api::by-number', params: { by: 'score', gone: 'x' } },
              { name: 'api::is-by', params: { gone: 1 } },
              { name: minScore.name, params: { min: 1, extra: 2 } },
              { name: 'api::unregistered', params: { any: 1 } },
            ],
          }),
        ],
        update: [
          {
            documentId: 'p1',
            conditions: [{ name: 'api::by-number', params: { by: 'score', gone: 'x' } }],
          },
          { documentId: 'p2', action: `${REVIEW_UID}.find` },
        ],
        delete: [],
      });

      const [[{ data }]] = permissions.createMany.mock.calls as unknown as [
        [{ data: Array<{ conditions: unknown }> }],
      ];

      expect(data[0].conditions).toEqual([
        { name: 'api::by-number', params: { by: 'score' } },
        { name: 'api::is-by' },
        { name: minScore.name, params: { min: 1, extra: 2 } },
        { name: 'api::unregistered', params: { any: 1 } },
      ]);
      expect(permissions.update).toHaveBeenCalledWith({
        where: { role: { id: 7 }, documentId: 'p1' },
        data: { conditions: [{ name: 'api::by-number', params: { by: 'score' } }] },
      });
      // A change that does not touch the conditions is as it was
      expect(permissions.update).toHaveBeenCalledWith({
        where: { role: { id: 7 }, documentId: 'p2' },
        data: { action: `${REVIEW_UID}.find` },
      });
    });
  });

  describe('a role has one permission per action on its content type', () => {
    it('treats (find, null) and (find, api::note.note) as the same permission', async () => {
      const { permission: service, transaction } = setup();

      await expect(
        service.applyDiff('role-1', {
          create: [row(`${NOTE_UID}.find`), row(`${NOTE_UID}.find`, { subject: NOTE_UID })],
          update: [],
          delete: [],
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringMatching(/"api::note\.note\.find" on "api::note\.note"/),
      });
      expect(transaction).not.toHaveBeenCalled();
    });

    it('treats them as the same after the writes too, when a new row meets a stored one', async () => {
      const { permission: service, permissions, transaction } = setup();

      permissions.findMany.mockResolvedValueOnce([
        { id: 1, action: `${NOTE_UID}.find`, subject: null },
        { id: 2, action: `${NOTE_UID}.find`, subject: NOTE_UID },
      ]);

      await expect(
        service.applyDiff('role-1', {
          create: [row(`${NOTE_UID}.find`, { subject: NOTE_UID })],
          update: [],
          delete: [],
        })
      ).rejects.toMatchObject({ name: 'ValidationError' });
      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('keeps route-only rows and rows under another content type apart', async () => {
      const { permission: service } = setup();

      await expect(
        service.applyDiff('role-1', {
          create: [
            row('plugin::end-users.me.find'),
            row(`${NOTE_UID}.find`),
            // Stored under another type: held, and denying there, but not the same row
            row(`${NOTE_UID}.find`, { subject: TAG_UID }),
          ],
          update: [],
          delete: [],
        })
      ).resolves.toBeUndefined();
    });

    it('does not check what the rows name itself: role.update does, before it applies a diff', async () => {
      const { permission: service, permissions } = setup();

      await service.applyDiff('role-1', {
        create: [row('api::nope.nope.find', { properties: { fields: ['nope'] } })],
        update: [],
        delete: [],
      });

      expect(permissions.createMany).toHaveBeenCalledTimes(1);
    });
  });
});
