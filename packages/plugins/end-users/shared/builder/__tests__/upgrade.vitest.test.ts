import { describe, expect, it } from 'vitest';

import { upgradeVersion1 } from '../upgrade';

const file = (...clauses: Array<Record<string, unknown>>) => ({
  slug: 'mine',
  displayName: 'Mine',
  subjects: ['api::article.article'],
  query: { $and: clauses },
});

describe('upgradeVersion1', () => {
  it('turns a clause into an entry check inside an "all of" group', () => {
    const upgraded = upgradeVersion1(file({ title: { $contains: 'E2E' } }));

    expect(upgraded).toEqual({
      version: 2,
      slug: 'mine',
      displayName: 'Mine',
      appliesTo: { kind: 'types', types: ['api::article.article'] },
      inputs: [],
      who: { match: 'all', checks: [] },
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
        ],
      },
      onSave: { stamp: [], locked: [] },
    });
  });

  it('turns placeholders into tagged values and a relation into a documentId path', () => {
    const { which } = upgradeVersion1(
      file(
        { author: { documentId: { $eq: '$user.documentId' } } },
        { publishedAt: { $lt: '$now' } },
        { status: { $in: ['a', 'b'] } }
      )
    );

    expect(which.items).toEqual([
      {
        kind: 'check',
        target: { path: ['author', 'documentId'] },
        operator: '$eq',
        value: { kind: 'user', attribute: 'documentId' },
      },
      { kind: 'check', target: { path: ['publishedAt'] }, operator: '$lt', value: { kind: 'now' } },
      {
        kind: 'check',
        target: { path: ['status'] },
        operator: '$in',
        value: { kind: 'fixed', value: ['a', 'b'] },
      },
    ]);
  });

  it('makes one check for each operator of a row', () => {
    const { which } = upgradeVersion1(file({ age: { $gte: 3, $lt: 10 } }));

    expect(which.items.map((item) => item.kind === 'check' && item.operator)).toEqual([
      '$gte',
      '$lt',
    ]);
  });

  it('refuses a list that holds a placeholder', () => {
    expect(() => upgradeVersion1(file({ author: { $in: ['$user.email'] } }))).toThrow(
      "Can't upgrade author: a list can't hold $user, $profile or $params values."
    );
    expect(() => upgradeVersion1(file({ seenAt: { $notIn: ['$now'] } }))).toThrow(
      /Can't upgrade seenAt/
    );
  });

  it('refuses a placeholder it has no value for', () => {
    expect(() => upgradeVersion1(file({ title: { $eq: '$params.id' } }))).toThrow(
      /Can't upgrade title/
    );
  });

  it('refuses a clause it cannot carry over, never returning a smaller rule', () => {
    expect(() => upgradeVersion1(file({ title: {} }))).toThrow(/Can't upgrade title/);
    expect(() => upgradeVersion1(file({ title: 'x' }))).toThrow(/Can't upgrade title/);
    expect(() => upgradeVersion1(file({ author: { documentId: {} } }))).toThrow(
      /Can't upgrade author/
    );
    expect(() =>
      upgradeVersion1(file({ author: { documentId: { $eq: 'a' }, name: { $eq: 'b' } } }))
    ).toThrow(/Can't upgrade author/);
    expect(() => upgradeVersion1(file({}))).toThrow(/a clause is empty/);
  });

  it('refuses a rule with no clauses', () => {
    expect(() => upgradeVersion1(file())).toThrow(/no clauses/);
  });
});
