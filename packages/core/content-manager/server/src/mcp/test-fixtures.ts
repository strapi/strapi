import { Ability, AbilityBuilder } from '@casl/ability';
import type { Core } from '@strapi/types';

import { type ContentManagerModelForMcp } from './derive-content-type-mcp-tools';
import { ACTIONS } from '../services/permission-checker';

// ---------------------------------------------------------------------------
// Shared fixtures for the MCP test suites.
//
// `derive-content-type-mcp-tools.test.ts` covers tool derivation and handlers;
// `data-schema.test.ts` covers the `data` schema builder. Both need the same
// mock Strapi instance, model builders and request context, so they live here
// rather than being duplicated (or re-exported from one suite into the other).
// ---------------------------------------------------------------------------

export type TestAttrs = ContentManagerModelForMcp['attributes'];

export const mockStrapi = {
  get: jest.fn(() => ({ get: jest.fn(() => undefined) })),
  components: {
    'shared.seo': {
      attributes: {
        title: { type: 'string' },
        description: { type: 'text' },
        url: { type: 'text' },
      },
    },
    'shared.nested': {
      attributes: {
        label: { type: 'string' },
        inner: { type: 'component', component: 'shared.seo' },
      },
    },
    'shared.circular': {
      attributes: {
        name: { type: 'string' },
        self: { type: 'component', component: 'shared.circular' },
      },
    },
    'shared.reqseo': {
      attributes: {
        title: { type: 'string', required: true },
        author: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::author.author',
          required: true,
        },
      },
    },
  },
} as unknown as Core.Strapi;

export const baseModel = (
  overrides: Partial<ContentManagerModelForMcp>
): ContentManagerModelForMcp => ({
  uid: 'api::article.article',
  kind: 'collectionType',
  apiID: 'article',
  options: {},
  attributes: {},
  ...overrides,
});

/** Helper: build a minimal model object for isWritableAttribute calls in tests. */
export const makeModel = (attrs: TestAttrs): ContentManagerModelForMcp => ({
  uid: 'api::test.test',
  kind: 'collectionType',
  apiID: 'test',
  options: {},
  attributes: attrs,
});

/** Helper: same as makeModel but with draft-and-publish enabled (create resolves to a draft). */
export const makeDpModel = (attrs: TestAttrs): ContentManagerModelForMcp => ({
  uid: 'api::test.test',
  kind: 'collectionType',
  apiID: 'test',
  options: { draftAndPublish: true },
  attributes: attrs,
});

export const makeUserAbility = (canResult = true): Ability => {
  const { can, build } = new AbilityBuilder(Ability);

  if (canResult === true) {
    can('manage', 'all');
  }

  return build();
};

export const makeFieldRestrictedAbility = (
  permittedFields: string[],
  uid = 'api::article.article'
): Ability => {
  const { can, build } = new AbilityBuilder(Ability);

  for (const action of Object.values(ACTIONS)) {
    for (const field of permittedFields) {
      can(action, uid, field);
    }
  }

  return build();
};

export const mockUser = { id: 42 };
export const mockContext = { userAbility: makeUserAbility(), user: mockUser };
