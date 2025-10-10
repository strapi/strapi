import { useMemo } from 'react';

import { render as renderRTL, screen, waitFor } from '@tests/utils';
import { NavLink, useLocation } from 'react-router-dom';

import { BackButton, type BackButtonProps, HistoryProvider } from '../BackButton';

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testId="location">{location.pathname}</span>;
};

const RandomNavLink = () => {
  const location = useLocation();

  const to = useMemo(() => Math.random().toString(), [location]);

  return <NavLink to={to}>Navigate</NavLink>;
};

const render = (props: BackButtonProps = {}) =>
  renderRTL(<BackButton {...props} />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <HistoryProvider>
            {children}
            <RandomNavLink />
            <LocationDisplay />
          </HistoryProvider>
        );
      },
    },
  });

describe('BackButton', () => {
  it('should be disabled if there is no history and no fallback', () => {
    render();

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('should be enabled if there is a fallback', () => {
    render({ fallback: '..' });

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('should be enabled if there is history', async () => {
    const { user } = render();

    user.click(screen.getByRole('link', { name: 'Navigate' }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('aria-disabled', 'false')
    );
  });

  it('should navigate us backwards when pressed', async () => {
    const { user } = render();

    user.click(screen.getByRole('link', { name: 'Navigate' }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('aria-disabled', 'false')
    );

    const location1 = screen.getByTestId('location').textContent ?? '';

    user.click(screen.getByRole('link', { name: 'Navigate' }));

    await waitFor(() => expect(screen.getByTestId('location')).not.toHaveTextContent(location1));

    user.click(screen.getByRole('link', { name: 'Back' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(location1));

    user.click(screen.getByRole('link', { name: 'Back' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
  });
});
