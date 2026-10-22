import { Table } from '@strapi/admin/strapi-admin';
import { render, screen } from '@tests/utils';

import { addColumnToTableHook } from '../ReleaseListCell';

import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';

const LAYOUT: ListLayout = {
  layout: [],
  settings: {
    bulkable: true,
    defaultSortBy: 'id',
    defaultSortOrder: 'asc',
    filterable: true,
    searchable: true,
    pageSize: 10,
    mainField: 'name',
  },
  metadatas: {},
  options: {
    draftAndPublish: true,
  },
};

describe('ReleaseListCell', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders the releases cell for a row that has `ref` and `key` attributes', async () => {
    const {
      displayedHeaders: [header],
    } = addColumnToTableHook({ displayedHeaders: [], layout: LAYOUT });
    // The list view translates plugin labels before calling the formatter.
    const listViewHeader = { ...header, label: 'To be released in' } as ListFieldLayout;

    const row = {
      id: 1,
      documentId: 'abc123',
      ref: 'ref-value',
      key: 'key-value',
    };

    render(
      <Table.Root rows={[row]} headers={[]}>
        {header.cellFormatter!(row, listViewHeader, {
          collectionType: 'collection-types',
          model: 'api::address.address',
        })}
      </Table.Root>
    );

    expect(await screen.findByText('-')).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
