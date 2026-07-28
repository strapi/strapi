import { mockData } from '@tests/mockData';
import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { listViewFilters } from '../Filters';

// #26396 — omits creator attributes (missing from the schema) and drops `slug` from the
// configuration metadatas below, so the filter builder hits both missing-field lookups.
const HOMEPAGE_SCHEMA = {
  uid: 'api::homepage.homepage',
  options: {},
  attributes: {
    id: { type: 'integer' },
    documentId: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    createdAt: { type: 'datetime' },
    updatedAt: { type: 'datetime' },
  },
} as unknown as Parameters<typeof listViewFilters.Root>[0]['schema'];

const LAYOUT = { options: {} } as Parameters<typeof listViewFilters.Root>[0]['layout'];

const renderFilters = () =>
  render(
    <listViewFilters.Root schema={HOMEPAGE_SCHEMA} layout={LAYOUT}>
      <listViewFilters.Trigger />
    </listViewFilters.Root>
  );

describe('ListView Filters (#26396)', () => {
  it('does not crash when filter fields are missing from the schema or configuration', async () => {
    server.use(
      http.get('/content-manager/content-types/:model/configuration', () => {
        const config = structuredClone(mockData.contentManager.singleTypeConfiguration);
        delete (config.contentType.metadatas as Record<string, unknown>).slug;
        return HttpResponse.json({ data: config });
      })
    );

    renderFilters();

    expect(await screen.findByRole('button', { name: /filters/i })).toBeInTheDocument();
  });
});
