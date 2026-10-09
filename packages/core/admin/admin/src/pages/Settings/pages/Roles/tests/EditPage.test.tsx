import { fixtures } from '@strapi/admin-test-utils';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SUPER_ADMIN_CODE } from '../../../../../../../shared/utils/super-admin';
import { initialState } from '../../../../../../tests/store';
import { EditPage } from '../EditPage';

/**
 * Logs in a user with the given role code who holds every permission except the email settings
 * one. A token is needed for the auth provider to load the user and their permissions.
 */
const renderEditPage = (roleCode: string) => {
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
});
