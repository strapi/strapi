import {
  normalizeComponentConfigurationResponse,
  normalizeComponentConfigurationLayout,
  normalizeContentTypeConfigurationResponse,
  normalizeContentManagerLayout,
  normalizeContentTypeSettingsResponse,
} from '../normalizeContentManagerLayout';

import type { Component } from '../../../../../shared/contracts/components';
import type {
  ContentType,
  FindContentTypeConfiguration,
} from '../../../../../shared/contracts/content-types';

describe('normalizeContentManagerLayout', () => {
  const componentUid = 'shared.seo';

  const settings = {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 10,
    mainField: 'title',
    defaultSortBy: 'title',
    defaultSortOrder: 'ASC' as const,
  };

  const componentSchema = {
    uid: componentUid,
    category: 'shared',
    isDisplayed: true,
    apiID: 'seo',
    info: { displayName: 'SEO', icon: 'search', description: '' },
    options: {},
    pluginOptions: {},
    attributes: {
      title: { type: 'string' as const },
    },
  } as unknown as Component;

  const relationSchema = {
    uid: 'api::category.category',
    info: { displayName: 'Category', singularName: 'category', pluralName: 'categories' },
    kind: 'collectionType',
    modelType: 'contentType',
    isDisplayed: true,
    apiID: 'category',
    options: {},
    pluginOptions: {},
    attributes: {
      name: { type: 'string' as const },
    },
  } as unknown as ContentType;

  const contentTypeSchema = {
    uid: 'api::article.article',
    info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
    kind: 'collectionType',
    modelType: 'contentType',
    isDisplayed: true,
    apiID: 'article',
    options: {},
    pluginOptions: {},
    attributes: {
      title: { type: 'string' as const },
      category: {
        type: 'relation' as const,
        relation: 'manyToOne',
        target: relationSchema.uid,
        targetModel: relationSchema.uid,
      },
      seo: {
        type: 'component' as const,
        component: componentUid,
        repeatable: false,
      },
    },
  } as unknown as ContentType;

  const data = {
    contentType: {
      uid: contentTypeSchema.uid,
      settings,
      layouts: {
        edit: [
          [
            { name: 'title', size: 6 },
            { name: 'deletedField', size: 6 },
          ],
        ],
        list: ['title', 'deletedField', 'category', 'seo'],
      },
      metadatas: {
        title: {
          edit: { label: 'Title', description: '', placeholder: '', visible: true, editable: true },
          list: { label: 'Title' },
        },
        deletedField: {
          edit: {
            label: 'Deleted',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
          list: { label: 'Deleted' },
        },
        category: {
          edit: {
            label: 'Category',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
          list: { label: 'Category', mainField: 'deletedName' },
        },
        seo: {
          edit: { label: 'SEO', description: '', placeholder: '', visible: true, editable: true },
          list: { label: 'SEO', mainField: 'deletedTitle' },
        },
      },
      options: {},
    },
    components: {
      [componentUid]: {
        uid: componentUid,
        category: 'shared',
        isComponent: true,
        settings: { ...settings, mainField: 'deletedTitle' },
        layouts: {
          edit: [
            [
              { name: 'title', size: 12 },
              { name: 'deletedComponentField', size: 12 },
            ],
          ],
          list: ['title', 'deletedComponentField'],
        },
        metadatas: {
          title: {
            edit: {
              label: 'Title',
              description: '',
              placeholder: '',
              visible: true,
              editable: true,
            },
            list: { label: 'Title' },
          },
          deletedComponentField: {
            edit: {
              label: 'Deleted component field',
              description: '',
              placeholder: '',
              visible: true,
              editable: true,
            },
            list: { label: 'Deleted component field' },
          },
        },
      },
      'shared.orphan': {
        uid: 'shared.orphan',
        category: 'shared',
        isComponent: true,
        settings,
        layouts: { edit: [], list: [] },
        metadatas: {},
      },
    },
  } satisfies FindContentTypeConfiguration.Response['data'];

  it('drops stale content-type layout fields and metadata', () => {
    const normalized = normalizeContentManagerLayout(data, {
      schema: contentTypeSchema,
      components: { [componentUid]: componentSchema },
      schemas: [contentTypeSchema, relationSchema],
    });

    expect(normalized.contentType.layouts.edit).toEqual([[{ name: 'title', size: 6 }]]);
    expect(normalized.contentType.layouts.list).toEqual(['title', 'category', 'seo']);
    expect(normalized.contentType.metadatas.deletedField).toBeUndefined();
  });

  it('drops component configuration without a matching component schema', () => {
    const normalized = normalizeContentManagerLayout(data, {
      schema: contentTypeSchema,
      components: { [componentUid]: componentSchema },
      schemas: [contentTypeSchema, relationSchema],
    });

    expect(normalized.components['shared.orphan']).toBeUndefined();
  });

  it('drops content-type layout fields whose component schema is unavailable', () => {
    const normalized = normalizeContentManagerLayout(data, {
      schema: contentTypeSchema,
      components: {},
      schemas: [contentTypeSchema, relationSchema],
    });

    expect(normalized.contentType.layouts.edit).toEqual([[{ name: 'title', size: 6 }]]);
    expect(normalized.contentType.layouts.list).toEqual(['title', 'category']);
    expect(normalized.contentType.metadatas.seo).toBeUndefined();
  });

  it('drops stale nested component layout fields and metadata', () => {
    const normalized = normalizeContentManagerLayout(data, {
      schema: contentTypeSchema,
      components: { [componentUid]: componentSchema },
      schemas: [contentTypeSchema, relationSchema],
    });

    expect(normalized.components[componentUid]?.layouts.edit).toEqual([
      [{ name: 'title', size: 12 }],
    ]);
    expect(normalized.components[componentUid]?.layouts.list).toEqual(['title']);
    expect(normalized.components[componentUid]?.metadatas.deletedComponentField).toBeUndefined();
  });

  it('falls invalid component and relation main fields back to id', () => {
    const normalized = normalizeContentManagerLayout(data, {
      schema: contentTypeSchema,
      components: { [componentUid]: componentSchema },
      schemas: [contentTypeSchema, relationSchema],
    });

    expect(normalized.contentType.metadatas.category?.list.mainField).toBe('id');
    expect(normalized.contentType.metadatas.seo?.list.mainField).toBe('id');
    expect(normalized.components[componentUid]?.settings.mainField).toBe('id');
  });

  it('normalizes relation main fields when relation attributes only expose target', () => {
    const targetOnlySchema = {
      ...contentTypeSchema,
      attributes: {
        ...contentTypeSchema.attributes,
        category: {
          type: 'relation' as const,
          relation: 'manyToOne',
          target: relationSchema.uid,
        },
      },
    } as unknown as ContentType;

    const normalized = normalizeContentManagerLayout(
      {
        ...data,
        contentType: {
          ...data.contentType,
          metadatas: {
            ...data.contentType.metadatas,
            category: {
              edit: {
                label: 'Category',
                description: '',
                placeholder: '',
                visible: true,
                editable: true,
              },
              list: { label: 'Category', mainField: 'deletedName' },
            },
          },
        },
      },
      {
        schema: targetOnlySchema,
        components: { [componentUid]: componentSchema },
        schemas: [targetOnlySchema, relationSchema],
      }
    );

    expect(normalized.contentType.metadatas.category?.list.mainField).toBe('id');
  });
});

describe('response shape normalization', () => {
  it('emits development warnings when malformed response shapes are repaired', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalWarn = console.warn;

    process.env.NODE_ENV = 'development';
    console.warn = jest.fn();

    try {
      normalizeContentTypeConfigurationResponse(
        {
          contentType: {
            settings: undefined,
            metadatas: undefined,
            layouts: {
              edit: [[{ name: 'title' }]],
              list: ['title', false],
            },
          },
        },
        'api::article.article'
      );

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Received malformed settings')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Received malformed metadatas')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Dropped malformed edit layout field')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Dropped malformed list layout field')
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      console.warn = originalWarn;
    }
  });

  it('normalizes malformed content-type configuration response shapes', () => {
    const normalized = normalizeContentTypeConfigurationResponse(
      {
        contentType: {
          settings: undefined,
          metadatas: {
            title: {
              edit: undefined,
            },
          },
          layouts: {
            edit: [[{ name: 'title', size: 6 }, { name: 'missing-size' }, null]],
            list: ['title', null, 1],
          },
        },
        components: {
          'shared.seo': {
            layouts: undefined,
            metadatas: undefined,
            settings: undefined,
          },
        },
      },
      'api::article.article'
    );

    expect(normalized.contentType.uid).toBe('api::article.article');
    expect(normalized.contentType.settings.mainField).toBe('id');
    expect(normalized.contentType.settings.defaultSortOrder).toBe('ASC');
    expect(normalized.contentType.metadatas.title).toEqual({
      edit: {},
      list: {},
    });
    expect(normalized.contentType.layouts).toEqual({
      edit: [[{ name: 'title', size: 6 }]],
      list: ['title'],
    });
    expect(normalized.components['shared.seo']?.layouts).toEqual({
      edit: [],
      list: [],
    });
  });

  it('normalizes malformed component configuration response shapes', () => {
    const normalized = normalizeComponentConfigurationResponse(
      {
        component: {
          layouts: {
            edit: undefined,
            list: ['label', false],
          },
          metadatas: undefined,
          settings: undefined,
        },
        components: undefined,
      },
      'shared.link'
    );

    expect(normalized.component.uid).toBe('shared.link');
    expect(normalized.component.metadatas).toEqual({});
    expect(normalized.component.layouts).toEqual({
      edit: [],
      list: ['label'],
    });
    expect(normalized.components).toEqual({});
  });

  it('normalizes content-type settings list responses', () => {
    expect(
      normalizeContentTypeSettingsResponse([
        undefined,
        { uid: 'api::article.article', settings: { mainField: 'title' } },
        { settings: { mainField: 'name' } },
      ])
    ).toEqual([
      {
        uid: 'api::article.article',
        settings: expect.objectContaining({ mainField: 'title' }),
      },
    ]);
  });
});

describe('normalizeComponentConfigurationLayout', () => {
  it('normalizes component configuration data with the same rules', () => {
    const componentSchema = {
      uid: 'shared.link',
      category: 'shared',
      isDisplayed: true,
      apiID: 'link',
      info: { displayName: 'Link', icon: 'link', description: '' },
      options: {},
      pluginOptions: {},
      attributes: {
        label: { type: 'string' as const },
      },
    } as unknown as Component;

    const normalized = normalizeComponentConfigurationLayout(
      {
        component: {
          uid: componentSchema.uid,
          category: 'shared',
          isComponent: true,
          settings: {
            bulkable: true,
            filterable: true,
            searchable: true,
            pageSize: 10,
            mainField: 'deletedLabel',
            defaultSortBy: 'label',
            defaultSortOrder: 'ASC',
          },
          layouts: {
            edit: [
              [
                { name: 'label', size: 6 },
                { name: 'deletedField', size: 6 },
              ],
            ],
            list: [],
          },
          metadatas: {
            label: {
              edit: {
                label: 'Label',
                description: '',
                placeholder: '',
                visible: true,
                editable: true,
              },
              list: { label: 'Label' },
            },
            deletedField: {
              edit: {
                label: 'Deleted',
                description: '',
                placeholder: '',
                visible: true,
                editable: true,
              },
              list: { label: 'Deleted' },
            },
          },
        },
        components: {},
      },
      { schema: componentSchema, components: {}, schemas: [] }
    );

    expect(normalized.component.layouts.edit).toEqual([[{ name: 'label', size: 6 }]]);
    expect(normalized.component.metadatas.deletedField).toBeUndefined();
    expect(normalized.component.settings.mainField).toBe('id');
  });
});
