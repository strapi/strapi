import createCollapsesObject from '../createCollapsesObject';

describe('ADMIN | COMPONENTS | ROLES | ConditionsSelect | utils | createCollapsesObject', () => {
  it('should return an object of collapses', () => {
    const arrayOfCategories = [
      ['default', [{ id: 'test' }]],
      ['custom', { id: 'test' }],
    ];
    const expected = {
      default: true,
      custom: false,
    };

    expect(createCollapsesObject(arrayOfCategories)).toEqual(expected);
  });
});
