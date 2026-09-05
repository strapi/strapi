import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SecurityPage } from '../SecurityPage';

const settings = (overrides = {}) =>
  http.get('/admin/security-settings', () =>
    HttpResponse.json({
      data: { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1'], ...overrides } },
    })
  );

const me = (enabled: boolean) =>
  http.get('/admin/mfa/me', () =>
    HttpResponse.json({
      data: {
        enabled,
        enabledAt: enabled ? '2026-09-01T10:14:00.000Z' : null,
        recoveryCodesRemaining: enabled ? 10 : 0,
        codesAcknowledged: enabled,
        required: false,
        graceUntil: null,
      },
    })
  );

describe('SecurityPage', () => {
  it('renders the header and the two-factor card with roles from /admin/roles', async () => {
    server.use(settings(), me(true));
    render(<SecurityPage />);

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Optional/ })).toBeChecked();
    // the shared test server's /admin/roles fixture (admin/tests/server.ts) has Editor (id 1)
    // and Author (id 2), with no usersCount
    expect(await screen.findByRole('checkbox', { name: 'Editor (0 users)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Author (0 users)' })).not.toBeChecked();
  });

  it('shows the disabled-feature state when the API answers 404', async () => {
    server.use(
      http.get('/admin/security-settings', () => new HttpResponse(null, { status: 404 })),
      http.get('/admin/mfa/me', () => new HttpResponse(null, { status: 404 }))
    );
    render(<SecurityPage />);

    expect(
      await screen.findByText(/Two-factor authentication is turned off on this instance/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('renders the card read-only for a user with read but not update permission', async () => {
    server.use(settings(), me(false));
    render(<SecurityPage />, {
      providerOptions: {
        permissions: (defaults) =>
          defaults.filter((p) => p.action !== 'admin::security-settings.update'),
      },
    });

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
    expect(await screen.findByRole('radio', { name: /^Optional/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
