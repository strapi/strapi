/* eslint-disable check-file/filename-naming-convention */
import { errors } from '@strapi/utils';
import { renderHook, server, waitFor, screen } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { useDocument, useDoc } from '../useDocument';

describe('useDocument', () => {
  it('should return the document', async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: 'api::test.test',
        id: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.document).toMatchInlineSnapshot(`
      {
        "createdAt": "",
        "id": "12345",
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
        model: 'api::test.test',
        id: '12345',
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
        model: 'api::test.test',
        id: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.validate).toBeInstanceOf(Function);

    expect(result.current.validate({ id: '12345', name: 'Hello there!' })).toBeNull();

    expect(result.current.validate({ id: '12345', name: 123 })).toMatchInlineSnapshot(`
      {
        "name": {
          "defaultMessage": "name must be a \`string\` type, but the final value was: \`123\`.",
          "id": "name must be a \`string\` type, but the final value was: \`123\`.",
          "values": {
            "typeError": undefined,
          },
        },
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
        model: 'api::test.test',
        id: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(() =>
      result.current.validate({ id: '12345', name: 'Hello there!' })
    ).toThrowErrorMatchingInlineSnapshot(
      `"There is no validation schema generated, this is likely due to the schema not being loaded yet."`
    );
  });

  it("should return the schema of the document we've fetched", async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: 'api::test.test',
        id: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.schema).toMatchInlineSnapshot(`
      {
        "attributes": {
          "createdAt": {
            "type": "datetime",
          },
          "id": {
            "type": "string",
          },
          "name": {
            "type": "string",
          },
          "publishedAt": {
            "type": "datetime",
          },
          "seo": {
            "component": "document.seo",
            "type": "component",
          },
          "updatedAt": {
            "type": "datetime",
          },
        },
        "uid": "api::test.test",
      }
    `);
  });

  it('should return the components used in that schema', async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: 'api::test.test',
        id: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.components).toMatchInlineSnapshot(`
      {
        "document.seo": {
          "attributes": {
            "description": {
              "type": "string",
            },
            "image": {
              "type": "media",
            },
            "title": {
              "type": "string",
            },
          },
          "info": {
            "displayName": "Seo",
          },
          "options": {},
          "uid": "document.seo",
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
      initialEntries: ['/content-manager/collection-types/api::test.test/12345'],
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
        "id": "12345",
        "name": "Entry 1",
        "publishedAt": "",
        "updatedAt": "",
      }
    `);
  });
});
