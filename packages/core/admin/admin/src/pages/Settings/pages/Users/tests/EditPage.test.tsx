import { render, screen, waitFor, server, fireEvent } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { EditPage } from '../EditPage';

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

  describe('two-factor panel', () => {
    const userWith = (mfa: Record<string, string | null>) =>
      http.get('/admin/users/1', () =>
        HttpResponse.json({
          data: {
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            email: 'test@testing.com',
            roles: [{ id: 1, code: 'strapi-editor', name: 'Editor' }],
            ...mfa,
          },
        })
      );

    const renderEdit = () => render(<EditPage />, { initialEntries: ['/settings/users/1'] });

    it('renders nothing when the server did not append the enforcement state (feature off or no permission)', async () => {
      renderEdit();

      await screen.findByRole('heading', { name: 'Edit John Doe' });
      expect(
        screen.queryByRole('heading', { name: 'Two-factor authentication' })
      ).not.toBeInTheDocument();
    });

    it('shows Not enrolled', async () => {
      server.use(userWith({ mfaEnabledAt: null, mfaGraceUntil: null, mfaLockedAt: null }));
      renderEdit();

      await screen.findByRole('heading', { name: 'Two-factor authentication' });
      expect(screen.getByText('Not enrolled')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
    });

    it('shows Enrolled since a date', async () => {
      server.use(
        userWith({
          mfaEnabledAt: '2026-09-01T10:14:00.000Z',
          mfaGraceUntil: null,
          mfaLockedAt: null,
        })
      );
      renderEdit();

      expect(await screen.findByText(/^Enrolled since .*2026/)).toBeInTheDocument();
    });

    it('shows the grace deadline with date and time', async () => {
      server.use(
        userWith({
          mfaEnabledAt: null,
          mfaGraceUntil: '2026-09-11T14:30:00.000Z',
          mfaLockedAt: null,
        })
      );
      renderEdit();

      const line = await screen.findByText(
        /^Not enrolled\. Must set up two-factor authentication before/
      );
      expect(line).toHaveTextContent(/2026/);
      expect(line).toHaveTextContent(/\d{1,2}:\d{2}/);
    });

    it('shows the lock (for password login, with the SSO caveat) and unlocks after confirmation', async () => {
      let unlocked = false;
      server.use(
        http.get('/admin/users/1', () =>
          HttpResponse.json({
            data: {
              id: 1,
              firstname: 'John',
              lastname: 'Doe',
              email: 'test@testing.com',
              roles: [{ id: 1, code: 'strapi-editor', name: 'Editor' }],
              mfaEnabledAt: null,
              mfaGraceUntil: unlocked ? null : '2026-09-01T14:30:00.000Z',
              mfaLockedAt: unlocked ? null : '2026-09-08T14:30:00.000Z',
            },
          })
        ),
        http.post('/admin/mfa/users/1/unlock', () => {
          unlocked = true;
          return new HttpResponse(null, { status: 204 });
        })
      );
      const { user } = renderEdit();

      expect(await screen.findByText(/^Locked for password login since/)).toBeInTheDocument();
      expect(screen.getByText(/single sign-on.*until its next refresh/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Unlock' }));
      expect(screen.getByRole('alertdialog', { name: 'Unlock this account?' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText('Account unlocked')).toBeInTheDocument();
      expect(await screen.findByText('Not enrolled')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
    });

    it('toasts the server message when the unlock is refused', async () => {
      server.use(
        userWith({
          mfaEnabledAt: null,
          mfaGraceUntil: '2026-09-01T14:30:00.000Z',
          mfaLockedAt: '2026-09-08T14:30:00.000Z',
        }),
        http.post('/admin/mfa/users/1/unlock', () =>
          HttpResponse.json(
            {
              error: {
                status: 400,
                name: 'BadRequestError',
                message: 'This account is not locked',
              },
            },
            { status: 400 }
          )
        )
      );
      const { user } = renderEdit();

      await user.click(await screen.findByRole('button', { name: 'Unlock' }));
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText('This account is not locked')).toBeInTheDocument();
    });

    it('disables Unlock without the update permission', async () => {
      server.use(
        userWith({
          mfaEnabledAt: null,
          mfaGraceUntil: '2026-09-01T14:30:00.000Z',
          mfaLockedAt: '2026-09-08T14:30:00.000Z',
        })
      );
      render(<EditPage />, {
        initialEntries: ['/settings/users/1'],
        providerOptions: {
          permissions: (defaults) => defaults.filter((p) => p.action !== 'admin::users.update'),
        },
      });

      expect(await screen.findByRole('button', { name: 'Unlock' })).toBeDisabled();
    });
  });
});
