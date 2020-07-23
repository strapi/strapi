import { components, contentTypes } from './data';
import getAllAttributes from '../getAllAttributes';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getAttributesByModel', () => {
  it('should return all attributes of a contentType with nested attributes', () => {
    const actual = getAllAttributes(contentTypes, components);
    const expected = [
      { type: 'string', required: false, attributeName: 'city' },
      { type: 'media', multiple: false, required: false, attributeName: 'cover' },
      { type: 'string', attributeName: 'label' },

      { attributeName: 'closing_period.start_date', type: 'date', required: true },
      { attributeName: 'closing_period.media', type: 'media', multiple: false, required: false },

      { attributeName: 'closing_period.dish.description', type: 'text' },
      {
        attributeName: 'closing_period.dish.name',
        type: 'string',
        required: true,
        default: 'My super dish',
      },
      { attributeName: 'like', type: 'string', required: false },
      { attributeName: 'country', type: 'string', required: false },
      { attributeName: 'image', type: 'media', multiple: false, required: false },
      { attributeName: 'custom_label', type: 'string' },
    ];

    expect(actual.length).toEqual(expected.length);
  });
});
