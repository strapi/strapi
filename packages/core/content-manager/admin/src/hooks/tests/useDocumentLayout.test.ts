import { errors } from '@strapi/utils';
import { renderHook, screen, server, waitFor } from '@tests/utils';
import { rest } from 'msw';

import { mockData } from '../../../tests/mockData';
import { useDocumentLayout } from '../useDocumentLayout';

describe('useDocumentLayout', () => {
  it('should return a correctly formatted edit layout after loading', async () => {
    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    expect(result.current.edit).toMatchInlineSnapshot(`
      {
        "components": {},
        "layout": [],
        "metadatas": {},
        "options": {},
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
            "displayName": "test comp",
            "filterable": true,
            "icon": "air-freshener",
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
                "pluginOptions": {},
                "repeatable": false,
                "required": true,
                "type": "component",
              },
              "disabled": false,
              "hint": "",
              "label": "notrepeat_req",
              "mainField": {
                "name": "name",
                "type": "string",
              },
              "name": "notrepeat_req",
              "placeholder": "",
              "required": true,
              "size": 12,
              "type": "component",
              "unique": false,
              "visible": true,
            },
          ],
          [
            {
              "attribute": {
                "component": "blog.test-como",
                "pluginOptions": {},
                "repeatable": true,
                "required": true,
                "type": "component",
              },
              "disabled": false,
              "hint": "",
              "label": "repeat_req",
              "mainField": {
                "name": "name",
                "type": "string",
              },
              "name": "repeat_req",
              "placeholder": "",
              "required": true,
              "size": 12,
              "type": "component",
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
              "mainField": {
                "name": "name",
                "type": "string",
              },
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
                "inversedBy": "addresses",
                "relation": "manyToMany",
                "relationType": "manyToMany",
                "target": "api::category.category",
                "targetModel": "api::category.category",
                "type": "relation",
              },
              "disabled": false,
              "hint": "",
              "label": "categories",
              "mainField": {
                "name": "name",
                "type": "string",
              },
              "name": "categories",
              "placeholder": "",
              "required": false,
              "size": 6,
              "type": "relation",
              "unique": false,
              "visible": true,
            },
          ],
          [
            {
              "attribute": {
                "allowedTypes": [
                  "files",
                  "images",
                  "videos",
                  "audios",
                ],
                "multiple": false,
                "pluginOptions": {},
                "required": false,
                "type": "media",
              },
              "disabled": false,
              "hint": "",
              "label": "cover",
              "mainField": undefined,
              "name": "cover",
              "placeholder": "",
              "required": false,
              "size": 6,
              "type": "media",
              "unique": false,
              "visible": true,
            },
            {
              "attribute": {
                "allowedTypes": [
                  "images",
                ],
                "multiple": true,
                "pluginOptions": {},
                "required": false,
                "type": "media",
              },
              "disabled": false,
              "hint": "",
              "label": "images",
              "mainField": undefined,
              "name": "images",
              "placeholder": "",
              "required": false,
              "size": 6,
              "type": "media",
              "unique": false,
              "visible": true,
            },
          ],
          [
            {
              "attribute": {
                "maxLength": 200,
                "pluginOptions": {},
                "required": true,
                "type": "string",
              },
              "disabled": false,
              "hint": "",
              "label": "city",
              "mainField": undefined,
              "name": "city",
              "placeholder": "",
              "required": true,
              "size": 6,
              "type": "string",
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
        "options": {},
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
            "inversedBy": "addresses",
            "relation": "manyToMany",
            "relationType": "manyToMany",
            "target": "api::category.category",
            "targetModel": "api::category.category",
            "type": "relation",
          },
          "label": "categories",
          "mainField": {
            "name": "name",
            "type": "string",
          },
          "name": "categories",
          "searchable": false,
          "sortable": false,
        },
        {
          "attribute": {
            "allowedTypes": [
              "files",
              "images",
              "videos",
              "audios",
            ],
            "multiple": false,
            "pluginOptions": {},
            "required": false,
            "type": "media",
          },
          "label": "cover",
          "mainField": undefined,
          "name": "cover",
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
          "sortable": true,
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
