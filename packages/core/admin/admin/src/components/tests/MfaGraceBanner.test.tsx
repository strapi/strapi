import { within } from '@testing-library/react';
import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useGetMfaStatusQuery } from '../../services/mfa';
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

  it('resumes polling and refetch-on-focus once the endpoint answers successfully again after a 404', async () => {
    let responseMode: 'off' | 'unenrolled' | 'enrolled' = 'off';
    server.use(
      http.get('/admin/mfa/me', () => {
        if (responseMode === 'off') {
          return new HttpResponse(null, { status: 404 });
        }
        const enrolled = responseMode === 'enrolled';
        return HttpResponse.json({
          data: {
            enabled: enrolled,
            enabledAt: enrolled ? '2026-09-01T10:14:00.000Z' : null,
            recoveryCodesRemaining: enrolled ? 10 : 0,
            codesAcknowledged: enrolled,
            required: true,
            graceUntil: '2026-09-11T14:30:00.000Z',
          },
        });
      })
    );

    /**
     * Stands in for another consumer of the same shared `/admin/mfa/me` cache entry
     * (`TwoFactorSection`, `SecurityPage` and `MfaNotices` all call the same query) landing a
     * successful response once the feature is turned back on -- this is how the banner's own
     * "is the feature off" flag would un-latch outside a test, without requiring the banner
     * itself to poll or refetch-on-focus while it still believes the feature is off. It also
     * surfaces the query's own settled status, so the test can wait for the *initial* 404 to be
     * fully processed (rather than racing it) before asserting that a plain focus does nothing.
     */
    const RefetchProbe = () => {
      const { refetch, isLoading, isError } = useGetMfaStatusQuery();
      return (
        <>
          <button onClick={() => refetch()}>force-refetch</button>
          <span data-testid="probe-status">
            {isLoading ? 'loading' : isError ? 'error' : 'success'}
          </span>
        </>
      );
    };

    const { getByTestId, getByText, user } = render(
      <div data-testid="banner-root">
        <MfaGraceBanner />
        <RefetchProbe />
      </div>
    );
    const root = getByTestId('banner-root');
    // `root` also holds the always-rendered probe elements, so "the banner is hidden" is checked
    // by the absence of its `status` role rather than `root` being empty.
    const queryBanner = () => within(root).queryByRole('status');

    // Starts 404'd: the banner stays hidden, and the initial request has genuinely settled as an
    // error (not just "hasn't rendered a banner yet") before we probe the latched state below.
    await waitFor(() => expect(getByTestId('probe-status')).toHaveTextContent('error'));
    expect(queryBanner()).not.toBeInTheDocument();

    responseMode = 'unenrolled';
    window.dispatchEvent(new Event('focus'));
    // Polling and refetch-on-focus are switched off while the feature is believed to be off, so
    // a plain focus event alone must not pick up the now-available response.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(queryBanner()).not.toBeInTheDocument();

    // A sibling subscriber forces a successful response through the shared cache entry.
    await user.click(getByText('force-refetch'));
    await within(root).findByRole('status');

    // With a successful response now in, refetch-on-focus should be back on for the banner too.
    responseMode = 'enrolled';
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(queryBanner()).not.toBeInTheDocument());
  });
});
