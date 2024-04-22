import { render, screen } from '@tests/utils';

import { NavLink } from '../NavLink';

describe('NavLink', () => {
  it('shows the NavLink with link to destination', async () => {
    render(
      <NavLink to="/content-manager" badgeContent="5">
        test link
      </NavLink>
    );
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/content-manager');
  });
  it('shows the badge next to the link', async () => {
    render(
      <NavLink to="/content-manager" badgeContent="5">
        test link
      </NavLink>
    );
    const badge = screen.getByText('5');
    expect(badge).toBeInTheDocument();
  });
});
