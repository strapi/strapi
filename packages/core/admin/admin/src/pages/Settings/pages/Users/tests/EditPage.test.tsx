import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { EditPage } from '../EditPage';

jest.mock(
  '../../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/MagicLinkEE',
  () => ({
    MagicLinkEE: () => 'EE magic link',
  })
);

describe('Users | EditPage', () => {
  it('should render', async () => {
    const { user } = render(<EditPage />, {
      initialEntries: ['/settings/users/1'],
    });

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

    await screen.findByRole('heading', { name: 'Edit John Doe' });

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /User's role/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Last name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: 'Active' })).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: "User's roles" })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: "User's roles" }));

    await screen.findByRole('option', { name: 'Editor' });
  });

  describe('magic link', () => {
    const originalIsEE = window.strapi.isEE;
    const originalIsEnabled = window.strapi.features.isEnabled;

    beforeEach(() => {
      window.strapi.isEE = true;
      server.use(
        http.get('/admin/users/1', () =>
          HttpResponse.json({
            data: {
              id: 1,
              firstname: 'John',
              lastname: 'Doe',
              email: 'test@testing.com',
              registrationToken: 'token',
              roles: [{ id: 1, code: 'strapi-editor', name: 'Editor' }],
            },
          })
        )
      );
    });

    afterEach(() => {
      window.strapi.isEE = originalIsEE;
      window.strapi.features.isEnabled = originalIsEnabled;
    });

    it('should render the EE magic link with the sso feature', async () => {
      window.strapi.features.isEnabled = (name) => name === 'sso';

      render(<EditPage />, { initialEntries: ['/settings/users/1'] });

      expect(await screen.findByText('EE magic link')).toBeInTheDocument();
    });

    it('should render the CE magic link when the license lacks the sso feature', async () => {
      window.strapi.features.isEnabled = () => false;

      render(<EditPage />, { initialEntries: ['/settings/users/1'] });

      expect(
        await screen.findByText('Copy and share this link to give access to this user')
      ).toBeInTheDocument();
      expect(screen.queryByText('EE magic link')).not.toBeInTheDocument();
    });
  });
});
