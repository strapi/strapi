import { render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ListPageCE } from '../ListPage';

describe('Users | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of users', async () => {
    const { findByText } = render(<ListPageCE />);

    await findByText('John');
    await findByText('Kai');
  });

  it('has no two-factor column when the rows carry no enforcement state', async () => {
    render(<ListPageCE />);

    await screen.findByText('John');
    expect(screen.queryByText('Two-factor')).not.toBeInTheDocument();
  });

  /**
   * The server appends enforcement state for callers who can act on it, while the feature is on.
   * Watching grace periods run out is the whole job of the administrator who enabled enforcement,
   * and before this it meant opening every user in turn.
   */
  it('shows each account’s two-factor state when the rows carry it', async () => {
    server.use(
      http.get('/admin/users', () =>
        HttpResponse.json({
          data: {
            results: [
              {
                id: 1,
                firstname: 'Set',
                lastname: 'Up',
                roles: [],
                mfaEnabledAt: '2026-09-01T10:00:00.000Z',
                mfaGraceUntil: null,
                mfaLockedAt: null,
              },
              {
                id: 2,
                firstname: 'On',
                lastname: 'Clock',
                roles: [],
                mfaEnabledAt: null,
                mfaGraceUntil: '2026-09-11T10:00:00.000Z',
                mfaLockedAt: null,
              },
              {
                id: 3,
                firstname: 'Was',
                lastname: 'Out',
                roles: [],
                mfaEnabledAt: null,
                mfaGraceUntil: null,
                mfaLockedAt: '2026-09-12T10:00:00.000Z',
              },
              {
                id: 4,
                firstname: 'Never',
                lastname: 'Asked',
                roles: [],
                mfaEnabledAt: null,
                mfaGraceUntil: null,
                mfaLockedAt: null,
              },
            ],
            pagination: { page: 1 },
          },
        })
      )
    );
    render(<ListPageCE />);

    await screen.findByText('Was');
    expect(screen.getByText('Two-factor')).toBeInTheDocument();
    expect(screen.getByText('Set up')).toBeInTheDocument();
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('Not set up')).toBeInTheDocument();
  });
});
