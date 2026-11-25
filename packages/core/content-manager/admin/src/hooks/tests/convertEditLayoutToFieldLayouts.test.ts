import { convertEditLayoutToFieldLayouts } from '../useDocumentLayout';

import type { Component } from '../../../../shared/contracts/components';
import type { ContentType, Metadatas } from '../../../../shared/contracts/content-types';

describe('convertEditLayoutToFieldLayouts', () => {
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

  const metadatas: Metadatas = {
    user: {
      edit: {
        editable: true,
        label: 'User',
        description: '',
        placeholder: '',
        visible: true,
      },
      list: {
        label: 'User',
        searchable: true,
        sortable: true,
      },
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

  const rows = [[{ name: 'user', size: 6 }]];

  it('does not throw when component UID is missing from configurations', () => {
    expect(() =>
      convertEditLayoutToFieldLayouts(
        rows,
        contentTypeAttributes,
        metadatas,
        {
          configurations: {},
          schemas: componentSchemas,
        },
        []
      )
    ).not.toThrow();
  });
});
