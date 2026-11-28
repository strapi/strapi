import { describe, it, expect } from 'vitest';

import { getRelationKind } from '../relation-kinds';

describe('relation kinds', () => {
  describe('getRelationKind', () => {
    it.each([
      [{ relation: 'oneToOne' }, 'oneWay'],
      [{ relation: 'oneToOne', targetAttribute: null }, 'oneWay'],
      [{ relation: 'oneToMany', targetAttribute: undefined }, 'manyWay'],
      [{ relation: 'oneToOne', targetAttribute: 'article' }, 'oneToOne'],
      [{ relation: 'oneToOne', inversedBy: 'article' }, 'oneToOne'],
      [{ relation: 'oneToOne', mappedBy: 'article' }, 'oneToOne'],
      [{ relation: 'oneToMany', targetAttribute: 'article' }, 'oneToMany'],
      [{ relation: 'oneToMany', mappedBy: 'article' }, 'oneToMany'],
      [{ relation: 'manyToOne' }, 'manyToOne'],
      [{ relation: 'manyToOne', targetAttribute: 'articles' }, 'manyToOne'],
      [{ relation: 'manyToMany' }, 'manyToMany'],
      [{ relation: 'morphOne', targetAttribute: 'article' }, 'morphOne'],
      [{ relation: 'morphToMany' }, 'morphToMany'],
    ])('maps %j to %s', (attribute, kind) => {
      expect(getRelationKind(attribute)).toBe(kind);
    });

    it('has no kind when the relation is missing', () => {
      expect(getRelationKind({})).toBeUndefined();
    });
  });
});
