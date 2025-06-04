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

    expect(result.current.document).toEqual({
      createdAt: '',
      documentId: '12345',
      id: 1,
      name: 'Entry 1',
      publishedAt: '',
      updatedAt: '',
    });
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
    ).toEqual({
      postal_code: 'postal_code must be a `string` type, but the final value was: `12`.',
    });
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
    ).toThrowError(
      'There is no validation schema generated, this is likely due to the schema not being loaded yet.'
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

    const expectedSchema = {
      apiID: 'address',
      uid: 'api::address.address',
      isDisplayed: true,
      kind: 'collectionType',
      options: {},
      pluginOptions: {},
      info: {
        name: 'Address',
        displayName: 'Address',
        description: '',
        singularName: 'address',
        pluralName: 'addresses',
      },
      attributes: {
        id: { type: 'string' },
        slug: { type: 'uid' },
        name: { type: 'string' },
        city: {
          type: 'string',
          required: true,
          maxLength: 200,
          pluginOptions: {},
        },
        postal_code: {
          type: 'string',
          maxLength: 2,
          pluginOptions: {},
        },
        dz: {
          type: 'dynamiczone',
          components: ['blog.test-como'],
        },
        notrepeat_req: {
          type: 'component',
          component: 'blog.test-como',
          repeatable: false,
          required: true,
          pluginOptions: {},
        },
        repeat_req: {
          type: 'component',
          component: 'blog.test-como',
          repeatable: true,
          required: true,
          pluginOptions: {},
        },
        repeat_req_min: {
          type: 'component',
          component: 'blog.test-como',
          repeatable: true,
          required: false,
          min: 2,
          pluginOptions: {},
        },
        categories: {
          type: 'relation',
          relation: 'manyToMany',
          relationType: 'manyToMany',
          target: 'api::category.category',
          targetModel: 'api::category.category',
          inversedBy: 'addresses',
        },
        cover: {
          type: 'media',
          multiple: false,
          required: false,
          allowedTypes: ['files', 'images', 'videos', 'audios'],
          pluginOptions: {},
        },
        images: {
          type: 'media',
          multiple: true,
          required: false,
          allowedTypes: ['images'],
          pluginOptions: {},
        },
        json: {
          type: 'json',
          pluginOptions: {},
        },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          relationType: 'oneToOne',
          target: 'admin::user',
          targetModel: 'admin::user',
          configurable: false,
          private: true,
          visible: false,
          writable: false,
          useJoinTable: false,
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          relationType: 'oneToOne',
          target: 'admin::user',
          targetModel: 'admin::user',
          configurable: false,
          private: true,
          visible: false,
          writable: false,
          useJoinTable: false,
        },
      },
    };

    expect(result.current.schema).toEqual(expectedSchema);
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

    const expectedComponents = {
      'blog.test-como': {
        apiID: 'test-como',
        uid: 'blog.test-como',
        category: 'blog',
        isDisplayed: true,
        options: {},
        info: {
          displayName: 'test comp',
          description: '',
          icon: 'air-freshener',
        },
        attributes: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
            default: 'toto',
          },
        },
      },
    };

    expect(result.current.components).toEqual(expectedComponents);

    /**
     * This is returned by the API, but it's not in the content-type schema,
     * so therefore should not be in the dictionary.
     */
    expect(result.current.components['profiles.image']).toBeUndefined();
  });

  it('should return a getTitle function', async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getTitle).toBeInstanceOf(Function);
    expect(result.current.getTitle('name')).toBe('Entry 1');
  });

  it('should return a getInitialFormValues function', async () => {
    const { result } = renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: mockData.contentManager.contentType,
        documentId: '12345',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getInitialFormValues).toBeInstanceOf(Function);
    expect(result.current.getInitialFormValues()).toEqual({
      name: 'Entry 1',
    });
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

    expect(result.current.document).toEqual({
      createdAt: '',
      documentId: '12345',
      id: 1,
      name: 'Entry 1',
      publishedAt: '',
      updatedAt: '',
    });
  });
});
