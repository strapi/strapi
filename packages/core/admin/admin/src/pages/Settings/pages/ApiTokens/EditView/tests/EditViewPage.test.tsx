import { render, waitFor } from '@tests/utils';

import { EditView } from '../EditViewPage';

describe('ADMIN | Pages | API TOKENS | EditView', () => {
  describe('create mode', () => {
    it('renders the create form with token type selector', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/create'],
      });

      await findByText('Name');
      await findByText('Description');
      await findByText('Token type');
    });
  });

  describe('edit mode — content-api token (id: 1)', () => {
    it('renders content permissions and token type selector', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/1'],
      });

      await findByText('My super token');
      await findByText('This describe my super token');
      await findByText('Regenerate');
      await findByText('Address');
      await findByText('Token type');
    });

    it('does not render admin permissions matrix', async () => {
      const { findByText, queryByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/1'],
      });

      await findByText('My super token');
      expect(queryByText('Plugins and Settings')).not.toBeInTheDocument();
    });

    it('does not render content-api permissions section for content-api token', async () => {
      const { findByText, queryByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/1'],
      });

      await findByText('My super token');
      await waitFor(() => {
        expect(queryByText('Bound route to')).not.toBeInTheDocument();
      });
    });
  });
});
