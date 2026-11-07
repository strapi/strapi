/* eslint-disable no-return-assign -- the cases edit a copy of the file in place */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { BUILDER_LIMITS } from '../../../../../shared/builder/types';
import { PROFILE_UID, ROLE_UID, USER_UID } from '../../../constants';
import { layoutContentTypeUids } from '../../layout-content-types';
import { checkBuilderConditionV2 } from '../check';

vi.mock('../../layout-content-types', () => ({ layoutContentTypeUids: vi.fn() }));

const ARTICLE = 'api::article.article';
const CATEGORY = 'api::category.category';
const TAG = 'api::tag.tag';
const GROUP = 'api::group.group';
const LOCKED = 'api::locked.locked';

const relation = (target: string, kind = 'oneToOne', extra: Record<string, unknown> = {}) => ({
  type: 'relation',
  relation: kind,
  target,
  ...extra,
});

const SCHEMAS: Record<string, unknown> = {
  [ARTICLE]: {
    uid: ARTICLE,
    attributes: {
      title: { type: 'string' },
      views: { type: 'integer' },
      kind: { type: 'enumeration', enum: ['a', 'b'] },
      publishedOn: { type: 'date' },
      startsAt: { type: 'datetime' },
      published: { type: 'boolean' },
      owner: relation(USER_UID),
      category: relation(CATEGORY, 'manyToOne'),
      tags: relation(TAG, 'oneToMany'),
      secretNote: { type: 'text', private: true },
      cover: { type: 'media', multiple: false },
      seo: { type: 'component', component: 'shared.seo' },
      anything: { type: 'relation', relation: 'morphToMany' },
      outside: relation(LOCKED),
      editor: relation(USER_UID, 'manyToOne'),
    },
  },
  [CATEGORY]: {
    uid: CATEGORY,
    attributes: {
      name: { type: 'string' },
      parent: relation(CATEGORY, 'manyToOne'),
      group: relation(GROUP, 'manyToOne'),
      title: { type: 'text' },
    },
  },
  [TAG]: { uid: TAG, attributes: { label: { type: 'string' } } },
  [GROUP]: { uid: GROUP, attributes: { name: { type: 'string' } } },
  [USER_UID]: {
    uid: USER_UID,
    attributes: {
      email: { type: 'email' },
      name: { type: 'string' },
      emailVerified: { type: 'boolean' },
      password: { type: 'password', private: true },
      banReason: { type: 'string', private: true },
      avatar: { type: 'media', multiple: false },
      roles: relation(ROLE_UID, 'manyToMany'),
    },
  },
  [PROFILE_UID]: {
    uid: PROFILE_UID,
    attributes: {
      nickname: { type: 'string' },
      plan: { type: 'enumeration', enum: ['free', 'pro'] },
      company: relation(CATEGORY, 'manyToOne'),
      pets: relation(TAG, 'oneToMany'),
      notes: { type: 'text', private: true },
    },
  },
};

const VALID = {
  version: 2,
  slug: 'mine',
  displayName: 'Mine',
  appliesTo: { kind: 'types', types: [ARTICLE] },
  inputs: [
    { name: 'tag', kind: 'text', required: false, default: 'x' },
    { name: 'limit', kind: 'number', required: true },
    { name: 'flag', kind: 'boolean', required: false },
    { name: 'by', kind: 'field', accepts: 'text', required: true },
    { name: 'pickDate', kind: 'field', accepts: 'date', required: true },
    { name: 'pickCategory', kind: 'field', accepts: { relation: CATEGORY }, required: true },
  ],
  who: {
    match: 'any',
    checks: [
      {
        kind: 'attribute',
        source: 'user',
        attribute: 'name',
        operator: '$eq',
        value: { kind: 'fixed', value: 'a' },
      },
      {
        kind: 'attribute',
        source: 'profile',
        attribute: 'plan',
        operator: '$in',
        value: { kind: 'fixed', value: ['pro'] },
      },
      { kind: 'roles', match: 'any', roles: ['Editor'] },
      { kind: 'email-verified', value: true },
    ],
  },
  which: {
    kind: 'group',
    match: 'all',
    items: [
      {
        kind: 'check',
        target: { path: ['owner', 'documentId'] },
        operator: '$eq',
        value: { kind: 'user', attribute: 'documentId' },
      },
      {
        kind: 'check',
        target: { path: ['views'] },
        operator: '$gte',
        value: { kind: 'input', name: 'limit' },
      },
      {
        kind: 'check',
        target: { path: ['publishedOn'] },
        operator: '$gte',
        value: { kind: 'now', offset: { amount: -7, unit: 'days' } },
      },
      {
        kind: 'check',
        target: { input: 'by' },
        operator: '$contains',
        value: { kind: 'input', name: 'tag' },
      },
      {
        kind: 'check',
        target: { path: ['category', 'parent', 'name'] },
        operator: '$eq',
        value: { kind: 'profile', attribute: 'nickname' },
      },
      {
        kind: 'group',
        match: 'any',
        items: [
          {
            kind: 'check',
            target: { path: ['title'] },
            operator: '$startsWith',
            value: { kind: 'fixed', value: 'a' },
          },
          {
            kind: 'check',
            target: { path: ['kind'] },
            operator: '$in',
            value: { kind: 'fixed', value: ['a', 'b'] },
          },
          {
            kind: 'check',
            target: { path: ['tags', 'label'] },
            operator: '$eq',
            value: { kind: 'fixed', value: 'x' },
          },
        ],
      },
    ],
  },
  onSave: {
    stamp: [
      { field: 'owner', value: { kind: 'user' } },
      { field: 'title', value: { kind: 'input', name: 'tag' } },
      { field: 'published', value: { kind: 'fixed', value: true } },
    ],
    locked: ['views', 'category'],
  },
};

type Json = Record<string, any>;

const clone = (): Json => structuredClone(VALID) as Json;

const setup = () => {
  const strapi = { contentType: vi.fn((uid: string) => SCHEMAS[uid]) } as unknown as Core.Strapi;

  return (input: unknown, roleNames: readonly string[] = ['Editor', 'Reader']) =>
    checkBuilderConditionV2(strapi, input, { roleNames });
};

/** The refusal a client gets: the message, and the part of the condition it names */
const refusal = (input: unknown, roleNames?: readonly string[]) => {
  try {
    setup()(input, roleNames);
  } catch (error) {
    const { name, message, details } = error as {
      name: string;
      message: string;
      details: { errors: Array<{ path: unknown[]; message: string }> };
    };

    expect(name).toBe('ValidationError');
    expect(details.errors).toEqual([{ path: expect.any(Array), message, name: 'ValidationError' }]);

    return { message, path: details.errors[0].path };
  }

  throw new Error('The condition was accepted');
};

const edited = (change: (file: Json) => void): Json => {
  const file = clone();

  change(file);

  return file;
};

const entry = (file: Json, index: number) => file.which.items[index];

describe('checkBuilderConditionV2', () => {
  beforeEach(() => {
    // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
    vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });
    vi.mocked(layoutContentTypeUids).mockReturnValue([
      ARTICLE,
      CATEGORY,
      TAG,
      GROUP,
      USER_UID,
      PROFILE_UID,
    ]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(layoutContentTypeUids).mockReset();
  });

  it('gives back a full condition as it was written', () => {
    const input = clone();

    expect(setup()(input as never)).toEqual(VALID);
  });

  describe('the file', () => {
    it('is an object', () => {
      expect(refusal([])).toEqual({ message: 'A condition is an object', path: [] });
    });

    it('has the keys of a condition and no others', () => {
      expect(refusal({ ...clone(), params: {} })).toEqual({
        message: 'Unknown keys: params',
        path: ['params'],
      });
    });

    it('is version 2', () => {
      expect(refusal({ ...clone(), version: 1 })).toEqual({
        message: 'version is 2',
        path: ['version'],
      });
    });

    it('takes a slug by the v1 rules', () => {
      expect(refusal({ ...clone(), slug: 'Bad Slug' }).path).toEqual(['slug']);
      expect(refusal({ ...clone(), slug: 'new' }).message).toMatch(/reserved/);
    });

    it('is at most 64 KB', () => {
      const big = edited((file) => {
        file.inputs = Array.from({ length: 3 }, (_, index) => ({
          name: `a${index}`,
          kind: 'text',
          required: false,
          default: 'x'.repeat(BUILDER_LIMITS.textLength),
        }));
        file.displayName = 'x'.repeat(BUILDER_LIMITS.fileBytes);
      });

      expect(refusal(big)).toEqual({
        message: `A condition can be at most ${BUILDER_LIMITS.fileBytes} bytes`,
        path: [],
      });
    });
  });

  describe('appliesTo', () => {
    it.each([
      ['no types', { kind: 'types', types: [] }],
      ['a type that is not a Content API type', { kind: 'types', types: [ARTICLE, LOCKED] }],
      ['a kind it has not', { kind: 'some' }],
      ['an unknown key', { kind: 'all', types: [ARTICLE] }],
    ])('refuses %s', (_, appliesTo) => {
      expect(refusal(edited((file) => (file.appliesTo = appliesTo))).path[0]).toBe('appliesTo');
    });

    it('names the type that is not offered', () => {
      expect(
        refusal(edited((file) => (file.appliesTo = { kind: 'types', types: [LOCKED] }))).message
      ).toBe(`${LOCKED} is not a content type a role can be granted on`);
    });

    it('judges the types against an explicit offered set instead of the layout', () => {
      const strapi = {
        contentType: vi.fn((uid: string) => SCHEMAS[uid]),
      } as unknown as Core.Strapi;
      const roleNames = ['Editor', 'Reader'];

      // The layout offers the article, the explicit set does not
      expect(() =>
        checkBuilderConditionV2(strapi, clone(), { roleNames, offered: [CATEGORY] })
      ).toThrow(`${ARTICLE} is not a content type a role can be granted on`);
      expect(layoutContentTypeUids).not.toHaveBeenCalled();
    });

    it('takes every type with a relation to the end user for user-relation, and judges fields on them', () => {
      const file = edited((file) => {
        file.appliesTo = { kind: 'user-relation' };
        file.inputs = [];
        file.who.checks = [];
        file.which.items = [
          {
            kind: 'check',
            target: { path: ['title'] },
            operator: '$eq',
            value: { kind: 'fixed', value: 'a' },
          },
        ];
        file.onSave = { stamp: [], locked: [] };
      });

      // Only the article has a relation to the user
      expect(setup()(file as never)).toEqual(file);
    });
  });

  describe('at start-up, on every type or the types with a user relation', () => {
    const offered = [ARTICLE, CATEGORY, TAG, GROUP, USER_UID, PROFILE_UID];
    const strapi = { contentType: vi.fn((uid: string) => SCHEMAS[uid]) } as unknown as Core.Strapi;
    const forAll = (change: (file: Json) => void) =>
      edited((file) => {
        file.appliesTo = { kind: 'all' };
        file.inputs = [];
        file.who.checks = [];
        file.which.items = [];
        file.onSave = { stamp: [], locked: [] };
        change(file);
      });
    const load = (file: Json, atLoad: boolean) =>
      checkBuilderConditionV2(strapi, file, { roleNames: ['Editor'], offered, atLoad });
    const checking = (path: string[], value: string | number = 'x') => [
      {
        kind: 'check',
        target: { path },
        operator: '$eq',
        value: { kind: 'fixed', value },
      },
    ];

    it('refuses a path a type lacks when a condition is written, and loads it', () => {
      const file = forAll((draft) => (draft.which.items = checking(['views'], 1)));

      expect(() => load(file, false)).toThrow(`views is not a field of ${CATEGORY}`);
      expect(load(file, true)).toEqual(file);
    });

    it('loads a stamped and a locked field a type lacks, and refuses them when written', () => {
      const file = forAll((draft) => {
        draft.onSave = { stamp: [{ field: 'owner', value: { kind: 'user' } }], locked: ['views'] };
      });

      expect(() => load(file, false)).toThrow(/is not a field of/);
      expect(load(file, true)).toEqual(file);
    });

    it('still refuses a path that no type has, and keeps the other rules', () => {
      expect(() =>
        load(
          forAll((draft) => (draft.which.items = checking(['vanished']))),
          true
        )
      ).toThrow('vanished is not a field of any content type the condition applies to');
    });

    it('skips a later type whose field has another type when loading, and refuses it when written', () => {
      const withCounts = {
        contentType: vi.fn((uid: string) =>
          uid === GROUP
            ? { uid: GROUP, attributes: { title: { type: 'integer' } } }
            : { ...(SCHEMAS[uid] as object) }
        ),
      } as unknown as Core.Strapi;
      const file = forAll((draft) => (draft.which.items = checking(['title'])));
      const run = (atLoad: boolean) =>
        checkBuilderConditionV2(withCounts, file, {
          roleNames: ['Editor'],
          offered: [ARTICLE, GROUP],
          atLoad,
        });

      // The article's title is a string and the group's an integer: at load the group is left out,
      // as a type without the field is (the compiled query denies it per type)
      expect(run(true)).toEqual(file);
      expect(() => run(false)).toThrow(/title is a string on .* but a integer on/);
    });

    it('skips a later type whose stamped field has another type when loading, and refuses it when written', () => {
      const withCounts = {
        contentType: vi.fn((uid: string) =>
          uid === GROUP
            ? { uid: GROUP, attributes: { title: { type: 'integer' } } }
            : { ...(SCHEMAS[uid] as object) }
        ),
      } as unknown as Core.Strapi;
      const file = forAll((draft) => {
        draft.onSave = {
          stamp: [{ field: 'title', value: { kind: 'fixed', value: 'x' } }],
          locked: [],
        };
      });
      const run = (atLoad: boolean) =>
        checkBuilderConditionV2(withCounts, file, {
          roleNames: ['Editor'],
          offered: [ARTICLE, GROUP],
          atLoad,
        });

      expect(run(true)).toEqual(file);
      expect(() => run(false)).toThrow(/a stamp needs the same type on every content type/);
    });

    it('is not forgiven for a condition on named types', () => {
      const file = edited((draft) => (draft.which.items = checking(['vanished'])));

      expect(() => load(file, true)).toThrow(`vanished is not a field of ${ARTICLE}`);
    });
  });

  describe('inputs', () => {
    it.each([
      ['Upper', 'a name that starts with a capital'],
      ['1st', 'a name that starts with a digit'],
      ['a_b', 'a name with an underscore'],
      ['a'.repeat(33), 'a name over 32 characters'],
    ])('refuses the name %s', (name) => {
      expect(refusal(edited((file) => (file.inputs[0].name = name))).path).toEqual([
        'inputs',
        0,
        'name',
      ]);
    });

    it('refuses a name twice', () => {
      expect(refusal(edited((file) => (file.inputs[1].name = 'tag')))).toEqual({
        message: 'There are two inputs named tag',
        path: ['inputs', 1, 'name'],
      });
    });

    it('refuses a field input without accepts', () => {
      expect(
        refusal(
          edited((file) => {
            delete file.inputs[3].accepts;
          })
        )
      ).toEqual({
        message: 'by is a field input: it needs accepts',
        path: ['inputs', 3, 'accepts'],
      });
    });

    it('refuses a field input that is not required', () => {
      expect(refusal(edited((file) => (file.inputs[3].required = false)))).toEqual({
        message: 'by is a field input: it is always required',
        path: ['inputs', 3, 'required'],
      });
    });

    it('refuses a relation a role can not be granted on', () => {
      expect(
        refusal(edited((file) => (file.inputs[5].accepts = { relation: LOCKED }))).path
      ).toEqual(['inputs', 5, 'accepts']);
    });

    it.each([
      [0, 5],
      [1, 'ten'],
      [2, 'yes'],
    ])('refuses a default of the wrong kind on input %i', (index, value) => {
      expect(
        refusal(
          edited((file) => {
            file.inputs[index].default = value;
          })
        ).path
      ).toEqual(['inputs', index, 'default']);
    });

    it.each(['$user.name', '$profile.x', '$params.p', '$now', 'x'.repeat(1001)])(
      'refuses the text default %j',
      (value) => {
        const error = refusal(
          edited((file) => {
            file.inputs[0].default = value;
          })
        );

        expect(error.path).toEqual(['inputs', 0, 'default']);
        expect(error.message).toMatch(/^The default of tag: /);
      }
    );

    it('refuses more than 20 inputs', () => {
      const file = edited((draft) => {
        draft.inputs = Array.from({ length: 21 }, (_, index) => ({
          name: `n${index}`,
          kind: 'text',
          required: false,
        }));
      });

      expect(refusal(file)).toEqual({
        message: 'A condition can hold at most 20 inputs',
        path: ['inputs'],
      });
    });
  });

  describe('who', () => {
    it.each([
      ['a private attribute of the user', 'user', 'banReason'],
      ['an attribute the user lacks', 'user', 'nope'],
      ['a private attribute of the profile', 'profile', 'notes'],
      ['an attribute the profile lacks', 'profile', 'nope'],
      ['a media attribute', 'user', 'avatar'],
    ])('refuses %s', (_, source, attribute) => {
      const file = edited((draft) => {
        draft.who.checks[0] = { ...draft.who.checks[0], source, attribute };
      });

      expect(refusal(file).path).toEqual(['who', 'checks', 0, 'attribute']);
    });

    it('refuses a role that does not exist', () => {
      expect(refusal(VALID, ['Reader'])).toEqual({
        message: 'Editor is not a role',
        path: ['who', 'checks', 2, 'roles'],
      });
    });

    it('refuses an operator the attribute does not offer', () => {
      const file = edited((draft) => {
        draft.who.checks[1].operator = '$contains';
      });

      expect(refusal(file).path).toEqual(['who', 'checks', 1, 'operator']);
    });

    it('refuses a value that does not fit, with valueProblem', () => {
      const file = edited((draft) => {
        draft.who.checks[1].value = { kind: 'fixed', value: ['gold'] };
      });

      expect(refusal(file)).toEqual({
        message: "the profile's plan: gold is not one of free, pro",
        path: ['who', 'checks', 1, 'value', 'value'],
      });
    });

    it('refuses email verified that is not true or false', () => {
      expect(refusal(edited((draft) => (draft.who.checks[3].value = 'yes'))).path).toEqual([
        'who',
        'checks',
        3,
        'value',
      ]);
    });
  });

  describe('an entry path', () => {
    const at = (path: string[], operator = '$eq', value: unknown = { kind: 'fixed', value: 'a' }) =>
      edited((file) => {
        file.which.items = [{ kind: 'check', target: { path }, operator, value }];
      });
    const whereAt = ['which', 'items', 0, 'target', 'path'];

    it('is refused when it is missing on any chosen type', () => {
      const file = at(['name']);

      file.appliesTo.types = [ARTICLE, CATEGORY];

      expect(refusal(file)).toEqual({
        message: `name is not a field of ${ARTICLE}`,
        path: whereAt,
      });
    });

    it('is refused when it goes through a field that is not a relation', () => {
      expect(refusal(at(['title', 'name'])).message).toMatch(
        /title is a string field.*not a relation/
      );
    });

    it('is refused when it goes through a relation to a type roles cannot be granted on', () => {
      expect(refusal(at(['outside', 'name'])).message).toMatch(/can't go through/);
    });

    it('is refused when it goes through a morph relation', () => {
      expect(refusal(at(['anything', 'name'])).message).toMatch(/not a relation/);
    });

    it('is refused past 2 hops, and taken at 2', () => {
      expect(refusal(at(['category', 'parent', 'group', 'name'])).message).toMatch(
        /more than 2 relations/
      );
      expect(setup()(at(['category', 'parent', 'name']) as never)).toBeDefined();
      expect(setup()(at(['category', 'group', 'documentId']) as never)).toBeDefined();
    });

    it('is refused when it ends on a relation', () => {
      expect(refusal(at(['category']))).toEqual({
        message: 'category ends on a relation: use category.documentId to compare the entry',
        path: whereAt,
      });
    });

    it.each(['secretNote', 'cover', 'seo'])(
      'is refused on %s, which a condition can not filter on',
      (name) => {
        expect(refusal(at([name])).path).toEqual(whereAt);
      }
    );

    it('is refused when the types disagree on the field', () => {
      const file = at(['title']);

      file.appliesTo.types = [ARTICLE, CATEGORY];

      expect(refusal(file).message).toMatch(/string on api::article.article but a text on/);
    });

    it('is refused when a path is not a list of names', () => {
      expect(refusal(at([])).path).toEqual(whereAt);
    });
  });

  describe('negation across a to-many relation', () => {
    const message = (path: string) =>
      `is not, does not include and none of can't cross the to-many relation ${path}`;

    it.each(['$ne', '$notIn', '$notContains', '$notContainsi'])('refuses %s', (operator) => {
      const file = edited((draft) => {
        draft.which.items = [
          {
            kind: 'check',
            target: { path: ['tags', 'label'] },
            operator,
            value: { kind: 'fixed', value: operator === '$notIn' ? ['x'] : 'x' },
          },
        ];
      });

      expect(refusal(file)).toEqual({
        message: message('tags'),
        path: ['which', 'items', 0, 'operator'],
      });
    });

    it('refuses a none group on it, nested or not', () => {
      const check = {
        kind: 'check',
        target: { path: ['tags', 'label'] },
        operator: '$eq',
        value: { kind: 'fixed', value: 'x' },
      };

      expect(
        refusal(edited((draft) => (draft.which = { kind: 'group', match: 'none', items: [check] })))
      ).toEqual({ message: message('tags'), path: ['which', 'items', 0, 'target'] });
      expect(
        refusal(
          edited(
            (draft) =>
              (draft.which = {
                kind: 'group',
                match: 'all',
                items: [{ kind: 'group', match: 'none', items: [check] }],
              })
          )
        ).path
      ).toEqual(['which', 'items', 0, 'items', 0, 'target']);
    });

    it('takes a negation across a to-one relation, and a none group away from a to-many one', () => {
      const file = edited((draft) => {
        draft.which = {
          kind: 'group',
          match: 'none',
          items: [
            {
              kind: 'check',
              target: { path: ['category', 'name'] },
              operator: '$ne',
              value: { kind: 'fixed', value: 'x' },
            },
          ],
        };
      });

      expect(setup()(file as never)).toBeDefined();
    });
  });

  describe('operators and values', () => {
    it('refuses an operator the type does not offer', () => {
      const file = edited((draft) => {
        draft.which.items = [
          {
            kind: 'check',
            target: { path: ['published'] },
            operator: '$gt',
            value: { kind: 'fixed', value: true },
          },
        ];
      });

      expect(refusal(file).path).toEqual(['which', 'items', 0, 'operator']);
    });

    it('refuses a fixed value that does not fit, with valueProblem', () => {
      const file = edited((draft) => {
        draft.which.items = [
          {
            kind: 'check',
            target: { path: ['views'] },
            operator: '$gt',
            value: { kind: 'fixed', value: 1.5 },
          },
        ];
      });

      expect(refusal(file)).toEqual({
        message: 'views: an integer has no decimals',
        path: ['which', 'items', 0, 'value', 'value'],
      });
    });

    it('refuses a check without a value', () => {
      expect(refusal(edited((draft) => delete entry(draft, 1).value)).path).toEqual([
        'which',
        'items',
        1,
        'value',
      ]);
    });

    it('refuses an input value that names no input', () => {
      expect(
        refusal(edited((draft) => (entry(draft, 1).value = { kind: 'input', name: 'nope' })))
      ).toEqual({
        message: 'nope is not an input of this condition',
        path: ['which', 'items', 1, 'value'],
      });
    });

    it('refuses a field input as a value', () => {
      expect(
        refusal(edited((draft) => (entry(draft, 1).value = { kind: 'input', name: 'by' }))).message
      ).toMatch(/is a field input/);
    });

    it('refuses an input of the wrong kind', () => {
      expect(
        refusal(edited((draft) => (entry(draft, 1).value = { kind: 'input', name: 'tag' }))).message
      ).toMatch(/takes a number, not a text/);
    });

    it('refuses an input value to an operator that takes a list or a flag', () => {
      expect(
        refusal(
          edited((draft) => {
            draft.which.items = [
              {
                kind: 'check',
                target: { path: ['kind'] },
                operator: '$in',
                value: { kind: 'input', name: 'tag' },
              },
            ];
          })
        ).message
      ).toMatch(/takes a list of fixed values/);
    });

    it('refuses a target that is an input that is not a field input', () => {
      expect(refusal(edited((draft) => (entry(draft, 3).target = { input: 'tag' })))).toEqual({
        message: 'tag is not a field input of this condition',
        path: ['which', 'items', 3, 'target', 'input'],
      });
    });

    it('takes the operators of what a field input accepts', () => {
      expect(refusal(edited((draft) => (entry(draft, 3).operator = '$gt'))).path).toEqual([
        'which',
        'items',
        3,
        'operator',
      ]);
    });

    it.each([
      ['a private attribute', { kind: 'user', attribute: 'banReason' }],
      ['an attribute the user lacks', { kind: 'user', attribute: 'nope' }],
      ['a media attribute', { kind: 'user', attribute: 'avatar' }],
      ['a private attribute of the profile', { kind: 'profile', attribute: 'notes' }],
      ['an attribute the profile lacks', { kind: 'profile', attribute: 'nope' }],
      ['a to-many relation of the profile', { kind: 'profile', attribute: 'pets.documentId' }],
      ['a value of the wrong kind', { kind: 'user', attribute: 'emailVerified' }],
    ])('refuses a user or profile value naming %s', (_, value) => {
      const file = edited((draft) => {
        draft.which.items = [
          { kind: 'check', target: { path: ['title'] }, operator: '$eq', value },
        ];
      });

      expect(refusal(file).path).toEqual(['which', 'items', 0, 'value']);
    });

    it('takes the profile’s to-one relation as its documentId', () => {
      const file = edited((draft) => {
        draft.which.items = [
          {
            kind: 'check',
            target: { path: ['category', 'documentId'] },
            operator: '$eq',
            value: { kind: 'profile', attribute: 'company.documentId' },
          },
        ];
      });

      expect(setup()(file as never)).toBeDefined();
    });

    it('takes now on a date field only, with a whole offset', () => {
      const onTitle = edited((draft) => {
        draft.which.items = [
          { kind: 'check', target: { path: ['title'] }, operator: '$eq', value: { kind: 'now' } },
        ];
      });

      expect(refusal(onTitle).message).toMatch(/now is for date fields/);
      expect(
        refusal(
          edited(
            (draft) =>
              (entry(draft, 2).value = { kind: 'now', offset: { amount: 1.5, unit: 'days' } })
          )
        ).path
      ).toEqual(['which', 'items', 2, 'value', 'offset', 'amount']);
      expect(
        refusal(
          edited(
            (draft) =>
              (entry(draft, 2).value = { kind: 'now', offset: { amount: 1, unit: 'weeks' } })
          )
        ).path
      ).toEqual(['which', 'items', 2, 'value', 'offset', 'unit']);
    });

    it('refuses a value with a key it does not have', () => {
      expect(refusal(edited((draft) => (entry(draft, 0).value.extra = 1))).message).toBe(
        'Unknown keys: extra'
      );
    });
  });

  describe('groups and limits', () => {
    const check = {
      kind: 'check',
      target: { path: ['title'] },
      operator: '$eq',
      value: { kind: 'fixed', value: 'a' },
    };

    it('refuses a group nested more than one level', () => {
      const file = edited((draft) => {
        draft.which.items = [
          {
            kind: 'group',
            match: 'all',
            items: [{ kind: 'group', match: 'all', items: [check] }],
          },
        ];
      });

      expect(refusal(file)).toEqual({
        message: 'Groups nest 1 level deep at most',
        path: ['which', 'items', 0, 'items', 0],
      });
    });

    it('refuses a nested group with no items, and takes an empty top-level group', () => {
      expect(
        refusal(
          edited((draft) => {
            draft.which.items = [{ kind: 'group', match: 'any', items: [] }];
          })
        )
      ).toEqual({ message: 'A group needs at least one check', path: ['which', 'items', 0] });
      expect(
        setup()(
          edited((draft) => {
            draft.which.items = [];
          }) as never
        )
      ).toBeDefined();
    });

    it('refuses more than 50 checks, who checks included', () => {
      const file = edited((draft) => {
        draft.who.checks = [{ kind: 'email-verified', value: true }];
        draft.which.items = Array.from({ length: 50 }, () => check);
      });

      expect(refusal(file)).toEqual({
        message: 'A condition can hold at most 50 checks',
        path: ['which', 'items', 49],
      });
    });

    it('refuses a list of more than 100 values', () => {
      const file = edited((draft) => {
        draft.which.items = [
          {
            kind: 'check',
            target: { path: ['title'] },
            operator: '$in',
            value: { kind: 'fixed', value: Array.from({ length: 101 }, (_, index) => `v${index}`) },
          },
        ];
      });

      expect(refusal(file).message).toMatch(/at most 100 values/);
    });

    it('refuses a text of more than 1,000 characters', () => {
      const file = edited((draft) => {
        draft.which.items = [
          {
            kind: 'check',
            target: { path: ['title'] },
            operator: '$eq',
            value: { kind: 'fixed', value: 'x'.repeat(1001) },
          },
        ];
      });

      expect(refusal(file).message).toMatch(/at most 1000 characters/);
    });

    it('refuses an item that is neither a check nor a group', () => {
      expect(refusal(edited((draft) => draft.which.items.push({ kind: 'x' }))).path).toEqual([
        'which',
        'items',
        6,
        'kind',
      ]);
    });
  });

  describe('onSave', () => {
    it('refuses a stamp on a field missing on any chosen type', () => {
      expect(refusal(edited((draft) => (draft.onSave.stamp[1].field = 'nope')))).toEqual({
        message: `nope is not a field of ${ARTICLE}`,
        path: ['onSave', 'stamp', 1, 'field'],
      });
    });

    it('refuses a user stamp on a field that is not a relation to the end user', () => {
      expect(refusal(edited((draft) => (draft.onSave.stamp[0].field = 'category')))).toEqual({
        message: `category is not a relation to ${USER_UID}, so it can't be stamped with the user`,
        path: ['onSave', 'stamp', 0, 'value'],
      });
    });

    it('refuses an input stamp that is a field input, or of the wrong kind', () => {
      expect(
        refusal(edited((draft) => (draft.onSave.stamp[1].value = { kind: 'input', name: 'by' })))
          .message
      ).toMatch(/is not a text, number or boolean input/);
      expect(
        refusal(edited((draft) => (draft.onSave.stamp[1].value = { kind: 'input', name: 'limit' })))
          .message
      ).toMatch(/takes a text, not a number/);
    });

    it('refuses a fixed stamp that does not fit the field', () => {
      expect(
        refusal(edited((draft) => (draft.onSave.stamp[2].value = { kind: 'fixed', value: 'yes' })))
          .path
      ).toEqual(['onSave', 'stamp', 2, 'value', 'value']);
    });

    it('refuses a field stamped twice', () => {
      expect(refusal(edited((draft) => (draft.onSave.stamp[1].field = 'owner'))).message).toBe(
        'owner is stamped twice'
      );
    });

    it('refuses a locked field missing on any chosen type', () => {
      expect(refusal(edited((draft) => (draft.onSave.locked[1] = 'nope')))).toEqual({
        message: `nope is not a field of ${ARTICLE}`,
        path: ['onSave', 'locked', 1],
      });
    });
  });
});
