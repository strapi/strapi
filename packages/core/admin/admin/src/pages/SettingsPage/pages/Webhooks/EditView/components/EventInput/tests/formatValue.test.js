import formatValue from '../utils/formatValue';

describe('utils | formatValue', () => {
  it('should format array to object', () => {
    const initialValue = ['entry.create', 'entry.update', 'media.delete'];
    const expectedValue = {
      entry: ['entry.create', 'entry.update'],
      media: ['media.delete'],
    };

    const formattedValue = formatValue(initialValue);

    expect(formattedValue).toEqual(expectedValue);
  });
});
