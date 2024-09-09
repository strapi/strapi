import { render } from '@tests/utils';

import { EditView } from '../EditViewPage';

describe('ADMIN | Pages | API TOKENS | EditView', () => {
  it('renders and matches the snapshot when creating token', async () => {
    const { findByText } = render(<EditView />, {
      initialEntries: ['/settings/api-tokens/create'],
    });

    await findByText('Address');
  });

  it('renders and matches the snapshot when editing existing token', async () => {
    const { findByText } = render(<EditView />, {
      initialEntries: ['/settings/api-tokens/1'],
    });

    await findByText('My super token');
    await findByText('This describe my super token');
    await findByText('Regenerate');
    await findByText('Address');
  });
});
