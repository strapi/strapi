import { errors } from '@strapi/utils';
import { renderHook, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { mockData } from '../../../tests/mockData';
import { extractContentTypeComponents } from '../useContentTypeSchema';
import { useDocumentLayout } from '../useDocumentLayout';

describe('useDocumentLayout', () => {
  it('should return a correctly formatted edit layout after loading', async () => {
    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    expect(result.current.edit).toEqual({
      components: {},
      layout: [],
      metadatas: {},
      options: {},
      settings: {
        bulkable: false,
        defaultSortBy: '',
        defaultSortOrder: 'asc',
        filterable: false,
        mainField: 'id',
        pageSize: 10,
        pagination: false,
        relationOpenMode: 'modal',
        searchable: false,
      },
    });

    expect(result.current.listViewConversionContext).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.edit.components).toEqual({
      'blog.test-como': {
        layout: [
          [
            {
              attribute: {
                default: 'toto',
                type: 'string',
              },
              disabled: false,
              hint: '',
              label: 'name',
              mainField: undefined,
              name: 'name',
              placeholder: '',
              required: false,
              size: 6,
              type: 'string',
              unique: false,
              visible: true,
            },
          ],
        ],
        settings: {
          bulkable: true,
          defaultSortBy: 'name',
          defaultSortOrder: 'ASC',
          displayName: 'test comp',
          filterable: true,
          icon: 'air-freshener',
          mainField: 'name',
          pageSize: 10,
          searchable: true,
        },
      },
    });

    const expectedLayout = [
      [
        [
          {
            attribute: {
              components: ['blog.test-como'],
              type: 'dynamiczone',
            },
            disabled: false,
            hint: '',
            label: 'dz',
            mainField: {
              name: 'name',
              type: 'string',
            },
            name: 'dz',
            placeholder: '',
            required: false,
            size: 12,
            type: 'dynamiczone',
            unique: false,
            visible: true,
          },
        ],
      ],
      [
        [
          {
            attribute: { type: 'uid' },
            disabled: false,
            hint: '',
            label: 'slug',
            mainField: undefined,
            name: 'slug',
            placeholder: '',
            required: false,
            size: 6,
            type: 'uid',
            unique: false,
            visible: true,
          },
          {
            attribute: { type: 'string' },
            disabled: false,
            hint: '',
            label: 'name',
            mainField: undefined,
            name: 'name',
            placeholder: '',
            required: false,
            size: 6,
            type: 'string',
            unique: false,
            visible: true,
          },
        ],
      ],
      [
        [
          {
            attribute: {
              component: 'blog.test-como',
              pluginOptions: {},
              repeatable: false,
              required: true,
              type: 'component',
            },
            disabled: false,
            hint: '',
            label: 'notrepeat_req',
            mainField: {
              name: 'name',
              type: 'string',
            },
            name: 'notrepeat_req',
            placeholder: '',
            required: true,
            size: 12,
            type: 'component',
            unique: false,
            visible: true,
          },
        ],
        [
          {
            attribute: {
              component: 'blog.test-como',
              pluginOptions: {},
              repeatable: true,
              required: true,
              type: 'component',
            },
            disabled: false,
            hint: '',
            label: 'repeat_req',
            mainField: {
              name: 'name',
              type: 'string',
            },
            name: 'repeat_req',
            placeholder: '',
            required: true,
            size: 12,
            type: 'component',
            unique: false,
            visible: true,
          },
        ],
        [
          {
            attribute: {
              component: 'blog.test-como',
              min: 2,
              pluginOptions: {},
              repeatable: true,
              required: false,
              type: 'component',
            },
            disabled: false,
            hint: '',
            label: 'repeat_req_min',
            mainField: {
              name: 'name',
              type: 'string',
            },
            name: 'repeat_req_min',
            placeholder: '',
            required: false,
            size: 12,
            type: 'component',
            unique: false,
            visible: true,
          },
        ],
        [
          {
            attribute: {
              inversedBy: 'addresses',
              relation: 'manyToMany',
              relationType: 'manyToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              type: 'relation',
            },
            disabled: false,
            hint: '',
            label: 'categories',
            mainField: {
              name: 'name',
              type: 'string',
            },
            name: 'categories',
            placeholder: '',
            required: false,
            size: 6,
            type: 'relation',
            unique: false,
            visible: true,
          },
        ],
        [
          {
            attribute: {
              allowedTypes: ['files', 'images', 'videos', 'audios'],
              multiple: false,
              pluginOptions: {},
              required: false,
              type: 'media',
            },
            disabled: false,
            hint: '',
            label: 'cover',
            mainField: undefined,
            name: 'cover',
            placeholder: '',
            required: false,
            size: 6,
            type: 'media',
            unique: false,
            visible: true,
          },
          {
            attribute: {
              allowedTypes: ['images'],
              multiple: true,
              pluginOptions: {},
              required: false,
              type: 'media',
            },
            disabled: false,
            hint: '',
            label: 'images',
            mainField: undefined,
            name: 'images',
            placeholder: '',
            required: false,
            size: 6,
            type: 'media',
            unique: false,
            visible: true,
          },
        ],
        [
          {
            attribute: {
              maxLength: 200,
              pluginOptions: {},
              required: true,
              type: 'string',
            },
            disabled: false,
            hint: '',
            label: 'city',
            mainField: undefined,
            name: 'city',
            placeholder: '',
            required: true,
            size: 6,
            type: 'string',
            unique: false,
            visible: true,
          },
        ],
        [
          {
            attribute: {
              pluginOptions: {},
              type: 'json',
            },
            disabled: false,
            hint: '',
            label: 'json',
            mainField: undefined,
            name: 'json',
            placeholder: '',
            required: false,
            size: 12,
            type: 'json',
            unique: false,
            visible: true,
          },
        ],
      ],
    ];

    expect(result.current.edit.layout).toEqual(expectedLayout);
  });

  it('should return a correctly formatted list layout after loading', async () => {
    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    expect(result.current.list).toEqual({
      layout: [],
      metadatas: {},
      options: {},
      settings: {
        bulkable: false,
        defaultSortBy: '',
        defaultSortOrder: 'asc',
        filterable: false,
        mainField: 'id',
        pageSize: 10,
        pagination: false,
        relationOpenMode: 'modal',
        searchable: false,
      },
    });

    expect(result.current.listViewConversionContext).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // list layouts don't need the components.
    expect(result.current.list.components).toBeUndefined();

    expect(result.current.listViewConversionContext).not.toBeNull();

    const expectedListLayout = [
      {
        attribute: {
          type: 'string',
        },
        label: 'documentId',
        mainField: undefined,
        name: 'documentId',
        searchable: true,
        sortable: true,
      },
      {
        attribute: {
          inversedBy: 'addresses',
          relation: 'manyToMany',
          relationType: 'manyToMany',
          target: 'api::category.category',
          targetModel: 'api::category.category',
          type: 'relation',
        },
        label: 'categories',
        mainField: {
          name: 'name',
          type: 'string',
        },
        name: 'categories',
        searchable: false,
        sortable: false,
      },
      {
        attribute: {
          allowedTypes: ['files', 'images', 'videos', 'audios'],
          multiple: false,
          pluginOptions: {},
          required: false,
          type: 'media',
        },
        label: 'cover',
        mainField: undefined,
        name: 'cover',
        searchable: false,
        sortable: false,
      },
      {
        attribute: {
          maxLength: 2,
          pluginOptions: {},
          type: 'string',
        },
        label: 'postal_code',
        mainField: undefined,
        name: 'postal_code',
        searchable: true,
        sortable: true,
      },
    ];

    expect(result.current.list.layout).toEqual(expectedListLayout);
  });

  it('should display an error should the configuration fail to fetch', async () => {
    server.use(
      http.get('/content-manager/:collectionType/:model/configuration', () => {
        return HttpResponse.json(
          {
            error: new errors.ApplicationError('Error fetching configuration'),
          },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useDocumentLayout(mockData.contentManager.contentType));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await screen.findByText('Error fetching configuration');
  });

  it('does not crash when persisted configuration references component layouts without matching `/init` schemas (regression gh#26206)', async () => {
    const orphanModelUid = 'api::orphan.footer';

    server.use(
      rest.get('/content-manager/init', (req, res, ctx) =>
        res(
          ctx.json({
            data: {
              components: mockData.contentManager.components,
              contentTypes: [
                ...mockData.contentManager.contentTypes,
                {
                  uid: orphanModelUid,
                  isDisplayed: true,
                  apiID: 'footer',
                  kind: 'singleType',
                  info: {
                    singularName: 'footer',
                    pluralName: 'footers',
                    displayName: 'Footer',
                    name: 'Footer',
                    description: '',
                  },
                  options: {},
                  pluginOptions: {},
                  attributes: {},
                },
              ],
            },
          })
        )
      ),
      rest.get('/content-manager/content-types/:model/configuration', (req, res, ctx) => {
        if (req.params.model !== orphanModelUid) {
          const configuration =
            req.params.model === 'api::homepage.homepage'
              ? mockData.contentManager.singleTypeConfiguration
              : mockData.contentManager.collectionTypeConfiguration;

          return res(ctx.json({ data: configuration }));
        }

        return res(
          ctx.json({
            data: {
              contentType: {
                uid: orphanModelUid,
                settings: {
                  bulkable: false,
                  filterable: false,
                  searchable: false,
                  pageSize: 10,
                  mainField: 'title',
                  defaultSortBy: '',
                  defaultSortOrder: 'ASC',
                },
                metadatas: {},
                options: {},
                layouts: {
                  edit: [],
                  list: [],
                },
              },
              components: {
                'orphan.ghost': {
                  layouts: {
                    edit: [[{ name: 'field', size: 12 }]],
                  },
                  metadatas: {
                    field: {
                      edit: {
                        label: 'field',
                        description: '',
                        placeholder: '',
                        visible: true,
                        editable: true,
                      },
                    },
                  },
                  settings: {},
                  isComponent: true,
                },
              },
            },
          })
        );
      })
    );

    const { result } = renderHook(() => useDocumentLayout(orphanModelUid));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.edit.components).toEqual({});
  });

  it('waits for the active model configuration when switching single types and handles missing component settings safely (regression gh#26206)', async () => {
    const firstModelUid = 'api::homepage.homepage';
    const secondModelUid = 'api::address.address';

    server.use(
      rest.get('/content-manager/init', (req, res, ctx) =>
        res(
          ctx.json({
            data: {
              components: mockData.contentManager.components,
              contentTypes: mockData.contentManager.contentTypes,
            },
          })
        )
      ),
      rest.get('/content-manager/content-types/:model/configuration', (req, res, ctx) => {
        if (req.params.model === firstModelUid) {
          return res(ctx.json({ data: mockData.contentManager.singleTypeConfiguration }));
        }

        if (req.params.model === secondModelUid) {
          return res(
            ctx.delay(75),
            ctx.json({
              data: {
                contentType: {
                  uid: secondModelUid,
                  settings: {
                    bulkable: true,
                    filterable: true,
                    searchable: true,
                    pageSize: 10,
                    mainField: 'id',
                    defaultSortBy: 'id',
                    defaultSortOrder: 'ASC',
                  },
                  metadatas:
                    mockData.contentManager.collectionTypeConfiguration.contentType.metadatas,
                  options: {},
                  layouts: {
                    edit: mockData.contentManager.collectionTypeConfiguration.contentType.layouts
                      .edit,
                    list: mockData.contentManager.collectionTypeConfiguration.contentType.layouts
                      .list,
                  },
                },
                // Simulate mismatch where component settings map is not ready/available yet.
                components: {},
              },
            })
          );
        }

        return res(ctx.json({ data: mockData.contentManager.collectionTypeConfiguration }));
      })
    );

    const { result, rerender } = renderHook(({ model }) => useDocumentLayout(model), {
      initialProps: { model: firstModelUid },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ model: secondModelUid });

    expect(result.current.isLoading).toBe(true);
    // While switching to a model with no cached layout we surface the
    // empty default rather than bleeding the previous model's layout.
    expect(result.current.edit.layout).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.edit.settings.displayName).toBe('Address');
    expect(result.current.edit.layout.length).toBeGreaterThan(0);
  });
});

describe('extractContentTypeComponents', () => {
  it('omits component UIDs that are referenced but missing from the catalog', () => {
    const attributes = {
      footer: {
        type: 'component' as const,
        repeatable: false,
        component: 'missing.catalog.component' as const,
        pluginOptions: {},
        required: false,
      },
    };

    expect(extractContentTypeComponents(attributes, {})).toEqual({});
  });
});
