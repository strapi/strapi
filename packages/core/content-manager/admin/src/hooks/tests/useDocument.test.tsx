/* eslint-disable check-file/filename-naming-convention */
import { errors } from '@strapi/utils';
import { renderHook, server, waitFor, screen } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { mockData } from '../../../tests/mockData';
import { useDocument, useDoc } from '../useDocument';

describe('useDocument', () => {
  it('should return the document', async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.document).toMatchInlineSnapshot(`
      {
        "createdAt": "",
        "documentId": "12345",
        "id": 1,
        "name": "Entry 1",
        "publishedAt": "",
        "updatedAt": "",
      }
    `);
  });

  it('should display an error if there is an error fetching the document', async () => {
    server.use(
      rest.get('/content-manager/:collectionType/:model/:id', (_, res, ctx) =>
        res(
          ctx.status(500),
          ctx.json({
            error: new errors.ApplicationError('Server error'),
          })
        )
      )
    );

    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await screen.findByText('Server error');

    expect(result.current.document).toBeUndefined();
    expect(result.current.meta).toBeUndefined();
    expect(result.current.isLoading).toBeFalsy();
  });

  it('should return a validate function', async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.validate).toBeInstanceOf(Function);

    expect(
      result.current.validate({
        documentId: '12345',
        id: 1,
        postal_code: 'N2',
        notrepeat_req: {},
        repeat_req_min: [
          {
            name: 'toto',
          },
          {
            name: 'toto',
          },
        ],
        city: 'London',
        repeat_req: [
          {
            name: 'toto',
          },
        ],
      })
    ).toBeNull();

    expect(
      result.current.validate({
        documentId: '12345',
        id: 1,
        notrepeat_req: {},
        postal_code: 12,
        city: 'London',
        repeat_req: [
          {
            name: 'toto',
          },
        ],
        repeat_req_min: [
          {
            name: 'toto',
          },
          {
            name: 'toto',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      {
        "postal_code": "postal_code must be a \`string\` type, but the final value was: \`12\`.",
      }
    `);
  });

  it('should throw the validate function if called before the schema has been loaded', async () => {
    server.use(
      rest.get('/content-manager/init', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(() =>
      result.current.validate({ documentId: '12345', id: 1, postal_code: 'N227SN' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"There is no validation schema generated, this is likely due to the schema not being loaded yet."`
    );
  });

  it("should return the schema of the document we've fetched", async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.schema).toMatchInlineSnapshot(`
      {
        "apiID": "address",
        "attributes": {
          "categories": {
            "inversedBy": "addresses",
            "relation": "manyToMany",
            "relationType": "manyToMany",
            "target": "api::category.category",
            "targetModel": "api::category.category",
            "type": "relation",
          },
          "city": {
            "maxLength": 200,
            "pluginOptions": {},
            "required": true,
            "type": "string",
          },
          "cover": {
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
          "createdAt": {
            "type": "datetime",
          },
          "createdBy": {
            "configurable": false,
            "private": true,
            "relation": "oneToOne",
            "relationType": "oneToOne",
            "target": "admin::user",
            "targetModel": "admin::user",
            "type": "relation",
            "useJoinTable": false,
            "visible": false,
            "writable": false,
          },
          "id": {
            "type": "string",
          },
          "images": {
            "allowedTypes": [
              "images",
            ],
            "multiple": true,
            "pluginOptions": {},
            "required": false,
            "type": "media",
          },
          "json": {
            "pluginOptions": {},
            "type": "json",
          },
          "notrepeat_req": {
            "component": "blog.test-como",
            "pluginOptions": {},
            "repeatable": false,
            "required": true,
            "type": "component",
          },
          "postal_code": {
            "maxLength": 2,
            "pluginOptions": {},
            "type": "string",
          },
          "repeat_req": {
            "component": "blog.test-como",
            "pluginOptions": {},
            "repeatable": true,
            "required": true,
            "type": "component",
          },
          "repeat_req_min": {
            "component": "blog.test-como",
            "min": 2,
            "pluginOptions": {},
            "repeatable": true,
            "required": false,
            "type": "component",
          },
          "slug": {
            "type": "uid",
          },
          "updatedAt": {
            "type": "datetime",
          },
          "updatedBy": {
            "configurable": false,
            "private": true,
            "relation": "oneToOne",
            "relationType": "oneToOne",
            "target": "admin::user",
            "targetModel": "admin::user",
            "type": "relation",
            "useJoinTable": false,
            "visible": false,
            "writable": false,
          },
        },
        "info": {
          "description": "",
          "displayName": "Address",
          "name": "Address",
          "pluralName": "addresses",
          "singularName": "address",
        },
        "isDisplayed": true,
        "kind": "collectionType",
        "options": {},
        "pluginOptions": {},
        "uid": "api::address.address",
      }
    `);
  });

  it('should return the components used in that schema', async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.components).toMatchInlineSnapshot(`
      {
        "blog.test-como": {
          "apiID": "test-como",
          "attributes": {
            "id": {
              "type": "string",
            },
            "name": {
              "default": "toto",
              "type": "string",
            },
          },
          "category": "blog",
          "info": {
            "description": "",
            "displayName": "test comp",
            "icon": "air-freshener",
          },
          "isDisplayed": true,
          "options": {},
          "uid": "blog.test-como",
        },
      }
    `);

    /**
     * This is returned by the API, but it's not in the content-type schema,
     * so therefore should not be in the dictionary.
     */
    expect(result.current.components['profiles.image']).toBeUndefined();
  });
});

/**
 * useDoc is an abstraction around useDocument that extracts the model, collection type & id from the url
 * and passes this automatically to useDocument.
 */
describe('useDoc', () => {
  it('should return the document based on the url', async () => {
    const { result } = renderHook(() => useDoc(), {
      initialEntries: [
        `/content-manager/collection-types/${mockData.contentManager.contentType}/12345`,
      ],
      wrapper: ({ children }) => (
        <Routes>
          <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
        </Routes>
      ),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.document).toMatchInlineSnapshot(`
      {
        "createdAt": "",
        "documentId": "12345",
        "id": 1,
        "name": "Entry 1",
        "publishedAt": "",
        "updatedAt": "",
      }
    `);
  });
});
