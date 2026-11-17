import { describe, expect, it } from 'vitest';
import { Ability } from '@casl/ability';

import { buildCaslQuery, buildStrapiQuery } from '..';

describe('Query builders', () => {
  it('maps CASL operators as admin did', () =>
    expect(buildStrapiQuery({ a: { $nin: [1] }, b: { $exists: true } })).toEqual({
      a: { $notIn: [1] },
      b: { $notNull: true },
    }));

  it('ORs the conditions of the rules for an action and subject', () => {
    const ability = new Ability([
      { action: 'find', subject: 'note', conditions: { owner: { $eq: 'u1' } } },
      { action: 'find', subject: 'note', conditions: { shared: { $eq: true } } },
      { action: 'find', subject: 'other', conditions: { other: { $eq: 1 } } },
    ]);

    expect(buildStrapiQuery(buildCaslQuery(ability, 'find', 'note'))).toEqual({
      $or: [{ shared: { $eq: true } }, { owner: { $eq: 'u1' } }],
    });
  });

  it('gives {} when a rule has no conditions and null when no rule applies', () => {
    const ability = new Ability([
      { action: 'find', subject: 'note', conditions: { owner: { $eq: 'u1' } } },
      { action: 'find', subject: 'note' },
    ]);

    expect(buildStrapiQuery(buildCaslQuery(ability, 'find', 'note'))).toEqual({});
    expect(buildStrapiQuery(buildCaslQuery(ability, 'update', 'note'))).toBeNull();
  });
});
