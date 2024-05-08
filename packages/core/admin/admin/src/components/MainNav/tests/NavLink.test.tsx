import { House, Lock } from '@strapi/icons';
import { screen, render as renderRTL } from '@tests/utils';

import { NavLink } from '../NavLink';

describe('NavLink', () => {
  const Component = () => (
    <NavLink.Link to="/test-link">
      <NavLink.Tooltip label="test-tooltip">
        <>
          <NavLink.Icon label="house">
            <House data-testid="nav-link-icon" />
          </NavLink.Icon>
          <NavLink.Badge label="badge label">
            <Lock data-testid="nav-link-badge" />
          </NavLink.Badge>
        </>
      </NavLink.Tooltip>
    </NavLink.Link>
  );

  const render = () => renderRTL(<Component />);

  it('shows the NavLink with link to destination', async () => {
    render();
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test-link');
  });
  it('shows the home icon in the link', async () => {
    render();
    expect(screen.getByTestId('nav-link-icon')).toBeInTheDocument();
  });
  it('shows the badge next to the link', async () => {
    render();
    expect(screen.getByTestId('nav-link-badge')).toBeInTheDocument();
  });
});
