import { transformAttributesFromChatToCTB } from '../toCTB';

import type { Schema } from '../../../types/schema';

const makeSchema = (attributes: Schema['attributes']): Schema => ({
  action: 'create',
  kind: 'collectionType',
  uid: 'api::product.product',
  modelType: 'contentType',
  name: 'Product',
  attributes,
});

describe('AI enumeration normalization', () => {
  it('makes numeric-leading generated enum values GraphQL-safe and keeps the default aligned', () => {
    const [attribute] = transformAttributesFromChatToCTB(
      makeSchema({
        year: {
          type: 'enumeration',
          enum: ['2020', '2021', '2025'],
          default: '2020',
        },
      })
    );

    expect(attribute).toMatchObject({
      name: 'year',
      type: 'enumeration',
      enum: ['_2020', '_2021', '_2025'],
      default: '_2020',
      status: 'NEW',
    });
  });

  it('keeps generated enum values that already regress to valid GraphQL names unchanged', () => {
    const [attribute] = transformAttributesFromChatToCTB(
      makeSchema({
        category: {
          type: 'enumeration',
          enum: ['electronics', 'home goods', '_other'],
          default: 'home goods',
        },
      })
    );

    expect(attribute).toMatchObject({
      enum: ['electronics', 'home goods', '_other'],
      default: 'home goods',
    });
  });
});
