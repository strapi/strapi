import { attributeTypes } from '../../../../../FormModal/attributes/types';
import { toRegressedEnumValue } from '../../../../../../utils/toRegressedEnumValue';
import { transformAttributesFromChatToCTB } from '../toCTB';

import type { Schema } from '../../../types/schema';

const GRAPHQL_ENUM_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/;

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
      enum: ['value_2020', 'value_2021', 'value_2025'],
      default: 'value_2020',
      status: 'NEW',
    });

    const enumValues = attribute.enum as string[];
    expect(enumValues.map(toRegressedEnumValue)).toEqual([
      'value_2020',
      'value_2021',
      'value_2025',
    ]);
    expect(enumValues.map(toRegressedEnumValue).every((value) => GRAPHQL_ENUM_REGEX.test(value))).toBe(
      true
    );
    expect(() => attributeTypes.enumeration([], []).validateSync(attribute)).not.toThrow();
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
    expect(() => attributeTypes.enumeration([], []).validateSync(attribute)).not.toThrow();
  });
});
