import { addColumnToTableHook } from '../listView';

import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';

describe('addColumnToTableHook', () => {
  const DEFAULT_FIELD: ListFieldLayout = {
    attribute: {
      type: 'string',
    },
    name: 'id',
    label: 'ID',
  };

  const DEFAULT_LAYOUT: ListLayout = {
    layout: [DEFAULT_FIELD],
    settings: {
      bulkable: true,
      defaultSortBy: 'id',
      defaultSortOrder: 'asc',
      filterable: true,
      searchable: true,
      pageSize: 10,
      mainField: 'name',
    },
    metadatas: {},
    options: {
      i18n: {
        localized: false,
      },
    },
  };

  it('does nothing when there is no i18n.localized key in the action', () => {
    const result = addColumnToTableHook({
      displayedHeaders: [DEFAULT_FIELD],
      layout: DEFAULT_LAYOUT,
    });

    expect(result).toHaveProperty('displayedHeaders');
    expect(result).toHaveProperty('layout');
    expect(result.displayedHeaders).toHaveLength(1);
    expect(result.displayedHeaders).toMatchInlineSnapshot(`
      [
        {
          "attribute": {
            "type": "string",
          },
          "label": "ID",
          "name": "id",
        },
      ]
    `);
  });

  it('adds a header to the displayedHeaders array when the content type is localized', () => {
    const result = addColumnToTableHook({
      displayedHeaders: [DEFAULT_FIELD],
      layout: {
        ...DEFAULT_LAYOUT,
        options: {
          i18n: {
            localized: true,
          },
        },
      },
    });

    expect(result.displayedHeaders[0]).toMatchInlineSnapshot(`
      {
        "attribute": {
          "type": "string",
        },
        "label": "ID",
        "name": "id",
      }
    `);

    expect(result.displayedHeaders[1]).toMatchInlineSnapshot(`
      {
        "attribute": {
          "type": "string",
        },
        "cellFormatter": [Function],
        "label": {
          "defaultMessage": "Available in",
          "id": "i18n.list-view.table.header.label",
        },
        "name": "locales",
        "searchable": false,
        "sortable": false,
      }
    `);
  });
});
