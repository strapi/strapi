import { render as renderRTL, screen } from '@tests/utils';

import { listViewFilters as Filters } from '../Filters';

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
    renderRTL(
      <Filters.Root
        schema={
          {
            uid: 'api::article.article',
            options: {},
            attributes: {
              id: { type: 'integer' },
              documentId: { type: 'string' },
              title: { type: 'string' },
              createdAt: { type: 'datetime' },
              updatedAt: { type: 'datetime' },
            },
          } as any
        }
        layout={{ options: {} } as any}
      >
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
      </Filters.Root>
    );

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
  });
});
