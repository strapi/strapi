import { convertListLayoutToFieldLayouts } from '../useDocumentLayout';

import type { Component } from '../../../../shared/contracts/components';
import type { ContentType } from '../../../../shared/contracts/content-types';

/**
 * List column conversion must pass the same optional arguments as `formatListLayout` so
 * `getMainField` can resolve types for component and relation columns.
 */
describe('convertListLayoutToFieldLayouts', () => {
  const componentUid = 'blog.test-como';

  const contentTypeAttributes: ContentType['attributes'] = {
    user: {
      type: 'component',
      component: componentUid,
      repeatable: false,
      required: true,
      pluginOptions: {},
    },
  };

  const listMetadatas = {
    user: {
      label: 'User',
      mainField: 'name',
      searchable: true,
      sortable: true,
    },
  };

  const componentSchemas: Record<string, Component> = {
    [componentUid]: {
      uid: componentUid,
      category: 'blog',
      isDisplayed: true,
      apiID: 'test-como',
      info: {
        displayName: 'test comp',
        icon: 'paint',
        description: '',
      },
      options: {},
      attributes: {
        name: {
          type: 'string',
          default: 'toto',
        },
      },
    } as unknown as Component,
  };

  const componentConfigurations = {
    [componentUid]: {
      uid: componentUid,
      category: 'blog',
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'name',
        defaultSortBy: 'name',
        defaultSortOrder: 'ASC' as const,
      },
      metadatas: {},
      layouts: { list: [], edit: [] },
      isComponent: true,
    },
  };

  const columns = ['user'];

  it('throws when configurations and schemas are omitted but list metadata defines mainField', () => {
    expect(() =>
      convertListLayoutToFieldLayouts(columns, contentTypeAttributes, listMetadatas)
    ).toThrow(TypeError);
  });

  it('resolves component mainField when configurations, component schemas, and content-type schemas are provided', () => {
    const result = convertListLayoutToFieldLayouts(
      columns,
      contentTypeAttributes,
      listMetadatas,
      {
        configurations: componentConfigurations,
        schemas: componentSchemas,
      },
      []
    );

    expect(result).toHaveLength(1);
    expect(result[0].mainField).toEqual({ name: 'name', type: 'string' });
  });
});
