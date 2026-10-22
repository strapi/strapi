/* eslint-disable check-file/filename-naming-convention */
import { render, screen } from '@tests/utils';

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

  describe('cellFormatter', () => {
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleError.mockRestore();
    });

    it('renders the locales cell for a row that has `ref` and `key` attributes', async () => {
      const { displayedHeaders } = addColumnToTableHook({
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
      const header = displayedHeaders[1];
      // The list view translates plugin labels before calling the formatter.
      const listViewHeader = { ...header, label: 'Available in' } as ListFieldLayout;

      const row = {
        id: 1,
        documentId: 'abc123',
        ref: 'ref-value',
        key: 'key-value',
        locale: 'en',
        localizations: [{ locale: 'fr' }],
      };

      render(
        <>
          {header.cellFormatter!(row, listViewHeader, {
            collectionType: 'collection-types',
            model: 'api::address.address',
          })}
        </>
      );

      expect(await screen.findByText('English (default), Français')).toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
    });
  });
});
