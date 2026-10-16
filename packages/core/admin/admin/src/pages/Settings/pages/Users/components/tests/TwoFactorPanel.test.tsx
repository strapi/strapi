import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { TwoFactorPanel } from '../TwoFactorPanel';

const ENROLLED = {
  id: 3,
  mfaEnabledAt: '2026-01-01T00:00:00.000Z',
  mfaGraceUntil: null,
  mfaLockedAt: null,
} as const;

const renderPanel = (
  user: Partial<React.ComponentProps<typeof TwoFactorPanel>['user']> = {},
  canUpdate = true
) =>
  render(
    <TwoFactorPanel
      user={{ ...ENROLLED, ...user } as React.ComponentProps<typeof TwoFactorPanel>['user']}
      canUpdate={canUpdate}
    />
  );

const DEVICE = {
  id: 9,
  deviceName: 'Chrome on macOS',
  createdAt: '2026-01-02T00:00:00.000Z',
  lastUsedAt: null,
  expiresAt: '2026-02-01T00:00:00.000Z',
  current: false,
};

/**
 * The device counts the panel reads. A parameter, not a blanket `beforeEach`: pinned to zero for
 * every test, the revoke and remove buttons -- their dialogs, toasts and failure paths -- were
 * unreachable from this suite.
 */
const counts = ({ trusted = 0, passkeys = 0 }: { trusted?: number; passkeys?: number } = {}) =>
  server.use(
    http.get('/admin/mfa/users/:id/trusted-devices', () =>
      HttpResponse.json({
        data: Array.from({ length: trusted }, (_, i) => ({ ...DEVICE, id: DEVICE.id + i })),
      })
    ),
    http.get('/admin/mfa/users/:id/passkeys', () =>
      HttpResponse.json({ data: { count: passkeys } })
    )
  );

const failWith = (message: string) =>
  HttpResponse.json(
    { error: { status: 500, name: 'InternalServerError', message, details: {} } },
    { status: 500 }
  );

const captureReset = () => {
  const calls: string[] = [];
  server.use(
    http.post('/admin/mfa/users/:id/reset', ({ params }) => {
      calls.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    })
  );
  return calls;
};

describe('TwoFactorPanel', () => {
  beforeEach(() => counts());

  // The case this action exists for is not a lock: the user still knows their password but has
  // lost the authenticator and spent their recovery codes. Offering Reset only for a locked
  // account would leave exactly that user with no route back in short of a shell.
  it('offers Reset for an enrolled account that is not locked', async () => {
    renderPanel();

    expect(await screen.findByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlock' })).not.toBeInTheDocument();
  });

  it('offers both Reset and Unlock for a locked account', async () => {
    renderPanel({ mfaLockedAt: '2026-02-01T00:00:00.000Z' });

    expect(await screen.findByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('offers no Reset for an account that was never enrolled', async () => {
    renderPanel({ mfaEnabledAt: null });

    expect(await screen.findByText('Not enrolled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('hides Reset from a caller who cannot update users', async () => {
    renderPanel({}, false);

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
    );
  });

  // Destructive and not undoable, so it goes through a confirmation that says what is lost.
  it('confirms before resetting, and names what the reset removes', async () => {
    const { user } = renderPanel();
    const calls = captureReset();

    await user.click(await screen.findByRole('button', { name: 'Reset' }));

    expect(
      await screen.findByText("Reset this user's two-factor authentication?")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/authenticator app, recovery codes, passkeys and trusted devices/i)
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(calls).toEqual(['3']));
    expect(await screen.findByText('Two-factor authentication reset')).toBeInTheDocument();
  });

  it('leaves the account alone when the confirmation is cancelled', async () => {
    const { user } = renderPanel();
    const calls = captureReset();

    await user.click(await screen.findByRole('button', { name: 'Reset' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(
        screen.queryByText("Reset this user's two-factor authentication?")
      ).not.toBeInTheDocument()
    );
    expect(calls).toHaveLength(0);
  });

  it('surfaces a failed reset rather than reporting success', async () => {
    // Asserting only that the success toast is absent proved nothing: it is absent on the first
    // tick before the request resolves, and would stay absent with the error branch deleted.
    server.use(http.post('/admin/mfa/users/:id/reset', () => failWith('Nope')));
    const { user } = renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Reset' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Nope')).toBeInTheDocument();
    expect(screen.queryByText('Two-factor authentication reset')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  describe('unlock', () => {
    const locked = { mfaLockedAt: '2026-02-01T00:00:00.000Z' };

    it('confirms, unlocks the account and says so', async () => {
      const calls: string[] = [];
      server.use(
        http.post('/admin/mfa/users/:id/unlock', ({ params }) => {
          calls.push(String(params.id));
          return new HttpResponse(null, { status: 204 });
        })
      );
      const { user } = renderPanel(locked);

      await user.click(await screen.findByRole('button', { name: 'Unlock' }));
      expect(await screen.findByText('Unlock this account?')).toBeInTheDocument();
      expect(calls).toHaveLength(0);
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => expect(calls).toEqual(['3']));
      expect(await screen.findByText('Account unlocked')).toBeInTheDocument();
    });

    it('says why an unlock failed', async () => {
      server.use(http.post('/admin/mfa/users/:id/unlock', () => failWith('Unlock refused')));
      const { user } = renderPanel(locked);

      await user.click(await screen.findByRole('button', { name: 'Unlock' }));
      await user.click(await screen.findByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText('Unlock refused')).toBeInTheDocument();
      expect(screen.queryByText('Account unlocked')).not.toBeInTheDocument();
    });
  });

  describe('trusted devices', () => {
    it('revokes every trusted browser after confirmation', async () => {
      counts({ trusted: 2 });
      const calls: string[] = [];
      server.use(
        http.delete('/admin/mfa/users/:id/trusted-devices', ({ params }) => {
          calls.push(String(params.id));
          return HttpResponse.json({ data: { count: 2 } });
        })
      );
      const { user } = renderPanel();

      await user.click(await screen.findByRole('button', { name: 'Revoke trusted devices' }));
      expect(await screen.findByText("Revoke this user's trusted devices?")).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => expect(calls).toEqual(['3']));
      expect(await screen.findByText('Trusted devices revoked')).toBeInTheDocument();
    });

    it('says why a revoke failed', async () => {
      counts({ trusted: 1 });
      server.use(
        http.delete('/admin/mfa/users/:id/trusted-devices', () => failWith('Revoke refused'))
      );
      const { user } = renderPanel();

      await user.click(await screen.findByRole('button', { name: 'Revoke trusted devices' }));
      await user.click(await screen.findByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText('Revoke refused')).toBeInTheDocument();
      expect(screen.queryByText('Trusted devices revoked')).not.toBeInTheDocument();
    });

    it('offers no revoke when there is nothing to revoke', async () => {
      renderPanel();

      await screen.findByRole('button', { name: 'Reset' });
      expect(
        screen.queryByRole('button', { name: 'Revoke trusted devices' })
      ).not.toBeInTheDocument();
    });
  });

  describe('passkeys', () => {
    it('removes every passkey after confirmation', async () => {
      counts({ passkeys: 3 });
      const calls: string[] = [];
      server.use(
        http.delete('/admin/mfa/users/:id/passkeys', ({ params }) => {
          calls.push(String(params.id));
          return HttpResponse.json({ data: { count: 3 } });
        })
      );
      const { user } = renderPanel();

      await user.click(await screen.findByRole('button', { name: 'Remove passkeys' }));
      expect(await screen.findByText("Remove this user's passkeys?")).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => expect(calls).toEqual(['3']));
      expect(await screen.findByText('Passkeys removed')).toBeInTheDocument();
    });

    it('says why a removal failed', async () => {
      counts({ passkeys: 1 });
      server.use(http.delete('/admin/mfa/users/:id/passkeys', () => failWith('Remove refused')));
      const { user } = renderPanel();

      await user.click(await screen.findByRole('button', { name: 'Remove passkeys' }));
      await user.click(await screen.findByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText('Remove refused')).toBeInTheDocument();
      expect(screen.queryByText('Passkeys removed')).not.toBeInTheDocument();
    });
  });
});
