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

describe('NavLink with external URL', () => {
  const ExternalLinkComponent = () => (
    <NavLink.Link to="https://market.strapi.io" target="_blank" rel="noopener noreferrer">
      <NavLink.Tooltip label="marketplace-tooltip">
        <NavLink.Icon label="marketplace">
          <House data-testid="external-link-icon" />
        </NavLink.Icon>
      </NavLink.Tooltip>
    </NavLink.Link>
  );

  const ExternalNavButtonComponent = () => (
    <NavLink.NavButton to="https://example.com" target="_blank">
      <NavLink.Icon label="example">
        <House data-testid="external-button-icon" />
      </NavLink.Icon>
    </NavLink.NavButton>
  );

  it('renders external link as anchor tag with href', () => {
    renderRTL(<ExternalLinkComponent />);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://market.strapi.io');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders external NavButton as anchor tag with href', () => {
    renderRTL(<ExternalNavButtonComponent />);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not have active class for external links', () => {
    renderRTL(<ExternalLinkComponent />);
    const link = screen.getByRole('link');
    expect(link).not.toHaveClass('active');
  });
});
