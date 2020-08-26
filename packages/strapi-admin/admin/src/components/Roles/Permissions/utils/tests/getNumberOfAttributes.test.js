import { components, contentTypes } from './data';
import getNumberOfAttributes from '../getNumberOfAttributes';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getNumberOfAttributes', () => {
  it('should return the number of attributes for all content types', () => {
    const actual = getNumberOfAttributes(contentTypes, components);
    expect(actual).toEqual(13);
  });
});
