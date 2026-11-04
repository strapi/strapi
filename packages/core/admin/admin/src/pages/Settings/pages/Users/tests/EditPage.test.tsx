import { within } from '@testing-library/react';
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
    const originalFuture = window.strapi.future;

    beforeEach(() => {
      window.strapi.future = { isEnabled: (name) => name === 'unstableAdminMfa' };
    });

    afterEach(() => {
      window.strapi.future = originalFuture;
    });

    /** Unlock and removing passkeys lower another user's protection, so the dialog asks the viewer
     * for their own password and a code (Decision A). `/mfa/me` is a 404 here, so both are shown. */
    const confirmWithCredentials = async (
      user: ReturnType<typeof renderEdit>['user'],
      confirm: string
    ) => {
      const dialog = screen.getByRole('dialog');
      await user.type(within(dialog).getByLabelText(/Current password/), 'Password123');
      await user.type(within(dialog).getByLabelText(/Authentication code/), '123456');
      await user.click(within(dialog).getByRole('button', { name: confirm }));
    };

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

    it('shows Not enabled', async () => {
      server.use(userWith({ mfaEnabledAt: null, mfaGraceUntil: null, mfaLockedAt: null }));
      renderEdit();

      await screen.findByRole('heading', { name: 'Two-factor authentication' });
      expect(screen.getByText('Not enabled')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
    });

    it('shows Enabled since a date', async () => {
      server.use(
        userWith({
          mfaEnabledAt: '2026-09-01T10:14:00.000Z',
          mfaGraceUntil: null,
          mfaLockedAt: null,
        })
      );
      renderEdit();

      expect(await screen.findByText(/^Enabled since .*2026/)).toBeInTheDocument();
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

      const line = await screen.findByText(/^Not enabled\. Must be set up before/);
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
      expect(screen.getByText(/Single sign-on logins are not affected/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Unlock' }));
      expect(screen.getByRole('dialog', { name: 'Unlock this account?' })).toBeInTheDocument();
      await confirmWithCredentials(user, 'Unlock');

      expect(await screen.findByText('Account unlocked.')).toBeInTheDocument();
      expect(
        await screen.findByText('Not set up. A new grace period starts at their next login.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
    });

    it('shows the server message when the unlock is refused', async () => {
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
      await confirmWithCredentials(user, 'Unlock');

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

    const enrolled = () =>
      userWith({
        mfaEnabledAt: '2026-09-01T10:14:00.000Z',
        mfaGraceUntil: null,
        mfaLockedAt: null,
      });
    const DEVICE = {
      id: '3',
      deviceName: 'Chrome on macOS',
      createdAt: '2026-09-01T10:14:00.000Z',
      expiresAt: '2026-10-01T10:14:00.000Z',
      lastUsedAt: null,
    };

    it('shows the trusted device count for an enrolled user and revokes them after confirmation', async () => {
      let rows: unknown[] = [DEVICE, { ...DEVICE, id: '4' }];
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: rows })),
        http.delete('/admin/mfa/users/1/trusted-devices', () => {
          rows = [];
          return new HttpResponse(null, { status: 204 });
        })
      );
      const { user } = renderEdit();

      expect(await screen.findByText('2 trusted devices')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Revoke trusted devices' }));
      expect(
        screen.getByRole('alertdialog', { name: "Revoke this user's trusted devices?" })
      ).toBeInTheDocument();
      fireEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Revoke' })
      );

      expect(await screen.findByText('Trusted devices revoked.')).toBeInTheDocument();
      expect(await screen.findByText('No trusted devices')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Revoke trusted devices' })
      ).not.toBeInTheDocument();
    });

    it('uses the singular for one trusted device', async () => {
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [DEVICE] }))
      );
      renderEdit();

      expect(await screen.findByText('1 trusted device')).toBeInTheDocument();
    });

    it('does not ask for trusted devices when the user is not enrolled', async () => {
      let called = false;
      server.use(
        userWith({ mfaEnabledAt: null, mfaGraceUntil: null, mfaLockedAt: null }),
        http.get('/admin/mfa/users/1/trusted-devices', () => {
          called = true;
          return HttpResponse.json({ data: [] });
        })
      );
      renderEdit();

      await screen.findByText('Not enabled');
      expect(screen.queryByText(/trusted device/)).not.toBeInTheDocument();
      expect(called).toBe(false);
    });

    it('shows the count but no Revoke button without the update permission', async () => {
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [DEVICE] }))
      );
      render(<EditPage />, {
        initialEntries: ['/settings/users/1'],
        providerOptions: {
          permissions: (defaults) => defaults.filter((p) => p.action !== 'admin::users.update'),
        },
      });

      expect(await screen.findByText('1 trusted device')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Revoke trusted devices' })
      ).not.toBeInTheDocument();
    });

    it('toasts the server message when the revocation is refused', async () => {
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [DEVICE] })),
        http.delete('/admin/mfa/users/1/trusted-devices', () =>
          HttpResponse.json(
            { error: { status: 404, name: 'NotFoundError', message: 'User does not exist' } },
            { status: 404 }
          )
        )
      );
      const { user } = renderEdit();

      await screen.findByText('1 trusted device');
      await user.click(screen.getByRole('button', { name: 'Revoke trusted devices' }));
      fireEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Revoke' })
      );

      expect(await screen.findByText('User does not exist')).toBeInTheDocument();
    });

    it('shows the passkey count for an enrolled user and removes them after confirmation', async () => {
      let count = 2;
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/passkeys', () => HttpResponse.json({ data: { count } })),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [] })),
        http.post('/admin/mfa/users/1/passkeys/remove', () => {
          count = 0;
          return new HttpResponse(null, { status: 204 });
        })
      );
      const { user } = renderEdit();

      expect(await screen.findByText('2 passkeys')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Remove passkeys' }));
      expect(
        screen.getByRole('dialog', { name: "Remove this user's passkeys?" })
      ).toBeInTheDocument();
      await confirmWithCredentials(user, 'Remove');

      expect(await screen.findByText('Passkeys removed.')).toBeInTheDocument();
      expect(await screen.findByText('No passkeys')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove passkeys' })).not.toBeInTheDocument();
    });

    it('uses the singular for one passkey', async () => {
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/passkeys', () => HttpResponse.json({ data: { count: 1 } })),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [] }))
      );
      renderEdit();

      expect(await screen.findByText('1 passkey')).toBeInTheDocument();
    });

    it('shows the count but no Remove button without the update permission', async () => {
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/passkeys', () => HttpResponse.json({ data: { count: 1 } })),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [] }))
      );
      render(<EditPage />, {
        initialEntries: ['/settings/users/1'],
        providerOptions: {
          permissions: (defaults) => defaults.filter((p) => p.action !== 'admin::users.update'),
        },
      });

      expect(await screen.findByText('1 passkey')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove passkeys' })).not.toBeInTheDocument();
    });

    it('does not ask for passkeys when the user is not enrolled', async () => {
      let called = false;
      server.use(
        userWith({ mfaEnabledAt: null, mfaGraceUntil: null, mfaLockedAt: null }),
        http.get('/admin/mfa/users/1/passkeys', () => {
          called = true;
          return HttpResponse.json({ data: { count: 0 } });
        })
      );
      renderEdit();

      await screen.findByText('Not enabled');
      expect(screen.queryByText(/passkey/)).not.toBeInTheDocument();
      expect(called).toBe(false);
    });

    it('hides the line rather than showing a false zero when the read fails', async () => {
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/passkeys', () =>
          HttpResponse.json(
            { error: { status: 500, name: 'InternalServerError', message: 'boom', details: {} } },
            { status: 500 }
          )
        ),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [] }))
      );
      renderEdit();

      await screen.findByText(/^Enabled since/);
      await waitFor(() => expect(screen.queryByText('No passkeys')).not.toBeInTheDocument());
      expect(screen.queryByText(/passkey/)).not.toBeInTheDocument();
    });

    it('shows the server message when the removal is refused', async () => {
      server.use(
        enrolled(),
        http.get('/admin/mfa/users/1/passkeys', () => HttpResponse.json({ data: { count: 1 } })),
        http.get('/admin/mfa/users/1/trusted-devices', () => HttpResponse.json({ data: [] })),
        http.post('/admin/mfa/users/1/passkeys/remove', () =>
          HttpResponse.json(
            { error: { status: 404, name: 'NotFoundError', message: 'User does not exist' } },
            { status: 404 }
          )
        )
      );
      const { user } = renderEdit();

      await screen.findByText('1 passkey');
      await user.click(screen.getByRole('button', { name: 'Remove passkeys' }));
      await confirmWithCredentials(user, 'Remove');

      expect(await screen.findByText('User does not exist')).toBeInTheDocument();
      // A refused removal must leave the panel truthful: the count is unchanged and the action is
      // still offered, because nothing was deleted. Asserting only the toast would pass even if the
      // count had optimistically zeroed itself. The dialog stays open with the reason, so the panel
      // behind it is hidden from the accessibility tree.
      expect(screen.getByText('1 passkey')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Remove passkeys', hidden: true })
      ).toBeInTheDocument();
    });
  });
});
