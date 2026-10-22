import { Table } from '@strapi/admin/strapi-admin';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { addColumnToTableHook } from '../ReleaseListCell';

import type { ListFieldLayout, ListLayout } from '@strapi/content-manager/strapi-admin';

const LAYOUT = {
  layout: [],
  settings: {},
  metadatas: {},
  options: { draftAndPublish: true },
} as unknown as ListLayout;

describe('ReleaseListCell', () => {
  it('renders the releases cell for a row that has attributes named `ref` and `key`', async () => {
    server.use(
      http.get('/content-releases/mapEntriesToReleases', () =>
        HttpResponse.json({ data: { '123': [{ id: 1, name: 'Spring release' }] } })
      )
    );

    const { displayedHeaders } = addColumnToTableHook({ displayedHeaders: [], layout: LAYOUT });
    const { cellFormatter, ...header } = displayedHeaders[0] as ListFieldLayout;

    const row = { id: 1, documentId: '123', ref: 'some-ref', key: 'some-key' };

    // Call the formatter during render, like the ListView does
    const Cell = () => (
      <>
        {// @ts-expect-error – the ListView passes a third `meta` argument that isn't typed yet
        cellFormatter?.(row, header, { collectionType: '', model: 'api::article.article' })}
      </>
    );

    render(
      <Table.Root rows={[row]}>
        <Cell />
      </Table.Root>
    );

    expect(await screen.findByText('1 release')).toBeInTheDocument();
  });
});
