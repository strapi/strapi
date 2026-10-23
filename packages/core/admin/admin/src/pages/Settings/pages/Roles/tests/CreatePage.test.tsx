import { fixtures } from '@strapi/admin-test-utils';
import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { SUPER_ADMIN_CODE } from '../../../../../../../shared/utils/super-admin';
import { initialState } from '../../../../../../tests/store';
import { CreatePage } from '../CreatePage';

const EMAIL_SETTINGS = 'plugin::email.settings.read';
const READ_LOCALES = 'plugin::i18n.locale.read';

const settingsPermission = (id: number, action: string) => ({
  id,
  action,
  actionParameters: {},
  subject: null,
  properties: {},
  conditions: [],
});

/**
 * Logs in a user with the given role code who holds every permission except the email settings
 * one, and duplicates role 1, which has both the email settings and the read locales
 * permissions. Returns the permissions sent for the new role (`undefined` when none are sent).
 */
const renderDuplicatePage = (roleCode: string) => {
  const sent: { permissions?: unknown[] } = {};
  let createdRoles = 0;

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
          (permission) => permission.action !== EMAIL_SETTINGS
        ),
      })
    ),
    http.get('/admin/permissions', () =>
      HttpResponse.json({
        data: {
          conditions: [],
          sections: {
            collectionTypes: { actions: [], subjects: [] },
            singleTypes: { actions: [], subjects: [] },
            plugins: [],
            settings: [
              {
                displayName: 'Access the Email Settings page',
                category: 'email',
                subCategory: 'general',
                action: EMAIL_SETTINGS,
              },
              {
                displayName: 'Read locales',
                category: 'email',
                subCategory: 'general',
                action: READ_LOCALES,
              },
            ],
          },
        },
      })
    ),
    http.get('/admin/roles/1/permissions', () =>
      HttpResponse.json({
        data: [settingsPermission(1, EMAIL_SETTINGS), settingsPermission(2, READ_LOCALES)],
      })
    ),
    http.post('/admin/roles', () => {
      createdRoles += 1;

      return HttpResponse.json({ data: { id: 3, name: 'Copy', description: 'Copy' } });
    }),
    http.put('/admin/roles/3/permissions', async ({ request }) => {
      const body = (await request.json()) as { permissions: unknown[] };
      sent.permissions = body.permissions;

      return HttpResponse.json({ data: body.permissions });
    })
  );

  const preloadedState = initialState();
  preloadedState.admin_app.token = 'token';

  const rendered = render(
    <Routes>
      <Route path="/settings/roles/duplicate/:id" element={<CreatePage />} />
      <Route path="*" element={null} />
    </Routes>,
    {
      initialEntries: ['/settings/roles/duplicate/1'],
      providerOptions: { storeConfig: { preloadedState } },
    }
  );

  return { ...rendered, sent, getCreatedRoles: () => createdRoles };
};

const openEmailSettings = async (user: ReturnType<typeof render>['user']) => {
  await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

  await user.click(await screen.findByRole('tab', { name: 'Settings' }));
  await user.click(screen.getByRole('button', { name: /Email/ }));
};

const getEmailSettingsCheckbox = () => screen.getByLabelText('Access the Email Settings page');
const getReadLocalesCheckbox = () => screen.getByLabelText('Read locales');

const save = async (user: ReturnType<typeof render>['user']) => {
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Copy');
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
};

describe('Roles | CreatePage', () => {
  describe('duplicate', () => {
    it('only copies the permissions the user may grant', async () => {
      const { user, sent, getCreatedRoles } = renderDuplicatePage('strapi-editor');

      await openEmailSettings(user);

      await waitFor(() => expect(getReadLocalesCheckbox()).toBeChecked());
      expect(getReadLocalesCheckbox()).toBeEnabled();
      expect(getEmailSettingsCheckbox()).not.toBeChecked();
      expect(getEmailSettingsCheckbox()).toBeDisabled();

      await save(user);

      await waitFor(() => expect(sent.permissions).toBeDefined());
      expect(getCreatedRoles()).toBe(1);
      expect(sent.permissions).toEqual([
        { action: READ_LOCALES, subject: null, properties: {}, conditions: [] },
      ]);
    });

    it('copies every permission for a super admin', async () => {
      const { user, sent } = renderDuplicatePage(SUPER_ADMIN_CODE);

      await openEmailSettings(user);

      await waitFor(() => expect(getEmailSettingsCheckbox()).toBeChecked());
      expect(getReadLocalesCheckbox()).toBeChecked();

      await save(user);

      await waitFor(() => expect(sent.permissions).toBeDefined());
      expect(sent.permissions).toEqual(
        expect.arrayContaining([
          { action: EMAIL_SETTINGS, subject: null, properties: {}, conditions: [] },
          { action: READ_LOCALES, subject: null, properties: {}, conditions: [] },
        ])
      );
      expect(sent.permissions).toHaveLength(2);
    });
  });
});
