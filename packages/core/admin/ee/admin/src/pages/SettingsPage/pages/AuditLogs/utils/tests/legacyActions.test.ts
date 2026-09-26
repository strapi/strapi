import { expandLegacyActionFilters, isLegacyAction } from '../legacyActions';

describe('legacyActions', () => {
  it('marks the three legacy keys and nothing else', () => {
    expect(isLegacyAction('user.create')).toBe(true);
    expect(isLegacyAction('user.update')).toBe(true);
    expect(isLegacyAction('user.delete')).toBe(true);
    expect(isLegacyAction('admin-user.create')).toBe(false);
    expect(isLegacyAction('entry.create')).toBe(false);
  });

  it('expands an equality on a new key into $in over both keys', () => {
    expect(expandLegacyActionFilters({ $and: [{ action: { $eq: 'admin-user.update' } }] })).toEqual(
      { $and: [{ action: { $in: ['admin-user.update', 'user.update'] } }] }
    );
  });

  it('expands a negation into $notIn over both keys', () => {
    expect(expandLegacyActionFilters({ $and: [{ action: { $ne: 'admin-user.delete' } }] })).toEqual(
      { $and: [{ action: { $notIn: ['admin-user.delete', 'user.delete'] } }] }
    );
  });

  it('leaves other actions and other fields untouched', () => {
    const filters = {
      $and: [
        { action: { $eq: 'token.create' } },
        { date: { $gt: '2026-01-01' } },
        { user: { id: { $eq: '3' } } },
      ],
    };

    expect(expandLegacyActionFilters(filters)).toEqual(filters);
  });

  it('walks nested $or and $not groups', () => {
    expect(
      expandLegacyActionFilters({
        $or: [
          { action: { $eq: 'admin-user.create' } },
          { $not: { action: { $eq: 'admin-user.delete' } } },
        ],
      })
    ).toEqual({
      $or: [
        { action: { $in: ['admin-user.create', 'user.create'] } },
        { $not: { action: { $in: ['admin-user.delete', 'user.delete'] } } },
      ],
    });
  });

  it('returns undefined and scalars as is', () => {
    expect(expandLegacyActionFilters(undefined)).toBeUndefined();
    expect(expandLegacyActionFilters('x')).toBe('x');
  });
});
