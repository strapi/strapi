import { useRBAC } from '@strapi/helper-plugin';
import { fireEvent, render, waitFor, screen } from '@tests/utils';

import { SingleSignOnPage } from '../SingleSignOnPage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useFocusWhenNavigate: jest.fn(),
}));

describe('Admin | ee | SettingsPage | SSO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    jest.mocked(useRBAC).mockImplementation(() => ({
      isLoading: false,
      setIsLoading: jest.fn(),
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    render(<SingleSignOnPage />);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Default role' })).toHaveTextContent('Editor')
    );

    expect(screen.getByRole('heading', { name: 'Single Sign-On' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: 'Auto-registration' })).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Default role' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Local authentication lock-out' })
    ).toBeInTheDocument();
  });

  it('should disable the form when there is no change', async () => {
    jest.mocked(useRBAC).mockImplementation(() => ({
      isLoading: false,
      setIsLoading: jest.fn(),
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    render(<SingleSignOnPage />);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Default role' })).toHaveTextContent('Editor')
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should not disable the form when there is a change', async () => {
    jest.mocked(useRBAC).mockImplementation(() => ({
      isLoading: false,
      setIsLoading: jest.fn(),
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    render(<SingleSignOnPage />);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Default role' })).toHaveTextContent('Editor')
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-registration' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
