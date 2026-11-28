import { fixtures } from '@strapi/admin-test-utils';
import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SUPER_ADMIN_CODE } from '../../../../../../../shared/utils/super-admin';
import { initialState } from '../../../../../../tests/store';
import { EditPage } from '../EditPage';

import type { MfaEnforcementSettings } from '../../../../../../../shared/contracts/security-settings';

const mockIsMfaFeatureEnabled = jest.fn(() => false);
jest.mock('../../../../../utils/mfaFeature', () => ({
  ...jest.requireActual('../../../../../utils/mfaFeature'),
  isMfaFeatureEnabled: () => mockIsMfaFeatureEnabled(),
}));

/**
 * Logs in a user with the given role code who holds every permission except the email settings
 * one. A token is needed for the auth provider to load the user and their permissions.
 */
const renderEditPage = (roleCode: string, { canReadSecurity = true } = {}) => {
  server.use(
    http.get('/admin/users/me', () =>
      HttpResponse.json({
        data: {
          id: 1,
          email: 'michka@michka.fr',
          firstname: 'michoko',
          lastname: 'ronronscelestes',
          username: 'yolo',
          preferedLanguage: 'en',
          roles: [{ id: 1, code: roleCode }],
        },
      })
    ),
    http.get('/admin/users/me/permissions', () =>
      HttpResponse.json({
        data: fixtures.permissions.allPermissions.filter(
          (permission) => permission.action !== 'plugin::email.settings.read'
        ),
      })
    )
  );

  const preloadedState = initialState();
  preloadedState.admin_app.token = 'token';
  if (canReadSecurity) {
    // The shared fixtures have no `settings.security` entry in their redux permission map.
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

  return render(<EditPage />, {
    initialEntries: ['/settings/roles/1'],
    providerOptions: { storeConfig: { preloadedState } },
  });
};

const openEmailSettings = async (user: ReturnType<typeof render>['user']) => {
  await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

  await user.click(await screen.findByRole('tab', { name: 'Settings' }));
  await user.click(screen.getByRole('button', { name: /Email/ }));
};

const getEmailSettingsCheckbox = () => screen.getByLabelText('Access the Email Settings page');

describe('Roles | EditPage', () => {
  it('only lets a user grant permissions they hold', async () => {
    const { user } = renderEditPage('strapi-editor');

    await openEmailSettings(user);

    await waitFor(() => expect(getEmailSettingsCheckbox()).toBeDisabled());
  });

  it('lets a super admin grant any permission', async () => {
    const { user } = renderEditPage(SUPER_ADMIN_CODE);

    await openEmailSettings(user);

    await waitFor(() => expect(getEmailSettingsCheckbox()).toBeEnabled());
  });

  describe('saving', () => {
    const CEILING_ERROR_MESSAGE =
      "Some permissions could not be saved because you don't have them yourself.";

    const mockSaves = (permissionsResponse: () => Response) => {
      const calls: string[] = [];

      server.use(
        http.put('/admin/roles/:id/permissions', () => {
          calls.push('permissions');

          return permissionsResponse();
        }),
        http.put('/admin/roles/:id', () => {
          calls.push('role');

          return HttpResponse.json({ data: { id: 1, code: 'strapi-editor', name: 'Renamed' } });
        })
      );

      return calls;
    };

    const renameAndSave = async (user: ReturnType<typeof render>['user']) => {
      await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

      const name = await screen.findByRole('textbox', { name: 'Name' });
      await user.clear(name);
      await user.type(name, 'Renamed');
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    };

    it('does not save the name when the permissions are rejected, and explains why', async () => {
      const calls = mockSaves(() =>
        HttpResponse.json(
          {
            error: {
              status: 403,
              name: 'ForbiddenError',
              message: 'You cannot grant permissions you do not hold yourself',
              details: { permissions: [{ action: 'plugin::email.settings.read' }] },
            },
          },
          { status: 403 }
        )
      );
      const { user } = renderEditPage('strapi-editor');

      await renameAndSave(user);

      expect(await screen.findByText(CEILING_ERROR_MESSAGE)).toBeInTheDocument();
      expect(calls).toEqual(['permissions']);
    });

    it('shows the server message for another forbidden error', async () => {
      mockSaves(() =>
        HttpResponse.json(
          { error: { status: 403, name: 'ForbiddenError', message: 'Forbidden', details: {} } },
          { status: 403 }
        )
      );
      const { user } = renderEditPage('strapi-editor');

      await renameAndSave(user);

      expect(await screen.findByText('Forbidden')).toBeInTheDocument();
      expect(screen.queryByText(CEILING_ERROR_MESSAGE)).not.toBeInTheDocument();
    });

    it('saves the permissions first, then the name', async () => {
      const calls = mockSaves(() => HttpResponse.json({ data: [] }));
      const { user } = renderEditPage('strapi-editor');

      await renameAndSave(user);

      await waitFor(() => expect(calls).toEqual(['permissions', 'role']));
    });
  });

  describe('two-factor requirement alert', () => {
    const ALERT_TEXT =
      'Users with this role must set up two-factor authentication. Change this in Settings › Security.';

    const mockSecuritySettings = (mfa: MfaEnforcementSettings) => {
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
    };

    const waitForPage = () => screen.findByRole('textbox', { name: 'Name' }).then(() => undefined);

    beforeEach(() => mockIsMfaFeatureEnabled.mockReturnValue(true));
    afterEach(() => mockIsMfaFeatureEnabled.mockReturnValue(false));

    it('is shown, with a link to the Security settings, when everyone is required', async () => {
      mockSecuritySettings({ mode: 'required', graceDays: 7, requiredRoles: [] });
      renderEditPage('strapi-editor');

      expect(await screen.findByText(ALERT_TEXT)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to Security settings' })).toHaveAttribute(
        'href',
        '/settings/security'
      );
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    });

    it('is shown when the role is one of the selected roles', async () => {
      mockSecuritySettings({ mode: 'optional', graceDays: 7, requiredRoles: ['1'] });
      renderEditPage('strapi-editor');

      expect(await screen.findByText(ALERT_TEXT)).toBeInTheDocument();
    });

    it('is not shown when the role is not selected', async () => {
      mockSecuritySettings({ mode: 'optional', graceDays: 7, requiredRoles: ['2'] });
      renderEditPage('strapi-editor');

      await waitForPage();
      expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();
    });

    it('is not shown when nothing is required', async () => {
      mockSecuritySettings({ mode: 'off', graceDays: 7, requiredRoles: [] });
      renderEditPage('strapi-editor');

      await waitForPage();
      expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();
    });

    it('is not shown when the feature flag is off', async () => {
      mockIsMfaFeatureEnabled.mockReturnValue(false);
      mockSecuritySettings({ mode: 'required', graceDays: 7, requiredRoles: [] });
      renderEditPage('strapi-editor');

      await waitForPage();
      expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();
    });

    it('is not shown to a caller who cannot read the security settings', async () => {
      mockSecuritySettings({ mode: 'required', graceDays: 7, requiredRoles: [] });
      renderEditPage('strapi-editor', { canReadSecurity: false });

      await waitForPage();
      expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();
    });
  });
});
