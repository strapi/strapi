import { components, contentTypes } from './data';
import getAttributesByModel from '../getAttributesByModel';

describe('ADMIN | COMPONENTS | ROLE | UTILS | getAttributesByModel', () => {
  it('should return all attributes of all content types with nested attributes', () => {
    const actual = getAttributesByModel(contentTypes[0], components);
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
    ];

    expect(actual.length).toEqual(expected.length);
    expect(
      actual.find(attribute => attribute.attributeName === 'closing_period.dish.name')
    ).toBeTruthy();
  });
});
