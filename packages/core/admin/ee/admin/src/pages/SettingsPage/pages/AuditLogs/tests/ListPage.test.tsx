import { within } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { delay, http, HttpResponse } from 'msw';
import { Link } from 'react-router-dom';

import { ListPage } from '../ListPage';

const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

window.URL.createObjectURL = jest.fn(() => 'blob:mock');
window.URL.revokeObjectURL = jest.fn();

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

  it('should render the export button in the header', async () => {
    render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    expect(await screen.findByRole('button', { name: 'Export as CSV' })).toBeInTheDocument();
  });

  it('should fetch every part, show progress, and save only when the user downloads', async () => {
    let exportCalls = 0;
    server.use(
      http.get('/admin/audit-logs/export', async () => {
        exportCalls += 1;

        if (exportCalls === 1) {
          await delay(50);

          return new HttpResponse('\uFEFFid,action\r\n1,entry.update\r\n', {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename="audit-logs-2026-08-25.csv"',
              'X-Audit-Logs-Export-Until': '10',
              'X-Audit-Logs-Export-Token': 'tok',
              'X-Audit-Logs-Export-Next-Cursor': '5',
            },
          });
        }

        return new HttpResponse('2,entry.update\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'X-Audit-Logs-Export-Until': '10',
            'X-Audit-Logs-Export-Token': 'tok',
            'X-Audit-Logs-Export-Next-Cursor': 'none',
          },
        });
      })
    );

    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: 'Export as CSV' }));

    expect(await screen.findByText('Exporting audit logs')).toBeInTheDocument();

    expect(await screen.findByText('Export ready')).toBeInTheDocument();
    expect(exportCalls).toBe(2);
    expect(screen.getByText('audit-logs-2026-08-25.csv')).toBeInTheDocument();
    expect(anchorClick).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Download CSV' }));

    expect(anchorClick).toHaveBeenCalledTimes(1);
    const anchor = anchorClick.mock.instances[0] as unknown as { download: string };
    expect(anchor.download).toBe('audit-logs-2026-08-25.csv');
    expect(screen.queryByText('Export ready')).not.toBeInTheDocument();
  });

  it('should drop the export without saving when the user dismisses it', async () => {
    server.use(
      http.get('/admin/audit-logs/export', () => {
        return new HttpResponse('\uFEFFid,action\r\n1,entry.update\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'X-Audit-Logs-Export-Until': '10',
            'X-Audit-Logs-Export-Token': 'tok',
            'X-Audit-Logs-Export-Next-Cursor': 'none',
          },
        });
      })
    );

    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: 'Export as CSV' }));

    expect(await screen.findByText('Export ready')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Export ready')).not.toBeInTheDocument();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('should warn before an in-app navigation while an export is pending', async () => {
    server.use(
      http.get('/admin/audit-logs/export', () => {
        return new HttpResponse('﻿id,action\r\n1,entry.update\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'X-Audit-Logs-Export-Until': '10',
            'X-Audit-Logs-Export-Token': 'tok',
            'X-Audit-Logs-Export-Next-Cursor': 'none',
          },
        });
      })
    );

    const { user } = render(
      <>
        <ListPage />
        <Link to="/somewhere-else">Leave the page</Link>
      </>
    );

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: 'Export as CSV' }));

    expect(await screen.findByText('Export ready')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Leave the page' }));

    expect(
      await screen.findByText(
        'Are you sure you want to leave? Your ongoing export will be canceled.'
      )
    ).toBeInTheDocument();

    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' })
    );

    expect(
      screen.queryByText('Are you sure you want to leave? Your ongoing export will be canceled.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Export ready')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Leave the page' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(
        screen.queryByText('Are you sure you want to leave? Your ongoing export will be canceled.')
      ).not.toBeInTheDocument()
    );
  });

  it('should stop fetching parts when the page unmounts mid export', async () => {
    let exportCalls = 0;
    server.use(
      http.get('/admin/audit-logs/export', async () => {
        exportCalls += 1;
        await delay(50);

        return new HttpResponse('﻿id,action\r\n1,entry.update\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'X-Audit-Logs-Export-Until': '10',
            'X-Audit-Logs-Export-Token': 'tok',
            'X-Audit-Logs-Export-Next-Cursor': String(exportCalls * 5),
          },
        });
      })
    );

    const { user, unmount } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: 'Export as CSV' }));
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(exportCalls).toBe(1);
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('should fail instead of saving a truncated file when the cursor header is stripped', async () => {
    server.use(
      http.get('/admin/audit-logs/export', () => {
        // No X-Audit-Logs-Export-Next-Cursor header, as a proxy stripping it
        return new HttpResponse('﻿id,action\r\n1,entry.update\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'X-Audit-Logs-Export-Until': '10',
            'X-Audit-Logs-Export-Token': 'tok',
          },
        });
      })
    );

    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: 'Export as CSV' }));

    expect(await screen.findByText('The export failed. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Export ready')).not.toBeInTheDocument();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('should report an export exceeding the configured limit', async () => {
    server.use(
      http.get('/admin/audit-logs/export', () =>
        HttpResponse.json(
          { error: { status: 413, name: 'PayloadTooLargeError', message: 'too large' } },
          { status: 413 }
        )
      )
    );

    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: 'Export as CSV' }));

    expect(
      await screen.findByText('Table too large to export. Please add filters and try again.')
    ).toBeInTheDocument();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('should fail loudly and save nothing when a later part fails', async () => {
    let exportCalls = 0;
    server.use(
      http.get('/admin/audit-logs/export', () => {
        exportCalls += 1;

        if (exportCalls === 1) {
          return new HttpResponse('\uFEFFid,action\r\n1,entry.update\r\n', {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'X-Audit-Logs-Export-Until': '10',
              'X-Audit-Logs-Export-Token': 'tok',
              'X-Audit-Logs-Export-Next-Cursor': '5',
            },
          });
        }

        return HttpResponse.json(
          { error: { status: 500, name: 'InternalServerError', message: 'boom' } },
          { status: 500 }
        );
      })
    );

    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: 'Export as CSV' }));

    expect(await screen.findByText('The export failed. Please try again.')).toBeInTheDocument();
    expect(exportCalls).toBe(2);
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it('should not render the export button without the export permission', async () => {
    render(<ListPage />, {
      providerOptions: {
        permissions: (defaultPermissions) =>
          defaultPermissions.filter(
            (permission) => permission.action !== 'admin::audit-logs.export'
          ),
      },
    });

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export as CSV' })).not.toBeInTheDocument();
  });

  it('should have pagination when theres enough data', async () => {
    server.use(
      http.get('/admin/audit-logs', () => {
        return HttpResponse.json({
          results: [],
          pagination: {
            page: 1,
            pageSize: 10,
            pageCount: 5,
            total: 50,
          },
        });
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

  it('should show the User filter option even when the user cannot read admin users', async () => {
    const { user } = render(<ListPage />, {
      providerOptions: {
        permissions: (defaultPermissions) =>
          defaultPermissions.filter((permission) => permission.action !== 'admin::users.read'),
      },
    });

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Filters' }));

    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));

    expect(await screen.findByRole('option', { name: 'User' })).toBeInTheDocument();
  });

  it('should show the User filter option when the user can read admin users', async () => {
    const { user } = render(<ListPage />);

    await waitFor(() => expect(screen.queryByText('Loading content')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Filters' }));

    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));

    expect(await screen.findByRole('option', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'User' })).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'User' }));
    await user.click(
      screen.getByRole('combobox', { name: 'Search and select an option to filter' })
    );

    expect(await screen.findByRole('option', { name: 'John Doe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kai Doe' })).toBeInTheDocument();
  });
});
