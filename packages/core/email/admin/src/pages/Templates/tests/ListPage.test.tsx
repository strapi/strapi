import { render, screen } from '@tests/utils';

import { ListPage } from '../ListPage';

describe('Templates ListPage', () => {
  it('lists templates, filtered by the prefix in the URL', async () => {
    render(<ListPage />, { initialEntries: ['/?prefix=end-users.'] });

    expect(await screen.findByText('end-users.confirm-email')).toBeInTheDocument();
    expect(screen.getByText('end-users.reset-password')).toBeInTheDocument();
    expect(screen.queryByText('orders.receipt')).not.toBeInTheDocument();

    expect(screen.getByText('Asks a new user to confirm their email address')).toBeInTheDocument();
    expect(screen.getByText('en, fr')).toBeInTheDocument();
    // Only the customized template carries the badge.
    expect(screen.getAllByText('Customized')).toHaveLength(1);
  });

  it('lists every template without a prefix', async () => {
    render(<ListPage />);

    expect(await screen.findByText('orders.receipt')).toBeInTheDocument();
    expect(screen.getByText('end-users.confirm-email')).toBeInTheDocument();
  });
});
