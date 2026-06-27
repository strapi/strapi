import * as React from 'react';

import { render, screen } from '@testing-library/react';

import { useAuth } from '../../../features/Auth';
import { Plugin } from '../Plugin';

jest.mock('../../../features/Auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: jest.fn(),
}));

describe('Plugin.injectComponent', () => {
  let plugin: Plugin;
  const mockedUseAuth = jest.mocked(useAuth);

  beforeEach(() => {
    mockedUseAuth.mockReturnValue(true);

    plugin = new Plugin({
      id: 'test-plugin',
      name: 'Test Plugin',
      injectionZones: { editView: { informations: [], 'right-links': [] } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('wraps the stored component in an auth boundary HOC', () => {
    const Dummy = () => null;
    Dummy.displayName = 'Dummy';

    plugin.injectComponent('editView', 'right-links', {
      name: 'dummy',
      Component: Dummy,
    });

    const [stored] = plugin.getInjectedComponents('editView', 'right-links');
    expect(stored.Component).not.toBe(Dummy);
    expect(stored.Component.displayName).toBe('InjectionZoneAuthBoundary(Dummy)');
  });

  it('derives the HOC displayName from Component.name when displayName is absent', () => {
    plugin.injectComponent('editView', 'right-links', {
      name: 'named-fn',
      // eslint-disable-next-line prefer-arrow-callback
      Component: function NamedComponent() {
        return null;
      },
    });

    const [stored] = plugin.getInjectedComponents('editView', 'right-links');
    expect(stored.Component.displayName).toBe('InjectionZoneAuthBoundary(NamedComponent)');
  });

  it('wraps the injected component in AuthProvider when the auth context is missing', () => {
    mockedUseAuth.mockReturnValue(undefined);
    plugin.injectComponent('editView', 'right-links', {
      name: 'auth-aware',
      Component: () => <span>injected component</span>,
    });

    const [stored] = plugin.getInjectedComponents('editView', 'right-links');

    render(React.createElement(stored.Component));

    expect(mockedUseAuth).toHaveBeenCalledWith(
      'InjectionZoneAuthBoundary',
      expect.any(Function),
      false
    );
    expect(screen.getByTestId('auth-provider')).toContainElement(
      screen.getByText('injected component')
    );
  });

  it('does not nest AuthProvider when the auth context is already present', () => {
    plugin.injectComponent('editView', 'right-links', {
      name: 'auth-aware',
      Component: () => <span>injected component</span>,
    });

    const [stored] = plugin.getInjectedComponents('editView', 'right-links');

    render(React.createElement(stored.Component));

    expect(screen.queryByTestId('auth-provider')).not.toBeInTheDocument();
    expect(screen.getByText('injected component')).toBeInTheDocument();
  });
});
