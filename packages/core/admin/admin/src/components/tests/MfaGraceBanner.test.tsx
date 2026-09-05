import { within } from '@testing-library/react';
import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { MfaGraceBanner } from '../MfaGraceBanner';

const status = (overrides = {}) =>
  http.get('/admin/mfa/me', () =>
    HttpResponse.json({
      data: {
        enabled: false,
        enabledAt: null,
        recoveryCodesRemaining: 0,
        codesAcknowledged: false,
        required: false,
        graceUntil: null,
        ...overrides,
      },
    })
  );

const renderBanner = () => {
  const { getByTestId, ...utils } = render(
    <div data-testid="banner-root">
      <MfaGraceBanner />
    </div>
  );
  return { root: getByTestId('banner-root'), ...utils };
};

describe('MfaGraceBanner', () => {
  it('renders nothing while the feature is off (404)', async () => {
    server.use(http.get('/admin/mfa/me', () => new HttpResponse(null, { status: 404 })));
    const { root } = renderBanner();

    await waitFor(() => expect(root).toBeEmptyDOMElement());
  });

  it('renders nothing when the user is not required', async () => {
    server.use(status({ required: false }));
    const { root } = renderBanner();

    await waitFor(() => expect(root).toBeEmptyDOMElement());
  });

  it('renders nothing when the user is required but already enrolled', async () => {
    server.use(status({ required: true, enabled: true, enabledAt: '2026-09-01T10:14:00.000Z' }));
    const { root } = renderBanner();

    await waitFor(() => expect(root).toBeEmptyDOMElement());
  });

  it('names the deadline with date and time, and links to the profile page', async () => {
    server.use(status({ required: true, graceUntil: '2026-09-11T14:30:00.000Z' }));
    const { root } = renderBanner();

    // Scoped to the banner root: the design system permanently mounts its own empty
    // `role="status"` live region (`#live-region-status`), so an unscoped query resolves to
    // that node the instant it exists -- before our banner has even rendered.
    const banner = await within(root).findByRole('status');
    expect(banner).toHaveTextContent(
      /Set up two-factor authentication before .+, or your account will be locked/
    );
    // date AND time (the exact rendering depends on the test locale/timezone; both parts appear)
    expect(banner).toHaveTextContent(/2026/);
    expect(banner).toHaveTextContent(/\d{1,2}:\d{2}/);
    expect(
      within(root).getByRole('link', { name: 'Set up two-factor authentication' })
    ).toHaveAttribute('href', '/me');
    expect(within(root).queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('uses the no-deadline copy when required with no grace stamped yet', async () => {
    server.use(status({ required: true, graceUntil: null }));
    const { root } = renderBanner();

    expect(await within(root).findByRole('status')).toHaveTextContent(
      /Two-factor authentication is now required for your account\. The deadline to set it up starts at your next login\./
    );
  });

  it('disappears when a refetch reports the user enrolled', async () => {
    let enrolled = false;
    server.use(
      http.get('/admin/mfa/me', () =>
        HttpResponse.json({
          data: {
            enabled: enrolled,
            enabledAt: enrolled ? '2026-09-01T10:14:00.000Z' : null,
            recoveryCodesRemaining: enrolled ? 10 : 0,
            codesAcknowledged: enrolled,
            required: true,
            graceUntil: '2026-09-11T14:30:00.000Z',
          },
        })
      )
    );
    const { root } = renderBanner();
    await within(root).findByRole('status');

    enrolled = true;
    // the window focus listener (setupListeners) triggers a refetch for refetchOnFocus hooks
    window.dispatchEvent(new Event('focus'));

    await waitFor(() => expect(root).toBeEmptyDOMElement());
  });
});
