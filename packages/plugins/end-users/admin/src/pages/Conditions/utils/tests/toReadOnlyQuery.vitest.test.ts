import { describe, expect, it } from 'vitest';

import { toReadOnlyQuery } from '../toReadOnlyQuery';

/** What the page passes: the message, with its values put in */
const translate = (
  message: { id: string; defaultMessage: string },
  values: Record<string, string> = {}
) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, value),
    message.defaultMessage
  );

/** The chip of each row, and the option that names its field and its dynamic values */
const read = (query: Record<string, unknown>) => toReadOnlyQuery(query, translate);

describe('toReadOnlyQuery', () => {
  it('reads the rows of the builder, `$and` of clauses with an operator each', () => {
    const query = read({
      $and: [{ views: { $gte: 3 } }, { title: { $startsWith: 'A', $notContains: 'B' } }],
    });

    expect(query?.filters.$and).toEqual([
      { views: { $gte: '3' } },
      { title: { $startsWith: 'A' } },
      { title: { $notContains: 'B' } },
    ]);
    // One option per field, however many rows it has
    expect(query?.options.map(({ name }) => name)).toEqual(['views', 'title']);
  });

  it('reads fields beside each other, a value without an operator, and `$and` among them', () => {
    expect(
      read({ published: true, $and: [{ kind: { $in: ['news', 'blog'] } }], views: { $lt: 10 } })
        ?.filters.$and
    ).toEqual([
      { published: { $eq: 'true' } },
      { kind: { $in: 'news, blog' } },
      { views: { $lt: '10' } },
    ]);
  });

  it('reads "is null" and "is not null" as rows with no value, and false as the other one', () => {
    expect(
      read({ cover: { $null: true }, body: { $notNull: false }, seo: { $notNull: true } })?.filters
        .$and
    ).toEqual([
      { cover: { $null: 'true' } },
      { body: { $null: 'true' } },
      { seo: { $notNull: 'true' } },
    ]);
  });

  it('reads the fields of a relation under its path', () => {
    const query = read({ author: { profile: { country: { $eq: 'FR' } } } });

    expect(query?.filters.$and).toEqual([{ 'author.profile.country': { $eq: 'FR' } }]);
    expect(query?.options.map(({ name, label }) => [name, label])).toEqual([
      ['author.profile.country', 'author.profile.country'],
    ]);
  });

  it('says "the signed-in user" for a relation that is the signed-in user, and names the relation', () => {
    const query = read({ owner: { documentId: { $eq: '$user.documentId' } } });

    expect(query?.filters.$and).toEqual([{ owner: { $eq: '$user.documentId' } }]);
    expect(query?.options).toHaveLength(1);
    expect(query?.options[0]).toMatchObject({
      name: 'owner',
      options: [{ value: '$user.documentId', label: 'the signed-in user' }],
    });
  });

  it('labels the values that are only known when the query runs', () => {
    const query = read({
      documentId: { $eq: '$user.documentId' },
      email: { $eq: '$user.email' },
      expires: { $gt: '$now' },
      tier: { $eq: '$params.tier' },
      note: { $eq: 'plain' },
    });
    const labels = Object.fromEntries(
      (query?.options ?? []).map((option) => [option.name, option.options])
    );

    expect(labels.documentId).toEqual([
      { value: '$user.documentId', label: "the signed-in user's ID" },
    ]);
    expect(labels.email).toEqual([{ value: '$user.email', label: "the signed-in user's email" }]);
    expect(labels.expires).toEqual([{ value: '$now', label: 'now' }]);
    expect(labels.tier).toEqual([{ value: '$params.tier', label: 'the tier param' }]);
    // A plain value is shown as it is
    expect(labels.note).toEqual([]);
  });

  it('gives each option an input, which the chips need to show a label for a value', () => {
    const [option] = read({ title: { $eq: 'x' } })?.options ?? [];

    expect(option.input).toBeTypeOf('function');
    expect(option.type).toBe('custom');
  });

  it.each([
    ['an $or', { $or: [{ title: { $eq: 'x' } }, { title: { $eq: 'y' } }] }],
    ['a $not', { $not: { title: { $eq: 'x' } } }],
    ['an $or inside a relation', { author: { $or: [{ name: 'a' }] } }],
    ['an operator mixed with fields', { author: { $eq: 'x', name: 'y' } }],
    ['a value that is not a scalar', { title: { $eq: { nested: true } } }],
    ['a null', { title: null }],
    ['an empty list', { kind: { $in: [] } }],
    ['a list of objects', { kind: { $in: [{ a: 1 }] } }],
    ['an empty field', { title: {} }],
    ['an empty query', {}],
    ['a flag that is not a boolean', { cover: { $null: 'yes' } }],
    ['an $and that is not a list', { $and: { title: 'x' } }],
  ])('leaves %s to be shown as it is written', (_name, query) => {
    expect(read(query as Record<string, unknown>)).toBeUndefined();
  });
});
