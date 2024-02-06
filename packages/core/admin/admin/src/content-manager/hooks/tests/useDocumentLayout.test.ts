import { errors } from '@strapi/utils';
import { renderHook, screen, server, waitFor } from '@tests/utils';
import { rest } from 'msw';

import { mockData } from '../../../../tests/mockData';
import { useDocumentLayout } from '../useDocumentLayout';

describe('useDocumentLayout', () => {
  it('should return a correctly formatted edit layout after loading', async () => {
    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    expect(result.current.edit).toMatchInlineSnapshot(`
      {
        "components": {},
        "layout": [],
        "settings": {
          "bulkable": false,
          "defaultSortBy": "",
          "defaultSortOrder": "asc",
          "filterable": false,
          "mainField": "id",
          "pageSize": 10,
          "pagination": false,
          "searchable": false,
        },
      }
    `);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.edit.components).toMatchInlineSnapshot(`
      {
        "blog.test-como": {
          "layout": [
            [
              {
                "attribute": {
                  "default": "toto",
                  "type": "string",
                },
                "disabled": false,
                "hint": "",
                "label": "name",
                "mainField": undefined,
                "name": "name",
                "placeholder": "",
                "required": false,
                "size": 6,
                "type": "string",
                "unique": false,
                "visible": true,
              },
            ],
          ],
          "settings": {
            "bulkable": true,
            "defaultSortBy": "name",
            "defaultSortOrder": "ASC",
            "filterable": true,
            "mainField": "name",
            "pageSize": 10,
            "searchable": true,
          },
        },
      }
    `);

    expect(result.current.edit.layout).toMatchInlineSnapshot(`
      [
        [
          [
            {
              "attribute": {
                "type": "uid",
              },
              "disabled": false,
              "hint": "",
              "label": "slug",
              "mainField": undefined,
              "name": "slug",
              "placeholder": "",
              "required": false,
              "size": 6,
              "type": "uid",
              "unique": false,
              "visible": true,
            },
          ],
          [
            {
              "attribute": {
                "component": "blog.test-como",
                "min": 2,
                "pluginOptions": {},
                "repeatable": true,
                "required": false,
                "type": "component",
              },
              "disabled": false,
              "hint": "",
              "label": "repeat_req_min",
              "mainField": "name",
              "name": "repeat_req_min",
              "placeholder": "",
              "required": false,
              "size": 12,
              "type": "component",
              "unique": false,
              "visible": true,
            },
          ],
          [
            {
              "attribute": {
                "pluginOptions": {},
                "type": "json",
              },
              "disabled": false,
              "hint": "",
              "label": "json",
              "mainField": undefined,
              "name": "json",
              "placeholder": "",
              "required": false,
              "size": 12,
              "type": "json",
              "unique": false,
              "visible": true,
            },
          ],
        ],
      ]
    `);
  });

  it('should return a correctly formatted list layout after loading', async () => {
    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    expect(result.current.list).toMatchInlineSnapshot(`
      {
        "layout": [],
        "metadatas": {},
        "settings": {
          "bulkable": false,
          "defaultSortBy": "",
          "defaultSortOrder": "asc",
          "filterable": false,
          "mainField": "id",
          "pageSize": 10,
          "pagination": false,
          "searchable": false,
        },
      }
    `);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // list layouts don't need the components.
    expect(result.current.list.components).toMatchInlineSnapshot(`undefined`);

    expect(result.current.list.layout).toMatchInlineSnapshot(`
      [
        {
          "attribute": {
            "type": "string",
          },
          "label": "id",
          "mainField": undefined,
          "name": "id",
          "searchable": true,
          "sortable": true,
        },
        {
          "attribute": {
            "pluginOptions": {},
            "type": "json",
          },
          "label": "json",
          "mainField": undefined,
          "name": "json",
          "searchable": false,
          "sortable": false,
        },
        {
          "attribute": {
            "maxLength": 2,
            "pluginOptions": {},
            "type": "string",
          },
          "label": "postal_code",
          "mainField": undefined,
          "name": "postal_code",
          "searchable": true,
          "sortable": false,
        },
      ]
    `);
  });

  it('should display an error should the configuration fail to fetch', async () => {
    server.use(
      rest.get('/content-manager/:collectionType/:model/configuration', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            error: new errors.ApplicationError('Error fetching configuration'),
          })
        );
      })
    );

    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await screen.findByText('Error fetching configuration');
  });
});
