import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { EditView } from '../EditViewPage';

describe('ADMIN | Pages | ADMIN TOKENS | EditView', () => {
  describe('create mode', () => {
    it('renders the create form with name and description fields', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/admin-tokens/create'],
      });

      await findByText('Name');
      await findByText('Description');
    });

    it('does not render Token type selector (admin tokens have no type)', async () => {
      const { findByText, queryByText } = render(<EditView />, {
        initialEntries: ['/settings/admin-tokens/create'],
      });

      await findByText('Name');
      await waitFor(() => {
        expect(queryByText('Token type')).not.toBeInTheDocument();
      });
    });

    it('renders the admin permissions matrix', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/admin-tokens/create'],
      });

      // Permissions component renders "Plugins" and "Settings" tabs
      await findByText('Plugins');
    });
  });

  describe('edit mode — admin token (id: 1)', () => {
    it('renders the token name and description', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/admin-tokens/1'],
      });

      await findByText('My admin token');
      await findByText('This is an admin token');
    });

    it('does not render Token type selector', async () => {
      const { findByText, queryByText } = render(<EditView />, {
        initialEntries: ['/settings/admin-tokens/1'],
      });

      await findByText('My admin token');
      await waitFor(() => {
        expect(queryByText('Token type')).not.toBeInTheDocument();
      });
    });

    it('renders the admin permissions matrix', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/admin-tokens/1'],
      });

      await findByText('My admin token');
      await findByText('Plugins');
    });

    it('hides admin permissions matrix when owner-permissions request fails for non-owner edit', async () => {
      server.use(
        http.get('/admin/admin-tokens/:id', () => {
          return HttpResponse.json({
            data: {
              id: '1',
              name: 'My admin token',
              description: 'This is an admin token',
              kind: 'admin',
              adminPermissions: [{ action: 'plugin::email.settings.read', subject: null }],
              adminUserOwner: {
                // current mocked user is id=1 => non-owner path
                id: 2,
                firstname: 'Jane',
                lastname: 'Owner',
                email: 'jane@example.com',
              },
              createdAt: '2021-11-15T00:00:00.000Z',
            },
          });
        }),
        http.get('/admin/admin-tokens/:id/owner-permissions', () => {
          return HttpResponse.json(
            { error: { message: 'failed to load owner perms' } },
            { status: 500 }
          );
        }),
        http.put('/admin/admin-tokens/:id', () =>
          HttpResponse.json({
            data: {
              id: '1',
              name: 'My admin token',
              description: 'This is an admin token',
              kind: 'admin',
              adminPermissions: [],
              adminUserOwner: {
                id: 2,
                firstname: 'Jane',
                lastname: 'Owner',
                email: 'jane@example.com',
              },
              createdAt: '2021-11-15T00:00:00.000Z',
            },
          })
        )
      );

      const { findByText, queryByText } = render(<EditView />, {
        initialEntries: ['/settings/admin-tokens/1'],
      });

      await findByText('My admin token');
      await waitFor(() => {
        expect(queryByText('Plugins')).not.toBeInTheDocument();
      });
    });
  });
});
