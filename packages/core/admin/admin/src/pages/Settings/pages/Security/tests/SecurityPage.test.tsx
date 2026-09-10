import { within } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { SecurityPage } from '../SecurityPage';

const settings = (overrides = {}) =>
  http.get('/admin/security-settings', () =>
    HttpResponse.json({
      data: {
        mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['1'], ...overrides },
        trustedDevices: { enabled: true, days: 30 },
      },
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
        trustedDevicesEnabled: true,
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

  it('keeps showing the loading state, not an empty card, while /admin/roles is still in flight', async () => {
    server.use(
      settings(),
      me(true),
      http.get('/admin/roles', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({
          data: [
            { id: 1, code: 'strapi-editor', name: 'Editor' },
            { id: 2, code: 'strapi-author', name: 'Author' },
          ],
        });
      })
    );
    render(<SecurityPage />);

    // The settings query (and RBAC) can resolve well before the roles query even starts; the
    // card must stay hidden behind Page.Loading for that whole stretch rather than flashing with
    // an empty role list.
    expect(screen.getByText('Loading content.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Two-factor authentication' })
    ).not.toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument();
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

  it('renders Page.Error, not the disabled-feature copy, when the API answers 500', async () => {
    server.use(
      http.get('/admin/security-settings', () =>
        HttpResponse.json(
          { error: { status: 500, name: 'InternalServerError', message: 'boom' } },
          { status: 500 }
        )
      ),
      me(false)
    );
    render(<SecurityPage />);

    expect(
      await screen.findByText('Whoops! Something went wrong. Please, try again.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Two-factor authentication is turned off on this instance/)
    ).not.toBeInTheDocument();
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
    // Both cards share `canUpdate`, so every Save button (enforcement card, trusted devices card)
    // must be disabled.
    screen.getAllByRole('button', { name: 'Save' }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('renders the trusted devices card under the enforcement card', async () => {
    server.use(settings(), me(true));
    render(<SecurityPage />);

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings.indexOf('Two-factor authentication')).toBeLessThan(
      headings.indexOf('Trusted devices')
    );
    expect(
      screen.getByRole('checkbox', { name: 'Allow users to trust a device after entering a code' })
    ).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Trust period (days)' })).toHaveValue(30);
  });

  it('names each card as its own region, so a Save button can be selected by card', async () => {
    server.use(settings(), me(true));
    render(<SecurityPage />);

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
    const enforcement = screen.getByRole('region', { name: 'Two-factor authentication' });
    const trust = screen.getByRole('region', { name: 'Trusted devices' });

    expect(enforcement).not.toBe(trust);
    expect(within(enforcement).getByRole('radio', { name: /^Optional/ })).toBeChecked();
    expect(within(trust).getByRole('spinbutton', { name: 'Trust period (days)' })).toHaveValue(30);
    // one Save each, reachable without a positional locator -- this is what the e2e specs use
    expect(within(enforcement).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(within(trust).getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
