/* eslint-disable check-file/filename-naming-convention */
import { errors } from '@strapi/utils';
import { renderHook, server, waitFor, screen } from '@tests/utils';
import { http, HttpResponse } from 'msw';
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
      http.get('/content-manager/:collectionType/:model/:id', () =>
        HttpResponse.json(
          {
            error: new errors.ApplicationError('Server error'),
          },
          { status: 500 }
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
      http.get('/content-manager/init', () => {
        return new HttpResponse(null, { status: 500 });
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
        documentId: { type: 'string' },
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
          documentId: {
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
      documentId: '12345',
      name: 'Entry 1',
    });
  });
});

/**
 * Regression test: Non-localized fields should copy values from a sibling locale
 * when creating a new locale draft. This inheritance must persist across form resets.
 * This is now handled in `getInitialFormValues` to keep `initialValues` as the trusted source.
 */
describe('useDocument · getInitialFormValues · i18n non-localized inheritance', () => {
  const I18N_CT_UID = 'api::i18n-bug.i18n-bug';

  type AttributeMap = Record<string, Record<string, unknown>>;

  const sharedButtonComponent = {
    uid: 'shared.button',
    apiID: 'button',
    category: 'shared',
    isDisplayed: true,
    options: {},
    info: { displayName: 'Button', description: '', icon: 'cursor' },
    attributes: {
      label: { type: 'string' },
    },
  };

  /**
   * Mocks `/content-manager/init` so the schema for `I18N_CT_UID` uses the supplied attributes.
   * Other endpoints remain unchanged.
   */
  const mockSchema = (attributes: AttributeMap) => {
    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({
          data: {
            components: [sharedButtonComponent],
            contentTypes: [
              {
                uid: I18N_CT_UID,
                isDisplayed: true,
                apiID: 'i18n-bug',
                kind: 'collectionType',
                pluginOptions: { i18n: { localized: true } },
                options: {},
                info: {
                  displayName: 'I18n Bug',
                  singularName: 'i18n-bug',
                  pluralName: 'i18n-bugs',
                  description: '',
                },
                attributes: {
                  documentId: { type: 'string' },
                  ...attributes,
                },
              },
            ],
            fieldSizes: {},
          },
        })
      )
    );
  };

  /**
   * Mocks the document GET for a missing-locale scenario:
   * Returns empty `data` and, if given, a single sibling's values in `meta.availableLocales[0]`.
   */
  const mockMissingLocale = (sibling?: Record<string, unknown>) => {
    server.use(
      http.get('/content-manager/:collectionType/:uid/:id', () =>
        HttpResponse.json({
          data: {},
          meta: {
            availableLocales: sibling ? [sibling] : [],
            availableStatus: [],
          },
        })
      )
    );
  };

  const localized = { pluginOptions: { i18n: { localized: true } } };
  const nonLocalized = { pluginOptions: { i18n: { localized: false } } };

  const renderUseDocument = () =>
    renderHook(() =>
      useDocument({
        collectionType: 'collection-types',
        model: I18N_CT_UID,
        documentId: 'abc',
      })
    );

  it('merges non-localized scalar values from meta.availableLocales[0] into the baseline', async () => {
    mockSchema({
      title: { type: 'string', ...nonLocalized },
      body: { type: 'string', ...localized },
    });
    mockMissingLocale({
      id: 1,
      locale: 'en',
      title: 'Inherited title',
      body: 'should not leak',
      updatedAt: '',
      createdAt: '',
      publishedAt: '',
      status: 'draft',
    });

    const { result } = renderUseDocument();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getInitialFormValues(true)).toEqual({
      title: 'Inherited title',
    });
  });

  it('inherits non-localized media values', async () => {
    const cover = { id: 7, name: 'cover.png', url: '/uploads/cover.png' };
    mockSchema({
      cover: { type: 'media', multiple: false, ...nonLocalized },
      body: { type: 'string', ...localized },
    });
    mockMissingLocale({
      id: 1,
      locale: 'en',
      cover,
      updatedAt: '',
      createdAt: '',
      publishedAt: '',
      status: 'draft',
    });

    const { result } = renderUseDocument();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getInitialFormValues(true)).toEqual({ cover });
  });

  it('returns an empty object if meta.availableLocales is empty', async () => {
    mockSchema({
      title: { type: 'string', ...nonLocalized },
      body: { type: 'string', ...localized },
    });
    mockMissingLocale();

    const { result } = renderUseDocument();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getInitialFormValues(true)).toEqual({});
  });

  it('returns the current document data if document.id exists, ignoring meta.availableLocales', async () => {
    mockSchema({
      title: { type: 'string', ...nonLocalized },
      body: { type: 'string', ...localized },
    });
    server.use(
      http.get('/content-manager/:collectionType/:uid/:id', () =>
        HttpResponse.json({
          data: {
            id: 99,
            documentId: 'abc',
            title: 'From the actual locale',
            body: 'localized body',
            createdAt: '',
            updatedAt: '',
            publishedAt: '',
          },
          meta: {
            availableLocales: [
              {
                id: 1,
                locale: 'en',
                title: 'Should be ignored',
                updatedAt: '',
                createdAt: '',
                publishedAt: '',
                status: 'draft',
              },
            ],
            availableStatus: [],
          },
        })
      )
    );

    const { result } = renderUseDocument();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getInitialFormValues()).toEqual({
      documentId: 'abc',
      title: 'From the actual locale',
      body: 'localized body',
    });
  });

  it('does not inherit fields when all are localized', async () => {
    mockSchema({
      body: { type: 'string', ...localized },
      title: { type: 'string', ...localized },
    });
    mockMissingLocale({
      id: 1,
      locale: 'en',
      title: 'EN title',
      body: 'EN body',
      updatedAt: '',
      createdAt: '',
      publishedAt: '',
      status: 'draft',
    });

    const { result } = renderUseDocument();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getInitialFormValues(true)).toEqual({});
  });

  it('does not inherit non-localized component, dynamiczone, or relation fields (these are outside server availableLocales scope)', async () => {
    mockSchema({
      slug: { type: 'string', ...nonLocalized },
      cta: {
        type: 'component',
        component: 'shared.button',
        repeatable: false,
        ...nonLocalized,
      },
      blocks: {
        type: 'dynamiczone',
        components: ['shared.button'],
        ...nonLocalized,
      },
      categories: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::category.category',
        targetModel: 'api::category.category',
        ...nonLocalized,
      },
    });
    mockMissingLocale({
      id: 1,
      locale: 'en',
      slug: 'inherited-slug',
      cta: { label: 'Click me' },
      blocks: [{ __component: 'shared.button', label: 'block-1' }],
      categories: [{ id: 1 }, { id: 2 }],
      updatedAt: '',
      createdAt: '',
      publishedAt: '',
      status: 'draft',
    });

    const { result } = renderUseDocument();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initial = result.current.getInitialFormValues(true) ?? {};

    // Only non-localized scalar fields should be inherited. Component, dynamiczone,
    // and relation values are not included, since they are not populated by the server in meta.availableLocales.
    expect(initial).toEqual({ slug: 'inherited-slug' });
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
