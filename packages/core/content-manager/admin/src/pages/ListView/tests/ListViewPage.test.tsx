import { render, screen, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { ListViewPage } from '../ListViewPage';

/**
 * The ListViewPage uses the content-manager plugin's InjectionZone which
 * depends on getPlugin() from StrapiAppProvider. The test providers mock
 * getPlugin as a bare jest.fn(), so we mock InjectionZone to avoid the error.
 */
jest.mock('../../../components/InjectionZone', () => ({
  InjectionZone: () => null,
}));

/**
 * The ListViewPage is wrapped with DocumentRBAC in production (via ProtectedListViewPage).
 * We mock useDocumentRBAC to avoid needing the full RBAC provider setup.
 */
jest.mock('../../../features/DocumentRBAC', () => ({
  ...jest.requireActual('../../../features/DocumentRBAC'),
  useDocumentRBAC: jest.fn().mockReturnValue({ canCreate: true }),
}));

/**
 * TableActions depends on the content-manager plugin's apis (getDocumentActions),
 * which isn't registered in the test StrapiAppProvider. Mock it out.
 */
jest.mock('../components/TableActions', () => ({
  TableActions: () => null,
}));

/**
 * BulkActionsRenderer also depends on the content-manager plugin's apis (getBulkActions),
 * which is triggered when rows are selected. Mock it out.
 */
jest.mock('../components/BulkActions/Actions', () => ({
  BulkActionsRenderer: () => null,
}));

const setup = () => {
  // Override the collection-types handler to include pagination
  server.use(
    rest.get('/content-manager/collection-types/:contentType', (req, res, ctx) => {
      return res(
        ctx.json({
          results: [
            { documentId: '12345', id: 1, name: 'Entry 1', publishedAt: null },
            { documentId: '67890', id: 2, name: 'Entry 2', publishedAt: null },
            { documentId: 'abcde', id: 3, name: 'Entry 3', publishedAt: null },
          ],
          pagination: { page: 1, pageSize: 10, pageCount: 1, total: 3 },
        })
      );
    })
  );

  return render(<ListViewPage />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <Routes>
            <Route path="/content-manager/:collectionType/:slug" element={children} />
          </Routes>
        );
      },
    },
    initialEntries: ['/content-manager/collection-types/api::address.address'],
  });
};

describe('ListViewPage', () => {
  it('should render table rows with link elements for navigation', async () => {
    setup();

    // Wait for the table to render with data — the default list layout columns
    // are ['id', 'categories', 'cover', 'postal_code'], so we wait for an id value
    expect(await screen.findByText('3 entries found')).toBeInTheDocument();

    // Verify that link elements are rendered in the table for each row.
    // The RowLink uses React Router's Link which renders an <a> tag.
    const links = screen.getAllByRole('link', { hidden: true });
    const rowLinks = links.filter(
      (link) =>
        link.getAttribute('href')?.includes('12345') ||
        link.getAttribute('href')?.includes('67890') ||
        link.getAttribute('href')?.includes('abcde')
    );

    expect(rowLinks).toHaveLength(3);

    // Verify each link href contains the correct documentId
    expect(rowLinks[0]).toHaveAttribute('href', expect.stringContaining('12345'));
    expect(rowLinks[1]).toHaveAttribute('href', expect.stringContaining('67890'));
    expect(rowLinks[2]).toHaveAttribute('href', expect.stringContaining('abcde'));
  });

  it('should still allow checkbox selection without navigating', async () => {
    const { user } = setup();

    expect(await screen.findByText('3 entries found')).toBeInTheDocument();

    // Click the first row's checkbox
    const firstRowCheckbox = screen.getByRole('checkbox', { name: /select 1/i });
    await user.click(firstRowCheckbox);

    // The "1 row selected" text confirms selection worked and we're still on the list page
    expect(screen.getByText(/1 row selected/i)).toBeInTheDocument();
  });
});
