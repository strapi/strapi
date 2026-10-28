import { getRelationId } from '../getRelationId';

describe('getRelationId', () => {
  it('reads the id off a populated relation', () => {
    expect(getRelationId({ id: 4 })).toBe(4);
  });

  it('returns null for a populated relation without an id', () => {
    expect(getRelationId({})).toBe(null);
  });

  it('passes a numeric id through', () => {
    expect(getRelationId(7)).toBe(7);
  });

  it('coerces a string id', () => {
    expect(getRelationId('7')).toBe(7);
  });

  it('returns null for null and undefined', () => {
    expect(getRelationId(null)).toBe(null);
    expect(getRelationId(undefined)).toBe(null);
  });
});
