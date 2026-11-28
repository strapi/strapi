import { within } from '@testing-library/react';
import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useGetMfaStatusQuery } from '../../services/mfa';
import { MfaGraceBanner } from '../MfaGraceBanner';

jest.mock('../../hooks/useMediaQuery', () => ({
  ...jest.requireActual('../../hooks/useMediaQuery'),
  useIsDesktop: jest.fn(() => true),
}));

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

const renderBanner = (initialEntries?: string[]) => {
  const { getByTestId, ...utils } = render(
    <div data-testid="banner-root">
      <MfaGraceBanner />
    </div>,
    initialEntries ? { initialEntries } : undefined
  );
  return { root: getByTestId('banner-root'), ...utils };
};

describe('MfaGraceBanner', () => {
  beforeEach(() => {
    jest.mocked(useIsDesktop).mockReturnValue(true);
  });

  describe('below the large breakpoint', () => {
    beforeEach(() => {
      jest.mocked(useIsDesktop).mockReturnValue(false);
    });

    it('shows the short deadline with a short date and a Set up link', async () => {
      const year = new Date().getFullYear();
      server.use(status({ required: true, graceUntil: `${year}-12-05T12:00:00.000Z` }));
      const { root } = renderBanner();

      const banner = await within(root).findByRole('status');
      expect(banner).toHaveTextContent('Two-factor authentication required by Dec 5');
      // The year is left off while the date is in the current year.
      expect(banner).not.toHaveTextContent(String(year));
      expect(banner).not.toHaveTextContent(/your account will be locked/);
      expect(within(root).getByRole('link', { name: 'Set up' })).toHaveAttribute('href', '/me');
      expect(within(root).getAllByRole('status')).toHaveLength(1);
    });

    it('adds the year when the deadline is not in the current year', async () => {
      const year = new Date().getFullYear() + 1;
      server.use(status({ required: true, graceUntil: `${year}-01-15T12:00:00.000Z` }));
      const { root } = renderBanner();

      expect(await within(root).findByRole('status')).toHaveTextContent(
        `Two-factor authentication required by Jan 15, ${year}`
      );
    });

    it('uses short copy without a deadline and drops the link on the profile page', async () => {
      server.use(status({ required: true, graceUntil: null }));
      const { root } = renderBanner(['/me']);

      expect(await within(root).findByRole('status')).toHaveTextContent(
        'Two-factor authentication required at your next login'
      );
      expect(within(root).queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('renders nothing while the feature is off (404)', async () => {
    server.use(
      http.get('/admin/mfa/me', () =>
        HttpResponse.json(
          {
            data: null,
            error: { status: 404, name: 'NotFoundError', message: 'Not Found', details: {} },
          },
          { status: 404 }
        )
      )
    );
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

  /** On /me the link pointed at the page the user was already on, and did nothing. */
  it('leaves the link out on the profile page itself', async () => {
    server.use(status({ required: true, graceUntil: '2026-09-11T14:30:00.000Z' }));
    const { root } = renderBanner(['/me']);

    await within(root).findByRole('status');
    expect(within(root).queryByRole('link')).not.toBeInTheDocument();
  });

  it('uses the no-deadline copy when required with no grace stamped yet', async () => {
    server.use(status({ required: true, graceUntil: null }));
    const { root } = renderBanner();

    expect(await within(root).findByRole('status')).toHaveTextContent(
      /Two-factor authentication is now required for your account\. Your grace period to set it up starts at your next login\./
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
    // the banner refetches on window focus
    window.dispatchEvent(new Event('focus'));

    await waitFor(() => expect(root).toBeEmptyDOMElement());
  });

  it('resumes polling and refetch-on-focus once the endpoint answers successfully again after a 404', async () => {
    let responseMode: 'off' | 'unenrolled' | 'enrolled' = 'off';
    server.use(
      http.get('/admin/mfa/me', () => {
        if (responseMode === 'off') {
          return HttpResponse.json(
            {
              data: null,
              error: { status: 404, name: 'NotFoundError', message: 'Not Found', details: {} },
            },
            { status: 404 }
          );
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
