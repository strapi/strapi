import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';

import { toCondition, toForm } from '../builderForm';
import { summarize } from '../summarize';

import type { BuilderConditionV2 } from '../../../../../../shared/builder/types';
import type { BuilderLayout } from '../../../../../../shared/contracts/conditions';

const { formatMessage } = createIntl({ locale: 'en', defaultLocale: 'en', onError: () => {} });

const layout: BuilderLayout = {
  contentTypes: [
    {
      uid: 'api::article.article',
      displayName: 'Article',
      kind: 'collectionType',
      attributes: [],
      userRelations: [],
    },
    {
      uid: 'api::page.page',
      displayName: 'Page',
      kind: 'collectionType',
      attributes: [],
      userRelations: [],
    },
  ],
  userAttributes: [],
  profileAttributes: [],
  roles: ['Editor'],
};

const base = toCondition(toForm());

const condition: BuilderConditionV2 = {
  ...base,
  slug: 'x',
  displayName: 'X',
  appliesTo: { kind: 'types', types: ['api::article.article', 'api::page.page'] },
  who: { match: 'all', checks: [{ kind: 'roles', match: 'any', roles: ['Editor'] }] },
  which: {
    kind: 'group',
    match: 'all',
    items: [
      {
        kind: 'check',
        target: { path: ['title'] },
        operator: '$contains',
        value: { kind: 'fixed', value: 'E2E' },
      },
      {
        kind: 'group',
        match: 'any',
        items: [
          {
            kind: 'check',
            target: { path: ['author', 'documentId'] },
            operator: '$eq',
            value: { kind: 'user', attribute: 'documentId' },
          },
          {
            kind: 'check',
            target: { path: ['publishedAt'] },
            operator: '$gt',
            value: { kind: 'now', offset: { amount: -7, unit: 'days' } },
          },
        ],
      },
    ],
  },
  onSave: {
    stamp: [{ field: 'author', value: { kind: 'user' } }],
    locked: ['author', 'status'],
  },
};

describe('summarize', () => {
  it('says one sentence for each part', () => {
    expect(summarize(condition, layout, formatMessage)).toEqual([
      'Applies to Article and Page.',
      'Only for users who hold Editor.',
      "Keeps entries where title contains 'E2E' and any of: author.documentId is the signed-in user; publishedAt is more than now minus 7 days.",
      'On create, sets author to the signed-in user.',
      'author and status cannot be changed after create.',
    ]);
  });

  it('says what applies and who for the other shapes', () => {
    const other: BuilderConditionV2 = {
      ...condition,
      appliesTo: { kind: 'all' },
      who: {
        match: 'any',
        checks: [
          { kind: 'roles', match: 'none', roles: ['Editor'] },
          { kind: 'email-verified', value: true },
        ],
      },
      onSave: { stamp: [], locked: [] },
    };

    expect(summarize(other, layout, formatMessage).slice(0, 2)).toEqual([
      'Applies to every content type.',
      'Only for users who hold none of Editor or have a verified email.',
    ]);
  });

  it('says that an empty condition restricts nothing', () => {
    expect(summarize(base, layout, formatMessage)).toEqual(['Restricts nothing.']);
  });
});
