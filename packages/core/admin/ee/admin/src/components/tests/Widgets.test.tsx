import { render, screen } from '@tests/utils';

import { useGetAuditLogsQuery } from '../../services/auditLogs';
import { AuditLogsWidget } from '../AuditLogs/Widgets';

jest.mock('../../services/auditLogs', () => ({
  useGetAuditLogsQuery: jest.fn(),
}));

describe('Homepage Widget Audit Logs', () => {
  it('renders loading state', () => {
    jest.mocked(useGetAuditLogsQuery).mockReturnValue({
      isLoading: true,
      error: false,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<AuditLogsWidget />);
    expect(screen.getByText(/loading widget content/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    jest.mocked(useGetAuditLogsQuery).mockReturnValue({
      isLoading: false,
      error: true,
      data: undefined,
      refetch: jest.fn(),
    });
    render(<AuditLogsWidget />);
    expect(screen.getByText(/couldn't load widget content/i)).toBeInTheDocument();
  });

  it('renders no data state', () => {
    jest.mocked(useGetAuditLogsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: {
        results: [],
      },
      refetch: jest.fn(),
    });
    render(<AuditLogsWidget />);
    expect(screen.getByText(/no activity/i)).toBeInTheDocument();
  });

  it('renders the list', async () => {
    jest.mocked(useGetAuditLogsQuery).mockReturnValue({
      isLoading: false,
      error: false,
      data: {
        results: [
          {
            action: 'entry.update',
            date: new Date().setHours(new Date().getHours() - 1),
            payload: {
              model: 'tag',
            },
            id: 2,
            user: {
              id: 1,
              email: 'michael.scott@dundermifflin.com',
              displayName: 'Michael Scott',
            },
          },
          {
            action: 'entry.create',
            date: new Date().setDate(new Date().getDate() - 1),
            payload: {
              model: 'tag',
            },
            id: 1,
            user: {
              id: 1,
              email: 'michael.scott@dundermifflin.com',
              displayName: 'Michael Scott',
            },
          },
          {
            action: 'admin.auth.success',
            date: new Date().setDate(new Date().getDate() - 8),
            payload: {
              provider: 'local',
            },
            id: 3,
            user: {
              id: 1,
              email: 'michael.scott@dundermifflin.com',
              displayName: 'Michael Scott',
            },
          },
        ],
      },
      refetch: jest.fn(),
    });
    render(<AuditLogsWidget />);

    // Check that the first row displays the update entry parts
    expect(screen.getByText('Update entry (tag)')).toBeInTheDocument();
    expect(screen.getByText(/1 hour ago/i)).toBeInTheDocument();

    // Check that the second row displays the create entry parts
    expect(screen.getByText('Create entry (tag)')).toBeInTheDocument();
    expect(screen.getByText(/yesterday/i)).toBeInTheDocument();

    // Check that the third row displays the admin login parts
    expect(screen.getByText('Admin login')).toBeInTheDocument();
    expect(screen.getByText(/8 days ago/i)).toBeInTheDocument();

    expect(screen.getAllByText('Michael Scott')).toHaveLength(3);
  });
});
