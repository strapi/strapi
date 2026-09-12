import { server } from '@tests/server';
import { render, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { clearDocumentSpaceCache } from '../../hooks/useDocumentSpace';
import { SpaceListCell } from '../SpaceListCell';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
}));

let mockParams: { slug?: string } = { slug: 'api::article.article' };

const owns = (owners: Record<string, unknown>) => {
  server.use(http.get('*/spaces/ownership', () => HttpResponse.json({ data: owners })));
};

describe('the Space cell', () => {
  beforeEach(() => {
    clearDocumentSpaceCache();
    mockParams = { slug: 'api::article.article' };
  });

  it('names the space that owns the entry', async () => {
    owns({ 'doc-1': { id: 1, name: 'France', slug: 'france' } });

    render(<SpaceListCell documentId="doc-1" />);

    expect(await screen.findByText('France')).toBeVisible();
  });

  it('marks an entry no space owns as shared', async () => {
    // Every space can see it, which is a state a project can really be in.
    owns({ 'doc-1': null });

    render(<SpaceListCell documentId="doc-1" />);

    expect(await screen.findByText('Shared')).toBeVisible();
  });

  it('says nothing until the answer arrives, rather than guessing', () => {
    owns({ 'doc-1': { id: 1, name: 'France', slug: 'france' } });

    render(<SpaceListCell documentId="doc-1" />);

    expect(screen.queryByText('France')).not.toBeInTheDocument();
    expect(screen.queryByText('Shared')).not.toBeInTheDocument();
  });

  it('says nothing when the route does not name what is being listed', async () => {
    mockParams = {};
    owns({ 'doc-1': { id: 1, name: 'France', slug: 'france' } });

    render(<SpaceListCell documentId="doc-1" />);

    await waitFor(() => expect(screen.queryByText('France')).not.toBeInTheDocument());
    expect(screen.queryByText('Shared')).not.toBeInTheDocument();
  });
});
