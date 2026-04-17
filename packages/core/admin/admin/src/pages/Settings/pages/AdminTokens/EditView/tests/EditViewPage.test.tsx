import { render, waitFor } from '@tests/utils';

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
  });
});
