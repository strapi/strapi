import { render as renderAdmin } from '@strapi/admin/strapi-admin/test';
import { fireEvent, within } from '@testing-library/react';
import { screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SecurityPanel } from '../SecurityPanel';

import type { UserSecurity } from '../../../../../shared/contracts/user-security';
import type { SecurityPanelProps } from '../SecurityPanel';

const USER = 'plugin::end-users.user';

const UPDATE = { action: 'plugin::content-manager.explorer.update', subject: USER };
const READ = { action: 'plugin::content-manager.explorer.read', subject: USER };
const MANAGE = { action: 'plugin::end-users.security.manage', subject: null };

const SECURITY: UserSecurity = {
  accounts: [
    { id: 'a1', providerId: 'credential' },
    { id: 'a2', providerId: 'github' },
  ],
  twoFactor: true,
  passkeys: 0,
  sessions: [
    {
      id: 's1',
      createdAt: '2026-11-01T09:00:00.000Z',
      expiresAt: '2026-11-08T09:00:00.000Z',
      ipAddress: '10.0.0.1',
      userAgent: 'Firefox',
    },
    {
      id: 's2',
      createdAt: '2026-11-02T09:00:00.000Z',
      expiresAt: '2026-11-09T09:00:00.000Z',
      ipAddress: '10.0.0.2',
      userAgent: 'Safari',
    },
  ],
  status: { banned: false, banReason: null, banExpires: null, lockedUntil: null },
};

const serve = (security: UserSecurity = SECURITY) => {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];

  const record =
    (method: string) =>
    async ({ request }: { request: Request }) => {
      const text = await request.text();

      calls.push({
        method,
        path: new URL(request.url).pathname,
        ...(text && { body: JSON.parse(text) }),
      });

      return HttpResponse.json({ data: { ok: true } });
    };

  server.use(
    http.get('/end-users/users/u1/security', () => HttpResponse.json({ data: security })),
    http.get(/\/content-manager\/collection-types\/plugin::end-users\.profile/, () =>
      HttpResponse.json({ results: [{ documentId: 'prof1' }] })
    ),
    http.delete('/end-users/users/u1/sessions/:sessionId', record('DELETE')),
    http.delete('/end-users/users/u1/sessions', record('DELETE')),
    http.delete('/end-users/users/u1/accounts/:accountId', record('DELETE')),
    http.post('/end-users/users/u1/ban', record('POST')),
    http.post('/end-users/users/u1/two-factor/reset', record('POST'))
  );

  return calls;
};

/** The panel is a description for the Content Manager to place: the test places its content */
const Panel = (props: SecurityPanelProps) => {
  const panel = SecurityPanel(props);

  return panel ? (
    <section>
      <h2>{panel.title}</h2>
      {panel.content}
    </section>
  ) : null;
};

const SAVED = { model: USER, documentId: 'u1', document: { documentId: 'u1' } };

const renderPanel = (props: SecurityPanelProps = SAVED) =>
  renderAdmin(<Panel {...props} />, { providerOptions: { permissions: [READ, UPDATE, MANAGE] } });

describe('SecurityPanel', () => {
  it('renders only for the end-user type', async () => {
    serve();

    const other = renderPanel({ ...SAVED, model: 'api::article.article' });

    expect(screen.queryByRole('heading', { name: 'Security' })).not.toBeInTheDocument();
    other.unmount();

    // A user that is not saved yet has no security to show
    const unsaved = renderPanel({ model: USER });

    expect(screen.queryByRole('heading', { name: 'Security' })).not.toBeInTheDocument();
    unsaved.unmount();

    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(await screen.findByText('2 sessions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute(
      'href',
      '/content-manager/collection-types/plugin::end-users.profile/prof1'
    );
  });

  it('signs out one session and all sessions after confirmation', async () => {
    const calls = serve();
    const { user } = renderPanel();

    await screen.findByText('2 sessions');
    await user.click(screen.getByRole('button', { name: 'View' }));

    const modal = await screen.findByRole('dialog', { name: 'Sessions' });
    const [first] = await screen.findAllByRole('button', { name: 'Sign out' });

    await user.click(first);
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(calls).toEqual([{ method: 'DELETE', path: '/end-users/users/u1/sessions/s1' }])
    );
    expect(modal).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Sessions' })).not.toBeInTheDocument()
    );

    // Asking is not signing out: nothing is sent before the answer
    await user.click(screen.getByRole('button', { name: 'Sign out all' }));
    expect(calls).toHaveLength(1);

    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'DELETE', path: '/end-users/users/u1/sessions/s1' },
        { method: 'DELETE', path: '/end-users/users/u1/sessions' },
      ])
    );
  });

  it('hides Unlink for the last account', async () => {
    serve({ ...SECURITY, accounts: [{ id: 'a1', providerId: 'credential' }] });
    renderPanel();

    expect(await screen.findByText('Email and password')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlink' })).not.toBeInTheDocument();
  });

  it('unlinks one of several accounts after confirmation', async () => {
    const calls = serve();
    const { user } = renderPanel();

    const unlink = await screen.findAllByRole('button', { name: 'Unlink' });

    expect(unlink).toHaveLength(2);

    await user.click(unlink[1]);
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(calls).toEqual([{ method: 'DELETE', path: '/end-users/users/u1/accounts/a2' }])
    );
  });

  it('asks before closing the ban dialog with a reason that is not sent', async () => {
    const calls = serve();
    const { user } = renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Ban' }));
    await user.type(await screen.findByRole('textbox', { name: 'Reason' }), 'Spam');
    await user.keyboard('{Escape}');

    expect(await screen.findByText(/You have unsaved changes/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('bans with a reason and an expiry', async () => {
    const calls = serve();
    const { user } = renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Ban' }));

    const modal = await screen.findByRole('dialog', { name: 'Ban this user' });

    await user.type(await screen.findByRole('textbox', { name: 'Reason' }), 'Spam');
    await user.click(screen.getByRole('combobox', { name: 'Ban lasts' }));
    await user.click(await screen.findByRole('option', { name: '7 days' }));

    const before = Date.now();

    const confirmBan = within(modal).getByRole('button', { name: 'Ban' });

    // A submit button inside the form of the fields, so that Enter in the reason bans
    expect(confirmBan).toHaveAttribute('type', 'submit');
    // eslint-disable-next-line testing-library/no-node-access
    expect(confirmBan.closest('form')).not.toBeNull();
    fireEvent.click(confirmBan);

    await waitFor(() => expect(calls).toHaveLength(1));

    const { path, body } = calls[0] as unknown as {
      path: string;
      body: { reason: string; expiresAt: string };
    };
    const expires = new Date(body.expiresAt).getTime();

    expect(path).toBe('/end-users/users/u1/ban');
    expect(body.reason).toBe('Spam');
    expect(expires - before).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 60_000);
    expect(expires - before).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 60_000);
    await waitFor(() => expect(modal).not.toBeInTheDocument());
  });

  it('shows who is banned and offers Unban', async () => {
    serve({
      ...SECURITY,
      status: {
        banned: true,
        banReason: 'Spam',
        banExpires: null,
        lockedUntil: null,
      },
    });
    renderPanel();

    expect(await screen.findByText('Banned')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unban' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ban' })).not.toBeInTheDocument();
  });

  it('offers no resend for an email that is verified', async () => {
    serve();
    renderPanel({ ...SAVED, document: { documentId: 'u1', emailVerified: true } });

    expect(await screen.findByRole('button', { name: 'Send password reset' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend verification' })).not.toBeInTheDocument();
  });

  it('disables Send password reset for a banned user, with a hint, and leaves the other email alone', async () => {
    const calls = serve({
      ...SECURITY,
      status: { banned: true, banReason: 'Spam', banExpires: null, lockedUntil: null },
    });
    const { user } = renderPanel();

    const reset = await screen.findByRole('button', { name: 'Send password reset' });

    expect(reset).toBeDisabled();
    expect(
      screen.getByText('This user is banned. Unban them to send a password reset.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification' })).toBeEnabled();

    await user.click(reset);

    expect(calls).toEqual([]);
  });

  it('offers Send password reset to a user whose ban has run out, and to one who is not banned', async () => {
    serve({
      ...SECURITY,
      status: {
        banned: true,
        banReason: 'Spam',
        banExpires: new Date(Date.now() - 60_000).toISOString(),
        lockedUntil: null,
      },
    });
    const ended = renderPanel();

    expect(await screen.findByRole('button', { name: 'Send password reset' })).toBeEnabled();
    expect(screen.queryByText(/This user is banned/)).not.toBeInTheDocument();
    ended.unmount();

    serve();
    renderPanel();

    expect(await screen.findByRole('button', { name: 'Send password reset' })).toBeEnabled();
  });

  it('hides actions without explorer.update', async () => {
    serve();
    renderAdmin(<Panel {...SAVED} />, { providerOptions: { permissions: [READ] } });

    expect(await screen.findByText('2 sessions')).toBeInTheDocument();

    // It can look: sessions and permissions open, the profile is a link
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effective permissions' })).toBeInTheDocument();

    for (const name of [
      'Unlink',
      'Reset',
      'Sign out all',
      'Ban',
      'Send password reset',
      'Resend verification',
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it.each([
    ['Send password reset', '/end-users/users/u1/send-password-reset'],
    ['Resend verification', '/end-users/users/u1/send-verification'],
  ])('sends one email when %s is double-clicked', async (name, path) => {
    serve();

    const sent: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      http.post(path, async () => {
        sent.push(path);
        await gate;

        return HttpResponse.json({ data: { ok: true } });
      })
    );
    const { user } = renderPanel();

    const button = await screen.findByRole('button', { name });

    await user.dblClick(button);

    // Both email buttons wait while one is on its way
    await waitFor(() => expect(button).toBeDisabled());

    release();

    await waitFor(() => expect(button).toBeEnabled());
    expect(sent).toEqual([path]);
  });

  it('hides actions without the security.manage action, even with explorer.update', async () => {
    serve();
    renderAdmin(<Panel {...SAVED} />, { providerOptions: { permissions: [READ, UPDATE] } });

    expect(await screen.findByText('2 sessions')).toBeInTheDocument();
    expect(
      screen.getByText(/needs the permission to manage the Security panel of end users/)
    ).toBeInTheDocument();

    // It can look: sessions and permissions open, the profile is a link
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effective permissions' })).toBeInTheDocument();

    for (const name of [
      'Unlink',
      'Reset',
      'Sign out all',
      'Ban',
      'Send password reset',
      'Resend verification',
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('falls back to read-only when an action is forbidden', async () => {
    serve();
    server.use(
      http.post('/end-users/users/u1/two-factor/reset', () =>
        HttpResponse.json(
          { error: { status: 403, name: 'ForbiddenError', message: 'Forbidden' } },
          { status: 403 }
        )
      )
    );
    const { user } = renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Reset' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText(/limited to some fields/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ban' })).not.toBeInTheDocument();
  });

  it('says so when the read is forbidden', async () => {
    server.use(
      http.get('/end-users/users/u1/security', () =>
        HttpResponse.json(
          { error: { status: 403, name: 'ForbiddenError', message: 'Forbidden' } },
          { status: 403 }
        )
      )
    );
    renderPanel();

    expect(await screen.findByText(/cannot see their security/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
  });
});
