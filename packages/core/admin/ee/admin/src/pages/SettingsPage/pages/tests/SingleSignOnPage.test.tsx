import { fireEvent, render, waitFor, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SingleSignOnPage } from '../SingleSignOnPage';

jest.mock('../../../../../../../admin/src/hooks/useRBAC', () => ({
  useRBAC: () => ({
    isLoading: false,
    allowedActions: {
      canRead: true,
      canUpdate: true,
    },
  }),
}));

describe('Admin | ee | SettingsPage | SSO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
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
    render(<SingleSignOnPage />);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Default role' })).toHaveTextContent('Editor')
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should not disable the form when there is a change', async () => {
    render(<SingleSignOnPage />);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Default role' })).toHaveTextContent('Editor')
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-registration' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('should only show the "Choose here" placeholder once when no default role is set', async () => {
    server.use(
      http.get('/admin/providers/options', () =>
        HttpResponse.json({
          data: {
            autoRegister: false,
            defaultRole: null,
            ssoLockedRoles: [],
          },
        })
      )
    );

    render(<SingleSignOnPage />);

    const defaultRoleCombobox = await screen.findByRole('combobox', { name: 'Default role' });

    expect(defaultRoleCombobox).toHaveTextContent(/^Choose here$/);
  });
});
