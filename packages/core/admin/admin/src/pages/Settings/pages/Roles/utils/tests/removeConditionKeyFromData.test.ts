import { removeConditionKeyFromData } from '../removeConditionKeyFromData';

describe('removeConditionKeyFromData', () => {
  it('should return null if the argument is empty', () => {
    expect(removeConditionKeyFromData()).toBeNull();
    // @ts-expect-error – test case
    expect(removeConditionKeyFromData(null)).toBeNull();
    // @ts-expect-error – test case
    expect(removeConditionKeyFromData(false)).toBeNull();
    // @ts-expect-error – test case
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
