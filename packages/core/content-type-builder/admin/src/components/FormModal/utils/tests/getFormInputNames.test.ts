import { getFormInputNames } from '../getFormInputNames';

describe('CTB | FormModal | utils | getFormInputNames', () => {
  it('flattens the names of every input across sections, in order', () => {
    const form = [
      { items: [{ name: 'name' }, { name: 'type' }] },
      { items: [{ name: 'required' }] },
    ];

    expect(getFormInputNames(form)).toEqual(['name', 'type', 'required']);
  });

  it('skips inputs without a name', () => {
    const form = [{ items: [{ name: 'name' }, {}, { name: 'type' }] }];

    expect(getFormInputNames(form)).toEqual(['name', 'type']);
  });

  it('returns an empty array for empty sections', () => {
    expect(getFormInputNames([])).toEqual([]);
    expect(getFormInputNames([{ items: [] }])).toEqual([]);
  });

  it('includes empty-string names (widened from the previous truthy check to `!== undefined`)', () => {
    const form = [{ items: [{ name: '' }, { name: 'type' }] }];

    // The lint cleanup changed `if (current.name)` to `if (current.name !== undefined)`, so an
    // empty-string name is now collected rather than dropped. Locked here so a revert is caught.
    expect(getFormInputNames(form)).toEqual(['', 'type']);
  });
});
