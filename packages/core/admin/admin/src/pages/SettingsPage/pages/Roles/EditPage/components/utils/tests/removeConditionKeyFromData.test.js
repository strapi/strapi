import removeConditionKeyFromData from '../removeConditionKeyFromData';

describe('ADMIN | COMPONENTS | PERMISSIONS | ContentTypeCollapse | utils | removeConditionKeyFromData', () => {
  it('should return null if the argument is empty', () => {
    expect(removeConditionKeyFromData()).toBeNull();
    expect(removeConditionKeyFromData(null)).toBeNull();
    expect(removeConditionKeyFromData(false)).toBeNull();
    expect(removeConditionKeyFromData('')).toBeNull();
  });

  it('should remove the condition key from an object', () => {
    const data = {
      test: true,
      conditions: ['test'],
      fields: ['test'],
    };
    const expected = {
      test: true,
      fields: ['test'],
    };

    expect(removeConditionKeyFromData(data)).toEqual(expected);
  });
});
