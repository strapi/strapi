import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core, Modules } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../../../constants';
import type {
  BuilderConditionV2,
  BuilderValue,
  EntryCheck,
  EntryGroup,
  WhoCheck,
} from '../../../../../shared/builder/types';
import { compileBuilderCondition, matchesAccepts, staleReferences } from '../compile';
// Core's own functions, from its source: what the permission engine runs a condition through
/* eslint-disable import/no-relative-packages */
import {
  appliesTo,
  applyCondition,
  assertConditionDefinition,
  evaluateCondition,
} from '../../../../../../../core/core/src/services/content-api/permissions/conditions';
/* eslint-enable import/no-relative-packages */

type ConditionContext = Modules.ContentAPI.ConditionContext;

const NOTE = 'api::note.note';
const FOLDER = 'api::folder.folder';
const PLAIN = 'api::plain.plain';

const relation = (target: string, kind = 'manyToOne') => ({
  type: 'relation',
  relation: kind,
  target,
});

const SCHEMAS: Record<string, { uid: string; attributes: Record<string, unknown> }> = {
  [NOTE]: {
    uid: NOTE,
    attributes: {
      title: { type: 'string' },
      body: { type: 'text' },
      owner: relation(USER_UID, 'oneToOne'),
      author: relation(USER_UID),
      reviewers: relation(USER_UID, 'manyToMany'),
      tags: relation(FOLDER, 'oneToMany'),
      secretOwner: { ...relation(USER_UID), private: true },
      folder: relation(FOLDER),
      views: { type: 'integer' },
      secret: { type: 'string', private: true },
      createdAt: { type: 'datetime' },
    },
  },
  [FOLDER]: { uid: FOLDER, attributes: { name: { type: 'string' } } },
  [PLAIN]: { uid: PLAIN, attributes: { title: { type: 'string' } } },
  [USER_UID]: { uid: USER_UID, attributes: { email: { type: 'email' }, plan: { type: 'string' } } },
  [PROFILE_UID]: {
    uid: PROFILE_UID,
    attributes: {
      company: { type: 'string' },
      tier: { type: 'string' },
      since: { type: 'datetime' },
      credits: { type: 'biginteger' },
      joined: { type: 'datetime' },
      opensAt: { type: 'time' },
      age: { type: 'integer' },
      price: { type: 'decimal' },
      birthday: { type: 'date' },
    },
  },
};

const strapi = (schemas = SCHEMAS) =>
  ({ contentType: (uid: string) => schemas[uid] }) as unknown as Core.Strapi;

const USER = {
  uid: USER_UID,
  id: 7,
  documentId: 'user-a',
  email: 'a@example.com',
  plan: 'pro',
  emailVerified: true,
  roles: [{ documentId: 'role-a', name: 'Editor' }],
  profile: { company: 'Acme', tier: 'gold' },
};

beforeEach(() => {
  // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
  vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const NOW = new Date('2026-11-04T12:00:00.000Z');

const base = (overrides: Partial<BuilderConditionV2> = {}): BuilderConditionV2 => ({
  version: 2,
  slug: 'mine',
  displayName: 'Mine',
  appliesTo: { kind: 'all' },
  inputs: [],
  who: { match: 'all', checks: [] },
  which: { kind: 'group', match: 'all', items: [] },
  onSave: { stamp: [], locked: [] },
  ...overrides,
});

const fixed = (value: Extract<BuilderValue, { kind: 'fixed' }>['value']): BuilderValue => ({
  kind: 'fixed',
  value,
});

const titleIs = (value: string): EntryCheck => ({
  kind: 'check',
  target: { path: ['title'] },
  operator: '$eq',
  value: fixed(value),
});

const run = (
  condition: BuilderConditionV2,
  options: {
    user?: ConditionContext['user'];
    params?: Record<string, unknown>;
    uid?: string;
    schemas?: typeof SCHEMAS;
  } = {}
) => {
  const definition = compileBuilderCondition(strapi(options.schemas), condition);
  const user = options.user === undefined ? USER : options.user;

  return evaluateCondition(definition, options.params ?? {}, {
    user,
    uid: options.uid ?? NOTE,
    now: NOW,
  });
};

const whoAttribute = (
  source: 'user' | 'profile',
  attribute: string,
  operator: string,
  value?: BuilderValue
): WhoCheck => ({ kind: 'attribute', source, attribute, operator, value });

describe('compileBuilderCondition', () => {
  it('names the definition, marks it as from the builder and passes core registration', () => {
    const definition = compileBuilderCondition(strapi(), base({ slug: 'shared-notes' }));

    expect(definition).toMatchObject({
      name: 'api::shared-notes',
      displayName: 'Mine',
      source: 'builder',
    });
    expect(() => assertConditionDefinition(definition)).not.toThrow();
  });

  describe('subjects', () => {
    it('omits them for all', () => {
      expect(compileBuilderCondition(strapi(), base()).subjects).toBeUndefined();
    });

    it('lists the types', () => {
      const definition = compileBuilderCondition(
        strapi(),
        base({ appliesTo: { kind: 'types', types: [NOTE, FOLDER] } })
      );

      expect(appliesTo(definition, NOTE)).toBe(true);
      expect(appliesTo(definition, PLAIN)).toBe(false);
    });

    it('is the types with a relation to the end user for user-relation', () => {
      const definition = compileBuilderCondition(
        strapi(),
        base({ appliesTo: { kind: 'user-relation' } })
      );

      expect(appliesTo(definition, NOTE)).toBe(true);
      expect(appliesTo(definition, FOLDER)).toBe(false);
      expect(appliesTo(definition, 'constructor')).toBe(false);
    });
  });

  it('maps inputs to params', () => {
    const definition = compileBuilderCondition(
      strapi(),
      base({
        inputs: [
          { name: 'label', kind: 'text', required: true },
          { name: 'limit', kind: 'number', required: false, default: 3 },
          { name: 'open', kind: 'boolean', required: false, default: true },
          { name: 'owner', kind: 'field', accepts: { relation: USER_UID }, required: true },
          { name: 'column', kind: 'field', accepts: 'text', required: true },
        ],
      })
    );

    expect(definition.params).toEqual({
      label: { type: 'string', required: true },
      limit: { type: 'number', default: 3 },
      open: { type: 'boolean', default: true },
      owner: { type: 'attribute', relationTarget: USER_UID, required: true },
      column: { type: 'attribute', required: true },
    });
  });

  describe('who', () => {
    it('checks an attribute of the user', () => {
      const condition = base({
        who: { match: 'all', checks: [whoAttribute('user', 'plan', '$eq', fixed('pro'))] },
      });

      expect(run(condition)).toEqual({});
      expect(run(condition, { user: { ...USER, plan: 'free' } })).toBe(false);
    });

    it('is false when the attribute is missing, even for a negating operator', () => {
      const condition = base({
        who: { match: 'all', checks: [whoAttribute('user', 'plan', '$ne', fixed('pro'))] },
      });

      expect(run(condition, { user: { ...USER, plan: undefined } })).toBe(false);
      expect(run(condition, { user: { ...USER, plan: 'free' } })).toEqual({});
    });

    it('checks an attribute of the profile, and a missing profile fails', () => {
      const condition = base({
        who: { match: 'all', checks: [whoAttribute('profile', 'tier', '$in', fixed(['gold']))] },
      });

      expect(run(condition)).toEqual({});
      expect(run(condition, { user: { ...USER, profile: { tier: 'bronze' } } })).toBe(false);
      expect(run(condition, { user: { ...USER, profile: null } })).toBe(false);
      expect(run(condition, { user: { ...USER, profile: undefined } })).toBe(false);
    });

    it('checks the role names: any, none, and "Editors" is not "Editor"', () => {
      const any = base({
        who: { match: 'all', checks: [{ kind: 'roles', match: 'any', roles: ['Editor'] }] },
      });
      const none = base({
        who: { match: 'all', checks: [{ kind: 'roles', match: 'none', roles: ['Editor'] }] },
      });
      const editors = { ...USER, roles: [{ documentId: 'role-b', name: 'Editors' }] };

      expect(run(any)).toEqual({});
      expect(run(any, { user: editors })).toBe(false);
      expect(run(none)).toBe(false);
      expect(run(none, { user: editors })).toEqual({});
    });

    it('checks that the email is verified, or not', () => {
      const verified = base({
        who: { match: 'all', checks: [{ kind: 'email-verified', value: true }] },
      });
      const unverified = base({
        who: { match: 'all', checks: [{ kind: 'email-verified', value: false }] },
      });
      const user = { ...USER, emailVerified: false };

      expect(run(verified)).toEqual({});
      expect(run(verified, { user })).toBe(false);
      expect(run(unverified, { user })).toEqual({});
      expect(run(unverified)).toBe(false);
    });

    it('takes all or any of the checks', () => {
      const checks = [
        whoAttribute('user', 'plan', '$eq', fixed('free')),
        { kind: 'email-verified', value: true } as WhoCheck,
      ];

      expect(run(base({ who: { match: 'all', checks } }))).toBe(false);
      expect(run(base({ who: { match: 'any', checks } }))).toEqual({});
    });

    describe('compares by the type of the attribute', () => {
      const onProfile = (attribute: string, operator: string, value: BuilderValue) =>
        base({
          who: { match: 'all', checks: [whoAttribute('profile', attribute, operator, value)] },
        });
      const holdsFor = (condition: BuilderConditionV2, profile: Record<string, unknown>) =>
        run(condition, { user: { ...USER, profile } }) !== false;

      it('reads a biginteger as a number, not as a date: 5 is not above 1000', () => {
        const above = onProfile('credits', '$gt', fixed('1000'));

        expect(holdsFor(above, { credits: '5' })).toBe(false);
        expect(holdsFor(above, { credits: '50' })).toBe(false);
        expect(holdsFor(above, { credits: '5000' })).toBe(true);
        // Beyond what a number holds exactly
        expect(
          holdsFor(onProfile('credits', '$gt', fixed('9007199254740993')), {
            credits: '9007199254740994',
          })
        ).toBe(true);
        expect(holdsFor(onProfile('credits', '$lt', fixed('1000')), { credits: '50' })).toBe(true);
        expect(holdsFor(onProfile('credits', '$eq', fixed('10')), { credits: '10' })).toBe(true);
      });

      it('reads a date and time as an instant, whatever way it is written', () => {
        const stored = { joined: '2026-11-04T09:30:00Z' };

        expect(
          holdsFor(onProfile('joined', '$eq', fixed('2026-11-04T11:30:00.000+02:00')), stored)
        ).toBe(true);
        expect(
          holdsFor(onProfile('joined', '$ne', fixed('2026-11-04T09:30:00.000Z')), stored)
        ).toBe(false);
        expect(holdsFor(onProfile('joined', '$ne', fixed('2026-11-04T09:30:01Z')), stored)).toBe(
          true
        );
        expect(holdsFor(onProfile('joined', '$lt', fixed('2026-11-04T09:30:01Z')), stored)).toBe(
          true
        );
        expect(
          holdsFor(onProfile('joined', '$in', fixed(['2026-11-04T10:30:00+01:00'])), stored)
        ).toBe(true);
      });

      it('reads a date as a day, and a date and time as the day it falls on', () => {
        const stored = { birthday: '2026-11-04' };

        expect(holdsFor(onProfile('birthday', '$eq', fixed('2026-11-04')), stored)).toBe(true);
        expect(holdsFor(onProfile('birthday', '$lt', fixed('2026-11-10')), stored)).toBe(true);
        expect(
          holdsFor(onProfile('birthday', '$lte', { kind: 'now' }), { birthday: '2026-11-04' })
        ).toBe(true);
      });

      it('normalises a time: 09:30:00.000 is 09:30, and later is later', () => {
        const stored = { opensAt: '09:30:00.000' };

        expect(holdsFor(onProfile('opensAt', '$eq', fixed('09:30')), stored)).toBe(true);
        expect(holdsFor(onProfile('opensAt', '$lte', fixed('09:30')), stored)).toBe(true);
        expect(holdsFor(onProfile('opensAt', '$gt', fixed('09:30')), stored)).toBe(false);
        expect(
          holdsFor(onProfile('opensAt', '$gt', fixed('09:30')), { opensAt: '09:30:00.500' })
        ).toBe(true);
        expect(holdsFor(onProfile('opensAt', '$lt', fixed('10:00:00')), { opensAt: '9:30' })).toBe(
          false
        );
      });

      it('compares numbers as numbers, a decimal given as a string too', () => {
        expect(holdsFor(onProfile('age', '$lt', fixed(10)), { age: 9 })).toBe(true);
        expect(holdsFor(onProfile('price', '$gt', fixed(9)), { price: '9.5' })).toBe(true);
        expect(holdsFor(onProfile('price', '$gt', fixed(10)), { price: '9.5' })).toBe(false);
      });

      it('compares a text as a text, never as a date: Jan 2 is after Feb 3', () => {
        expect(holdsFor(onProfile('tier', '$lt', fixed('Feb 3')), { tier: 'Jan 2' })).toBe(false);
        expect(holdsFor(onProfile('tier', '$lt', fixed('9')), { tier: '10' })).toBe(true);
      });

      it('is false for a value the type does not read, and for an attribute the project no longer has', () => {
        expect(holdsFor(onProfile('credits', '$gt', fixed('1')), { credits: 'lots' })).toBe(false);
        expect(
          holdsFor(onProfile('joined', '$gt', fixed('2020-01-01T00:00:00Z')), { joined: 'May 5' })
        ).toBe(false);
        // No time zone, so no instant
        expect(
          holdsFor(onProfile('joined', '$gt', fixed('2020-01-01T00:00:00Z')), {
            joined: '2026-11-04T09:30:00',
          })
        ).toBe(false);
        expect(holdsFor(onProfile('vanished', '$eq', fixed('x')), { vanished: 'x' })).toBe(false);
      });
    });

    describe('a value that is missing', () => {
      const empty = (attribute: string, value: boolean) =>
        base({
          who: {
            match: 'all',
            checks: [whoAttribute('profile', attribute, '$null', fixed(value) as BuilderValue)],
          },
        });

      it('is false for every operator, "is empty" included, when there is no profile', () => {
        expect(run(empty('tier', true), { user: { ...USER, profile: null } })).toBe(false);
        expect(run(empty('tier', false), { user: { ...USER, profile: null } })).toBe(false);
        expect(run(empty('tier', true), { user: { ...USER, profile: undefined } })).toBe(false);
        // The attribute isn't there to read
        expect(run(empty('tier', true), { user: { ...USER, profile: { company: 'x' } } })).toBe(
          false
        );
      });

      it('is empty only when the profile has the attribute and it is null', () => {
        expect(run(empty('tier', true), { user: { ...USER, profile: { tier: null } } })).toEqual(
          {}
        );
        expect(run(empty('tier', false), { user: { ...USER, profile: { tier: null } } })).toBe(
          false
        );
        expect(run(empty('tier', false), { user: { ...USER, profile: { tier: 'gold' } } })).toEqual(
          {}
        );
      });
    });

    it('compares with an input, the profile or a time', () => {
      const input = base({
        inputs: [{ name: 'plan', kind: 'text', required: true }],
        who: {
          match: 'all',
          checks: [whoAttribute('user', 'plan', '$eq', { kind: 'input', name: 'plan' })],
        },
      });
      const since = base({
        who: {
          match: 'all',
          checks: [
            whoAttribute('profile', 'since', '$lt', {
              kind: 'now',
              offset: { amount: -7, unit: 'days' },
            }),
          ],
        },
      });

      expect(run(input, { params: { plan: 'pro' } })).toEqual({});
      expect(run(input, { params: { plan: 'free' } })).toBe(false);
      expect(run(since, { user: { ...USER, profile: { since: '2026-10-01T00:00:00Z' } } })).toEqual(
        {}
      );
      expect(run(since, { user: { ...USER, profile: { since: '2026-11-03T00:00:00Z' } } })).toBe(
        false
      );
    });
  });

  describe('for Public', () => {
    it('is false for every part that reads the user', () => {
      const parts: Array<Partial<BuilderConditionV2>> = [
        { who: { match: 'all', checks: [{ kind: 'email-verified', value: true }] } },
        { who: { match: 'all', checks: [{ kind: 'roles', match: 'none', roles: ['X'] }] } },
        { who: { match: 'all', checks: [whoAttribute('profile', 'tier', '$eq', fixed('gold'))] } },
        {
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
            ],
          },
        },
        {
          which: {
            kind: 'group',
            match: 'all',
            items: [
              {
                kind: 'check',
                target: { path: ['title'] },
                operator: '$eq',
                value: { kind: 'profile', attribute: 'company' },
              },
            ],
          },
        },
        { onSave: { stamp: [{ field: 'owner', value: { kind: 'user' } }], locked: [] } },
      ];

      for (const part of parts) {
        const definition = compileBuilderCondition(strapi(), base(part));
        const ctx = { user: null, params: {}, uid: NOTE, now: NOW };

        expect(definition.query).toBeTypeOf('function');
        expect((definition.query as (c: ConditionContext) => unknown)(ctx)).toBe(false);
        expect(run(base(part), { user: null })).toBe(false);
      }
    });

    it('is not affected when the condition only checks fixed values', () => {
      const condition = base({ which: { kind: 'group', match: 'all', items: [titleIs('x')] } });

      expect(run(condition, { user: null })).toEqual({ $and: [{ title: { $eq: 'x' } }] });
    });
  });

  describe('which', () => {
    it('is true with no checks', () => {
      expect(run(base())).toEqual({});
    });

    it('nests any inside all', () => {
      const condition = base({
        which: {
          kind: 'group',
          match: 'all',
          items: [
            titleIs('a'),
            { kind: 'group', match: 'any', items: [titleIs('b'), titleIs('c')] },
          ],
        },
      });

      expect(run(condition)).toEqual({
        $and: [
          { title: { $eq: 'a' } },
          { $or: [{ title: { $eq: 'b' } }, { title: { $eq: 'c' } }] },
        ],
      });
    });

    it('turns none into $not', () => {
      const condition = base({
        which: { kind: 'group', match: 'none', items: [titleIs('a'), titleIs('b')] },
      });

      expect(run(condition)).toEqual({
        $not: { $or: [{ title: { $eq: 'a' } }, { title: { $eq: 'b' } }] },
      });
    });

    it('nests paths', () => {
      const condition = base({
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'check',
              target: { path: ['folder', 'name'] },
              operator: '$eq',
              value: fixed('x'),
            },
          ],
        },
      });

      expect(run(condition)).toEqual({ $and: [{ folder: { name: { $eq: 'x' } } }] });
    });

    it('builds values from placeholders, and a time in UTC', () => {
      const check = (value: EntryCheck | EntryGroup) => value;
      const condition = base({
        inputs: [{ name: 'label', kind: 'text', required: true }],
        which: {
          kind: 'group',
          match: 'all',
          items: [
            check({
              kind: 'check',
              target: { path: ['title'] },
              operator: '$eq',
              value: { kind: 'input', name: 'label' },
            }),
            check({
              kind: 'check',
              target: { path: ['body'] },
              operator: '$eq',
              value: { kind: 'user', attribute: 'email' },
            }),
            check({
              kind: 'check',
              target: { path: ['title'] },
              operator: '$eq',
              value: { kind: 'profile', attribute: 'company' },
            }),
            check({
              kind: 'check',
              target: { path: ['owner', 'documentId'] },
              operator: '$in',
              value: { kind: 'user', attribute: 'roles.documentId' },
            }),
            check({
              kind: 'check',
              target: { path: ['createdAt'] },
              operator: '$gt',
              value: { kind: 'now', offset: { amount: -7, unit: 'days' } },
            }),
            check({
              kind: 'check',
              target: { path: ['views'] },
              operator: '$null',
              value: fixed(false),
            }),
          ],
        },
      });
      const definition = compileBuilderCondition(strapi(), condition);
      const filter = (definition.query as (c: ConditionContext) => Record<string, unknown>)({
        user: USER,
        params: { label: 'x' },
        uid: NOTE,
        now: NOW,
      });

      expect(filter).toEqual({
        $and: [
          { title: { $eq: '$params.label' } },
          { body: { $eq: '$user.email' } },
          { title: { $eq: '$profile.company' } },
          { owner: { documentId: { $in: '$user.roles.documentId' } } },
          { createdAt: { $gt: '2026-10-28T12:00:00.000Z' } },
          { views: { $null: false } },
        ],
      });
      expect(run(condition, { params: { label: 'x' } })).toMatchObject({
        $and: [
          { title: { $eq: 'x' } },
          { body: { $eq: 'a@example.com' } },
          { title: { $eq: 'Acme' } },
          { owner: { documentId: { $in: ['role-a'] } } },
          { createdAt: { $gt: '2026-10-28T12:00:00.000Z' } },
          { views: { $null: false } },
        ],
      });
    });

    it('is false when a value has nothing: an optional input left out, a profile without the field', () => {
      const input = base({
        inputs: [{ name: 'label', kind: 'text', required: false }],
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'check',
              target: { path: ['title'] },
              operator: '$eq',
              value: { kind: 'input', name: 'label' },
            },
          ],
        },
      });
      const profile = base({
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'check',
              target: { path: ['title'] },
              operator: '$eq',
              value: { kind: 'profile', attribute: 'nope' },
            },
          ],
        },
      });

      expect(run(input)).toBe(false);
      expect(run(profile)).toBe(false);
    });

    it('never puts undefined in the filter: a check with no value is false', () => {
      const condition = base({
        which: {
          kind: 'group',
          match: 'all',
          items: [{ kind: 'check', target: { path: ['title'] }, operator: '$eq' }],
        },
      });

      expect(run(condition)).toBe(false);
    });
  });

  describe('an input as the field', () => {
    const owned = (accepts: 'text' | { relation: string }) =>
      base({
        inputs: [{ name: 'owner', kind: 'field', accepts, required: true }],
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'check',
              target: { input: 'owner' },
              operator: '$eq',
              value: { kind: 'user', attribute: 'documentId' },
            },
          ],
        },
      });

    it('names the attribute from the param', () => {
      expect(run(owned({ relation: USER_UID }), { params: { owner: 'author' } })).toEqual({
        $and: [{ author: { documentId: { $eq: 'user-a' } } }],
      });
    });

    it('is false for an attribute of the wrong kind, a missing one or a private one', () => {
      const condition = owned({ relation: USER_UID });

      expect(run(condition, { params: { owner: 'body' } })).toBe(false);
      expect(run(condition, { params: { owner: 'folder' } })).toBe(false);
      expect(run(condition, { params: { owner: 'gone' } })).toBe(false);
      expect(run(owned('text'), { params: { owner: 'secret' } })).toBe(false);
      expect(run(owned('text'), { params: { owner: 'constructor' } })).toBe(false);
      expect(run(owned('text'), { params: { owner: 'views' } })).toBe(false);
      expect(run(owned('text'), { params: { owner: 'title' } })).toEqual({
        $and: [{ title: { $eq: 'user-a' } }],
      });
    });

    it('is false on a type the attribute does not exist on', () => {
      expect(run(owned({ relation: USER_UID }), { params: { owner: 'author' }, uid: PLAIN })).toBe(
        false
      );
    });
  });

  describe('closing what a later schema could widen', () => {
    const asks = (
      operator: string,
      match: 'all' | 'any' | 'none' = 'all',
      accepts: { relation: string } | 'text' = { relation: USER_UID }
    ) =>
      base({
        inputs: [{ name: 'who', kind: 'field', accepts, required: true }],
        which: {
          kind: 'group',
          match,
          items: [
            {
              kind: 'check',
              target: { input: 'who' },
              operator,
              value: { kind: 'user', attribute: 'documentId' },
            },
          ],
        },
      });

    it('is false for a negating operator, or a none group, on a to-many relation input', () => {
      expect(run(asks('$ne'), { params: { who: 'reviewers' } })).toBe(false);
      expect(run(asks('$notIn'), { params: { who: 'reviewers' } })).toBe(false);
      expect(run(asks('$eq', 'none'), { params: { who: 'reviewers' } })).toBe(false);
      expect(
        run(
          base({
            inputs: [
              { name: 'who', kind: 'field', accepts: { relation: USER_UID }, required: true },
            ],
            which: {
              kind: 'group',
              match: 'all',
              items: [
                {
                  kind: 'group',
                  match: 'none',
                  items: [
                    { kind: 'check', target: { input: 'who' }, operator: '$eq', value: fixed('x') },
                  ],
                },
              ],
            },
          }),
          { params: { who: 'reviewers' } }
        )
      ).toBe(false);
    });

    it('still takes a positive operator on a to-many relation, and a negating one on a to-one', () => {
      expect(run(asks('$eq'), { params: { who: 'reviewers' } })).not.toBe(false);
      expect(run(asks('$ne'), { params: { who: 'author' } })).not.toBe(false);
      expect(run(asks('$eq', 'none'), { params: { who: 'author' } })).not.toBe(false);
    });

    it('is false for a negating operator on a static path that crosses a to-many relation', () => {
      const through = (operator: string) =>
        base({
          which: {
            kind: 'group',
            match: 'all',
            items: [
              { kind: 'check', target: { path: ['tags', 'name'] }, operator, value: fixed('x') },
            ],
          },
        });

      expect(run(through('$ne'))).toBe(false);
      expect(run(through('$eq'))).not.toBe(false);
    });

    it('is false for an empty nested any group, and an empty root still asks nothing', () => {
      const nested = base({
        which: {
          kind: 'group',
          match: 'all',
          items: [titleIs('a'), { kind: 'group', match: 'any', items: [] }],
        },
      });

      expect(run(nested)).toBe(false);
      expect(run(base({ which: { kind: 'group', match: 'any', items: [] } }))).toEqual({});
    });

    it('is false for roles that are not a list, for any and none', () => {
      const roles = (match: 'any' | 'none') =>
        base({ who: { match: 'all', checks: [{ kind: 'roles', match, roles: ['Editor'] }] } });
      const user = { ...USER, roles: undefined } as unknown as ConditionContext['user'];

      expect(run(roles('any'), { user })).toBe(false);
      expect(run(roles('none'), { user })).toBe(false);
    });

    it('is false when a static path is not an own, public attribute of the type asked', () => {
      const at = (path: string[]) =>
        base({
          which: {
            kind: 'group',
            match: 'all',
            items: [{ kind: 'check', target: { path }, operator: '$eq', value: fixed('x') }],
          },
        });

      expect(run(at(['title']), { uid: PLAIN })).not.toBe(false);
      expect(run(at(['body']), { uid: PLAIN })).toBe(false);
      expect(run(at(['title']), { uid: 'api::new.new' })).toBe(false);
      expect(run(at(['secret']))).toBe(false);
      expect(run(at(['constructor']))).toBe(false);
      expect(run(at(['folder', 'nope']))).toBe(false);
      expect(run(at(['title', 'name']))).toBe(false);
      expect(run(at(['folder', 'documentId']))).not.toBe(false);
    });

    it('is false on a type whose field of the same name has another type', () => {
      const schemas = {
        ...SCHEMAS,
        [PLAIN]: { uid: PLAIN, attributes: { title: { type: 'integer' } } },
      };
      const at = (operator: string, value: string) =>
        base({
          which: {
            kind: 'group',
            match: 'all',
            items: [{ kind: 'check', target: { path: ['title'] }, operator, value: fixed(value) }],
          },
        });

      // Still a filter on the type it was made for
      expect(run(at('$startsWith', 'ok'), { schemas })).not.toBe(false);
      // An operator the integer field doesn't offer, and a text value it can't take
      expect(run(at('$startsWith', 'ok'), { schemas, uid: PLAIN })).toBe(false);
      expect(run(at('$eq', 'ok'), { schemas, uid: PLAIN })).toBe(false);
    });

    it('is false on a type whose field has another kind than an input, user or profile value', () => {
      const schemas = {
        ...SCHEMAS,
        [PLAIN]: { uid: PLAIN, attributes: { title: { type: 'integer' } } },
      };
      const notEqual = (value: BuilderValue, inputs: BuilderConditionV2['inputs'] = []) =>
        base({
          inputs,
          which: {
            kind: 'group',
            match: 'all',
            items: [{ kind: 'check', target: { path: ['title'] }, operator: '$ne', value }],
          },
        });
      const text = [{ name: 'word', kind: 'text' as const, required: true }];

      // A negating check would otherwise match every entry of the integer type
      expect(run(notEqual({ kind: 'user', attribute: 'email' }), { schemas, uid: PLAIN })).toBe(
        false
      );
      expect(
        run(notEqual({ kind: 'profile', attribute: 'company' }), { schemas, uid: PLAIN })
      ).toBe(false);
      expect(
        run(notEqual({ kind: 'input', name: 'word' }, text), {
          schemas,
          uid: PLAIN,
          params: { word: 'x' },
        })
      ).toBe(false);
      expect(run(notEqual({ kind: 'now' }), { schemas, uid: PLAIN })).toBe(false);
      // The same checks still filter on the type they were made for
      expect(run(notEqual({ kind: 'user', attribute: 'email' }), { schemas })).not.toBe(false);
      expect(
        run(notEqual({ kind: 'input', name: 'word' }, text), { schemas, params: { word: 'x' } })
      ).not.toBe(false);
    });

    it('is false for a fixed value the field enumeration no longer offers', () => {
      const schemas = {
        ...SCHEMAS,
        [PLAIN]: { uid: PLAIN, attributes: { title: { type: 'enumeration', enum: ['a', 'b'] } } },
      };
      const is = (value: string) =>
        base({
          which: {
            kind: 'group',
            match: 'all',
            items: [
              { kind: 'check', target: { path: ['title'] }, operator: '$eq', value: fixed(value) },
            ],
          },
        });

      expect(run(is('a'), { schemas, uid: PLAIN })).not.toBe(false);
      expect(run(is('gone'), { schemas, uid: PLAIN })).toBe(false);
    });

    it('counts only public relations to the user for user-relation', () => {
      const schemas = {
        ...SCHEMAS,
        [PLAIN]: { uid: PLAIN, attributes: { hidden: { ...relation(USER_UID), private: true } } },
      };
      const definition = compileBuilderCondition(
        strapi(schemas),
        base({ appliesTo: { kind: 'user-relation' } })
      );

      expect(appliesTo(definition, PLAIN)).toBe(false);
      expect(appliesTo(definition, NOTE)).toBe(true);
    });
  });

  describe('onSave', () => {
    const stamping = base({
      inputs: [{ name: 'folder', kind: 'text', required: true }],
      onSave: {
        stamp: [
          { field: 'owner', value: { kind: 'user' } },
          { field: 'title', value: { kind: 'input', name: 'folder' } },
          { field: 'views', value: { kind: 'fixed', value: 0 } },
        ],
        locked: ['owner', 'views'],
      },
    });

    it('stamps the user, an input and a fixed value, and nothing without a user', () => {
      const definition = compileBuilderCondition(strapi(), stamping);
      const ctx = { user: USER, params: { folder: 'F' }, uid: NOTE, now: NOW };

      expect(definition.stamp?.(ctx)).toEqual({
        owner: { set: [{ documentId: 'user-a' }] },
        title: 'F',
        views: 0,
      });
      expect(definition.stamp?.({ ...ctx, user: null })).toBeNull();
    });

    it('denies the write when a stamp input has no value, rather than leaving the one of the client', () => {
      const definition = compileBuilderCondition(strapi(), stamping);
      const ctx = { user: USER, params: {}, uid: NOTE, now: NOW };

      expect(() => definition.stamp?.(ctx)).toThrow(/no value to stamp/);
      expect(() => definition.stamp?.({ ...ctx, params: { folder: null } })).toThrow(
        /no value to stamp/
      );
      // Core takes a throw as a condition that is false
      expect(applyCondition({ definition, params: {} }, { user: USER, uid: NOTE, now: NOW })).toBe(
        false
      );
    });

    it('stamps an input that has a default, which core fills in', () => {
      const definition = compileBuilderCondition(
        strapi(),
        base({
          inputs: [{ name: 'folder', kind: 'text', required: false, default: 'Inbox' }],
          onSave: {
            stamp: [{ field: 'title', value: { kind: 'input', name: 'folder' } }],
            locked: [],
          },
        })
      );

      expect(
        applyCondition({ definition, params: {} }, { user: USER, uid: NOTE, now: NOW })
      ).toMatchObject({ filter: {}, stamp: { title: 'Inbox' } });
    });

    it('denies the stamp on a type that lacks the field', () => {
      const definition = compileBuilderCondition(strapi(), stamping);

      expect(() =>
        definition.stamp?.({ user: USER, params: { folder: 'F' }, uid: PLAIN, now: NOW })
      ).toThrow(/has no field owner/);
    });

    it('declares no stamp when there is none to write, so Public is not refused by it', () => {
      expect(compileBuilderCondition(strapi(), base()).stamp).toBeUndefined();
    });

    it('lists the locked fields, as a copy', () => {
      const definition = compileBuilderCondition(strapi(), stamping);
      const ctx = { user: USER, params: {}, uid: NOTE, now: NOW };
      const first = definition.lockedFields?.(ctx);

      expect(first).toEqual(['owner', 'views']);
      first?.push('x');
      expect(definition.lockedFields?.(ctx)).toEqual(['owner', 'views']);
    });
  });

  describe('usesProfile', () => {
    it('is true for a profile Who check or a profile value, false otherwise', () => {
      const who = base({
        who: { match: 'all', checks: [whoAttribute('profile', 'tier', '$eq', fixed('gold'))] },
      });
      const value = base({
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'group',
              match: 'any',
              items: [
                {
                  kind: 'check',
                  target: { path: ['title'] },
                  operator: '$eq',
                  value: { kind: 'profile', attribute: 'company' },
                },
              ],
            },
          ],
        },
      });
      const user = base({
        who: { match: 'all', checks: [whoAttribute('user', 'plan', '$eq', fixed('pro'))] },
      });

      expect(compileBuilderCondition(strapi(), who).usesProfile).toBe(true);
      expect(compileBuilderCondition(strapi(), value).usesProfile).toBe(true);
      expect(compileBuilderCondition(strapi(), user).usesProfile).toBe(false);
      expect(compileBuilderCondition(strapi(), base()).usesProfile).toBe(false);
    });
  });
});

describe('matchesAccepts', () => {
  it('takes a date or a date and time for date, and not a time of day', () => {
    expect(matchesAccepts({ type: 'date' }, 'date')).toBe(true);
    expect(matchesAccepts({ type: 'datetime' }, 'date')).toBe(true);
    expect(matchesAccepts({ type: 'time' }, 'date')).toBe(false);
    // And a text does not take any of them
    expect(matchesAccepts({ type: 'time' }, 'text')).toBe(false);
    expect(matchesAccepts({ type: 'string' }, 'text')).toBe(true);
  });
});

describe('staleReferences', () => {
  const condition = base({
    appliesTo: { kind: 'types', types: [NOTE, 'api::gone.gone'] },
    who: { match: 'all', checks: [whoAttribute('profile', 'tier', '$eq', fixed('gold'))] },
    which: {
      kind: 'group',
      match: 'all',
      items: [
        { kind: 'check', target: { path: ['title'] }, operator: '$eq', value: fixed('x') },
        { kind: 'check', target: { path: ['folder', 'name'] }, operator: '$eq', value: fixed('x') },
      ],
    },
    onSave: { stamp: [{ field: 'owner', value: { kind: 'user' } }], locked: ['owner'] },
  });

  it('is empty when everything is there', () => {
    expect(
      staleReferences(strapi(), { ...condition, appliesTo: { kind: 'types', types: [NOTE] } })
    ).toEqual([]);
  });

  it('names a removed content type', () => {
    expect(staleReferences(strapi(), condition)).toEqual(['content type api::gone.gone']);
  });

  it('names a removed field on one type only', () => {
    const schemas = {
      ...SCHEMAS,
      [NOTE]: { uid: NOTE, attributes: { ...SCHEMAS[NOTE].attributes } },
    };
    delete schemas[NOTE].attributes.title;

    expect(staleReferences(strapi(schemas), condition)).toEqual([
      `field "title" of ${NOTE}`,
      'content type api::gone.gone',
    ]);
  });

  it('names a removed hop of a path, the profile attribute and a removed target type', () => {
    const noName = { ...SCHEMAS, [FOLDER]: { uid: FOLDER, attributes: {} } };

    expect(
      staleReferences(strapi(noName), { ...condition, appliesTo: { kind: 'types', types: [NOTE] } })
    ).toEqual([`field "folder.name" of ${NOTE}`]);

    const noTarget = { ...SCHEMAS };
    delete (noTarget as Record<string, unknown>)[FOLDER];

    expect(
      staleReferences(strapi(noTarget), {
        ...condition,
        appliesTo: { kind: 'types', types: [NOTE] },
      })
    ).toEqual([`content type ${FOLDER}`]);

    const noTier = { ...SCHEMAS, [PROFILE_UID]: { uid: PROFILE_UID, attributes: {} } };

    expect(
      staleReferences(strapi(noTier), { ...condition, appliesTo: { kind: 'types', types: [NOTE] } })
    ).toEqual([`field "tier" of ${PROFILE_UID}`]);
  });
  it('names a deleted type a field input accepts', () => {
    const withInput = (relation: string) =>
      base({
        appliesTo: { kind: 'types', types: [NOTE] },
        inputs: [{ name: 'pick', kind: 'field', accepts: { relation }, required: true }],
      });

    expect(staleReferences(strapi(), withInput(FOLDER))).toEqual([]);
    expect(staleReferences(strapi(), withInput('api::gone.gone'))).toEqual([
      'content type api::gone.gone',
    ]);
  });

  describe('on every type, or the types with a user relation', () => {
    const offered = [NOTE, FOLDER, PLAIN, PROFILE_UID];
    const reading = (kind: 'all' | 'user-relation', path: string[], extra = {}) =>
      base({
        appliesTo: { kind },
        which: {
          kind: 'group',
          match: 'all',
          items: [{ kind: 'check', target: { path }, operator: '$eq', value: fixed('x') }],
        },
        ...extra,
      });

    it('is empty when some type has the path, though others lack it', () => {
      expect(staleReferences(strapi(), reading('all', ['views']), offered)).toEqual([]);
      expect(staleReferences(strapi(), reading('user-relation', ['title']), offered)).toEqual([]);
    });

    it('names a path, a stamped field and a locked field that no type has', () => {
      expect(staleReferences(strapi(), reading('all', ['vanished']), offered)).toEqual([
        'field "vanished" on any content type',
      ]);
      expect(
        staleReferences(
          strapi(),
          reading('all', ['title'], {
            onSave: { stamp: [{ field: 'gone', value: { kind: 'user' } }], locked: ['alsoGone'] },
          }),
          offered
        )
      ).toEqual(['field "gone" on any content type', 'field "alsoGone" on any content type']);
    });
  });
});
