import { initialState } from '@tests/store';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ListPage } from '../ListPage';

import type { MfaEnforcementSettings } from '../../../../../../../shared/contracts/security-settings';

const mockIsMfaFeatureEnabled = jest.fn(() => false);
jest.mock('../../../../../utils/mfaFeature', () => ({
  ...jest.requireActual('../../../../../utils/mfaFeature'),
  isMfaFeatureEnabled: () => mockIsMfaFeatureEnabled(),
}));

jest.mock('../../../../../hooks/useAdminRoles', () => ({
  useAdminRoles: jest.fn(() => ({
    roles: [
      {
        code: 'strapi-super-admin',
        created_at: '2021-08-24T14:37:20.384Z',
        description: 'Super Admins can access and manage all features and settings.',
        id: 1,
        name: 'Super Admin',
        updatedAt: '2021-08-24T14:37:20.384Z',
        usersCount: 1,
      },
      {
        code: 'strapi-editor',
        created_at: '2021-08-24T14:37:20.384Z',
        description: 'Editors can manage and publish contents.',
        id: 2,
        name: 'Editor',
        updatedAt: '2021-08-24T14:37:20.384Z',
        usersCount: 3,
      },
    ],
    isLoading: false,
  })),
}));

const renderList = ({ canReadSecurity = true } = {}) => {
  const preloadedState = initialState();
  if (canReadSecurity) {
    preloadedState.admin_app.permissions = {
      ...preloadedState.admin_app.permissions,
      settings: {
        ...preloadedState.admin_app.permissions.settings,
        security: {
          main: [{ action: 'admin::security-settings.read', subject: null }],
          read: [{ action: 'admin::security-settings.read', subject: null }],
          update: [{ action: 'admin::security-settings.update', subject: null }],
        },
      } as typeof preloadedState.admin_app.permissions.settings,
    };
  }

  return render(<ListPage />, { providerOptions: { storeConfig: { preloadedState } } });
};

const mockSecuritySettings = (mfa: MfaEnforcementSettings) =>
  server.use(
    http.get('/admin/security-settings', () =>
      HttpResponse.json({
        data: {
          mfa,
          trustedDevices: { enabled: false, days: 30 },
          passkeys: { enabled: false },
        },
      })
    )
  );

describe('<ListPage />', () => {
  afterEach(() => mockIsMfaFeatureEnabled.mockReturnValue(false));

  it('should show a list of roles', async () => {
    const { findByText } = render(<ListPage />);

    expect(await findByText('Super Admin')).toBeInTheDocument();
  });

  describe('Two-factor column', () => {
    beforeEach(() => mockIsMfaFeatureEnabled.mockReturnValue(true));

    it('marks only the selected roles as Required', async () => {
      mockSecuritySettings({ mode: 'optional', graceDays: 7, requiredRoles: ['2'] });
      renderList();

      expect(await screen.findByText('Two-factor')).toBeInTheDocument();
      const editorRow = screen.getByText('Editor').closest('tr') as HTMLElement;
      const adminRow = screen.getByText('Super Admin').closest('tr') as HTMLElement;
      await waitFor(() => expect(editorRow).toHaveTextContent('Required'));
      expect(adminRow).not.toHaveTextContent('Required');
    });

    it('marks every role as Required when everyone is required', async () => {
      mockSecuritySettings({ mode: 'required', graceDays: 7, requiredRoles: [] });
      renderList();

      expect(await screen.findAllByText('Required')).toHaveLength(2);
    });

    it('leaves the column empty when nothing is required', async () => {
      mockSecuritySettings({ mode: 'off', graceDays: 7, requiredRoles: [] });
      renderList();

      expect(await screen.findByText('Two-factor')).toBeInTheDocument();
      expect(screen.queryByText('Required')).not.toBeInTheDocument();
    });

    it('has no column when the caller cannot read the security settings', async () => {
      mockSecuritySettings({ mode: 'required', graceDays: 7, requiredRoles: [] });
      renderList({ canReadSecurity: false });

      await screen.findByText('Editor');
      expect(screen.queryByText('Two-factor')).not.toBeInTheDocument();
    });

    it('has no column when the feature flag is off', async () => {
      mockIsMfaFeatureEnabled.mockReturnValue(false);
      mockSecuritySettings({ mode: 'required', graceDays: 7, requiredRoles: [] });
      renderList();

      await screen.findByText('Editor');
      expect(screen.queryByText('Two-factor')).not.toBeInTheDocument();
    });
  });
});
