import { filterValidRelationalAttributes } from '../link';

describe('link queries realtion fitlers', () => {
  test('filter out non relation attributes', () => {
    const attributes = {
      id: { type: 'increments', columnName: 'id' },
      name: { type: 'string', required: true, columnName: 'name' },
      test: { type: 'string', columnName: 'test' },
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
        joinTable: {
          name: 'components_basic_relations_categories_lnk',
          orderColumnName: 'category_ord',
        },
      },
    };

    expect(filterValidRelationalAttributes(attributes)).toEqual({
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
        joinTable: {
          name: 'components_basic_relations_categories_lnk',
          orderColumnName: 'category_ord',
        },
      },
    });
  });

  test('filter out cmps tables from attributes', () => {
    const attributes = {
      id: { type: 'increments', columnName: 'id' },
      label: { type: 'string', default: 'toto', columnName: 'label' },
      start_date: { type: 'date', required: true, columnName: 'start_date' },
      end_date: { type: 'date', required: true, columnName: 'end_date' },
      media: {
        type: 'relation',
        relation: 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      },
      dish: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'default.dish',
        joinTable: {
          name: 'components_closingperiods_cmps',
          orderColumnName: 'order',
        },
      },
    };
    expect(filterValidRelationalAttributes(attributes)).toEqual({});
  });
});
