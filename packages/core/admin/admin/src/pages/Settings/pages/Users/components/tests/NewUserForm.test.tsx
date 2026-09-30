import { fireEvent, render, screen, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ModalForm } from '../NewUserForm';

jest.mock(
  '../../../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/MagicLinkEE',
  () => ({
    MagicLinkEE: () => 'EE magic link',
  })
);

describe('Users | NewUserForm', () => {
  const originalIsEE = window.strapi.isEE;
  const originalIsEnabled = window.strapi.features.isEnabled;

  beforeEach(() => {
    window.strapi.isEE = true;
    server.use(
      http.post('/admin/users', () =>
        HttpResponse.json({ data: { id: 3, registrationToken: 'token' } })
      )
    );
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  const inviteUser = async () => {
    const { user } = render(<ModalForm onToggle={jest.fn()} />);

    await user.type(await screen.findByRole('textbox', { name: 'First name' }), 'Kai');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'kai.doe@strapi.io');
    await user.click(screen.getByRole('combobox', { name: "User's roles" }));
    await user.click(await screen.findByRole('option', { name: 'Editor' }));
    await user.keyboard('{Escape}');
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    await screen.findByRole('button', { name: 'Finish' });
  };

  it('should render the EE magic link with the sso feature', async () => {
    window.strapi.features.isEnabled = (name) => name === 'sso';

    await inviteUser();

    expect(screen.getByText('EE magic link')).toBeInTheDocument();
  });

  it('should render the CE magic link when the license lacks the sso feature', async () => {
    window.strapi.features.isEnabled = () => false;

    await inviteUser();

    expect(
      screen.getByText('Copy and share this link to give access to this user')
    ).toBeInTheDocument();
    expect(screen.queryByText('EE magic link')).not.toBeInTheDocument();
  });
});
