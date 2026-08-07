import { omitExcludedOptimizeDepsPresentInInclude } from '../admin-vite-optimize-deps';

describe('omitExcludedOptimizeDepsPresentInInclude', () => {
  it('drops exclude entries that are also in include (#27202)', () => {
    expect(
      omitExcludedOptimizeDepsPresentInInclude(
        ['react', 'react-colorful', 'lodash'],
        ['react-colorful', 'strapi-design-extended']
      )
    ).toEqual(['strapi-design-extended']);
  });

  it('keeps exclude entries that are not in include', () => {
    expect(
      omitExcludedOptimizeDepsPresentInInclude(['react'], ['strapi-design-extended', 'motion'])
    ).toEqual(['strapi-design-extended', 'motion']);
  });

  it('returns an empty list when every exclude is also included', () => {
    expect(omitExcludedOptimizeDepsPresentInInclude(['a', 'b'], ['a', 'b'])).toEqual([]);
  });
});
