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

/** Both device counts default to zero so the panel's own lines render without extra setup. */
const quietCounts = () =>
  server.use(
    http.get('/admin/mfa/users/:id/trusted-devices', () => HttpResponse.json({ data: [] })),
    http.get('/admin/mfa/users/:id/passkeys', () => HttpResponse.json({ data: { count: 0 } }))
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
  beforeEach(quietCounts);

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
    const { user } = renderPanel();
    server.use(
      http.post('/admin/mfa/users/:id/reset', () =>
        HttpResponse.json({ error: { message: 'Nope' } }, { status: 500 })
      )
    );

    await user.click(await screen.findByRole('button', { name: 'Reset' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(screen.queryByText('Two-factor authentication reset')).not.toBeInTheDocument()
    );
  });
});
