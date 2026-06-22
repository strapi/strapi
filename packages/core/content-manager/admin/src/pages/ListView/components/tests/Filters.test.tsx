import { render as renderRTL, screen } from '@tests/utils';

import { listViewFilters as Filters } from '../Filters';

import type { Schema } from '../../../../hooks/useDocument';
import type { ListLayout } from '../../../../hooks/useDocumentLayout';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAdminUsers: jest.fn(() => ({ data: { users: [] }, isLoading: false })),
  useAuth: jest.fn(() => [
    {
      action: 'plugin::content-manager.explorer.read',
      subject: 'api::article.article',
      properties: {
        fields: ['title'],
      },
    },
  ]),
  useQueryParams: jest.fn(() => [{ query: {} }]),
  useStrapiApp: jest.fn((_name, selector) =>
    selector({
      runHookWaterfall: jest.fn((_hookName, payload) => payload),
    })
  ),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

jest.mock('../../../../hooks/useContentTypeSchema', () => ({
  useContentTypeSchema: jest.fn(() => ({ schemas: [] })),
}));

jest.mock('../../../../services/contentTypes', () => ({
  useGetContentTypeConfigurationQuery: jest.fn(() => ({
    metadata: {
      id: {
        list: {
          label: 'ID',
        },
      },
      documentId: {
        list: {
          label: 'Document ID',
        },
      },
    },
  })),
}));

describe('ListView Filters', () => {
  it('does not crash when filterable field metadata is not loaded yet', async () => {
    const schema = {
      uid: 'api::article.article',
      isDisplayed: true,
      apiID: 'article',
      modelName: 'article',
      globalId: 'Article',
      modelType: 'contentType',
      kind: 'collectionType',
      info: {
        displayName: 'Article',
        singularName: 'article',
        pluralName: 'articles',
      },
      options: {},
      pluginOptions: {},
      attributes: {
        id: { type: 'integer' },
        documentId: { type: 'string' },
        title: { type: 'string' },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' },
      },
    } satisfies Schema;

    const layout = {
      layout: [],
      metadatas: {},
      options: {},
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'id',
        defaultSortBy: 'id',
        defaultSortOrder: 'ASC' as const,
      },
    } satisfies ListLayout;

    renderRTL(
      <Filters.Root schema={schema} layout={layout}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
      </Filters.Root>
    );

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
  });
});
