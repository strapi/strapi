import { customFieldDefaultOptionsReducer } from '../customFieldDefaultOptionsReducer';

describe('CTB | FormModal | utils | customFieldDefaultOptionsReducer', () => {
  it('collects a flat option that has both a name and a defaultValue', () => {
    const result = customFieldDefaultOptionsReducer([], {
      name: 'options.format',
      defaultValue: 'json',
    });

    expect(result).toEqual([{ name: 'options.format', defaultValue: 'json' }]);
  });

  it('recurses into nested items', () => {
    const result = customFieldDefaultOptionsReducer([], {
      items: [{ name: 'a', defaultValue: 1 }, { items: [{ name: 'b', defaultValue: 2 }] }],
    });

    expect(result).toEqual([
      { name: 'a', defaultValue: 1 },
      { name: 'b', defaultValue: 2 },
    ]);
  });

  it('ignores an option that has no defaultValue', () => {
    const result = customFieldDefaultOptionsReducer([], { name: 'noDefault' });

    expect(result).toEqual([]);
  });

  it('drops an option that has a defaultValue but no name', () => {
    // The lint cleanup added `&& option.name !== undefined`: a nameless default-bearing option
    // is no longer pushed as `{ name: undefined, defaultValue }`. Locked so a revert is caught.
    const result = customFieldDefaultOptionsReducer([], { defaultValue: 'orphan' });

    expect(result).toEqual([]);
  });
});
