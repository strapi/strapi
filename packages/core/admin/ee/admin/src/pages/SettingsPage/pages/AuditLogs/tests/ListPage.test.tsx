import { within } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { rest } from 'msw';

import { ListPage } from '../ListPage';

describe('ADMIN | Pages | AUDIT LOGS | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should render page with right header details', async () => {
    render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    expect(screen.getByRole('heading', { name: 'Audit Logs' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();

    expect(screen.getByRole('grid')).toBeInTheDocument();

    [
      'Action',
      'Date',
      'User',
      'Admin logout',
      'October 31, 2023, 15:56:54',
      'Create user',
      'October 31, 2023, 15:57:38',
    ].forEach((cell) => {
      expect(screen.getByRole('gridcell', { name: cell })).toBeInTheDocument();
    });

    expect(screen.getAllByRole('gridcell', { name: 'test testing' })).toHaveLength(2);
  });

  it('should have pagination when theres enough data', async () => {
    server.use(
      rest.get('/admin/audit-logs', (req, res, ctx) => {
        return res(
          ctx.json({
            results: [],
            pagination: {
              page: 1,
              pageSize: 10,
              pageCount: 5,
              total: 50,
            },
          })
        );
      })
    );

    render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    expect(screen.getByRole('combobox', { name: 'Entries per page' })).toBeInTheDocument();

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();

    ['Go to previous page', 'Go to page 1', 'Go to next page'].forEach((link) => {
      expect(screen.getByRole('link', { name: link })).toBeInTheDocument();
    });
  });

  it.skip('should open a modal when clicked on a table row and close modal when clicked', async () => {
    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('row', {
        name: 'Admin logout October 31, 2023, 15:56:54 test testing admin.logout action details',
      })
    );

    const dialog = await screen.findByRole('dialog', { name: 'October 31, 2023, 15:56:54' });

    expect(dialog).toBeInTheDocument();

    expect(within(dialog).getByText('Admin logout')).toBeInTheDocument();
    expect(within(dialog).getByText('test testing')).toBeInTheDocument();
    expect(within(dialog).getAllByText('October 31, 2023, 15:56:54')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Close the modal' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should show the correct inputs for filtering', async () => {
    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Filters' }));

    expect(screen.getByRole('combobox', { name: 'Select field' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select filter' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Search and select an option to filter' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add filter' })).toBeInTheDocument();
  });
});
