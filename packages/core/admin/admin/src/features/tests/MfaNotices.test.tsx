import { render, server, screen, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { MfaNotices } from '../MfaNotices';

/**
 * jsdom does not implement the Pointer Events capture API. Sonner (the toast library backing
 * `Notifications`) attaches a swipe-to-dismiss `onPointerDown` handler to the toast container, so
 * even a plain `user.click` on the "Close" button bubbles a pointerdown that crashes without this.
 */
beforeAll(() => {
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = () => {};
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = () => {};
  }
});

const NOTICES = [
  {
    id: 1,
    type: 'challenge_failed',
    metadata: {},
    createdAt: '2026-09-01T10:00:00.000Z',
    seenAt: null,
  },
  {
    id: 2,
    type: 'recovery_code_used',
    metadata: {},
    createdAt: '2026-09-01T11:00:00.000Z',
    seenAt: null,
  },
];

describe('MfaNotices', () => {
  it('shows one warning toast summarising unseen notices and marks them seen on dismiss', async () => {
    let seenBody: unknown;
    server.use(
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: NOTICES })),
      http.post('/admin/mfa/notices/seen', async ({ request }) => {
        seenBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<MfaNotices />);

    const toast = await screen.findByText(/2 security events on your account/i);
    expect(toast).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(seenBody).toEqual({ ids: [1, 2] }));
  });

  /**
   * The design system's permanent `#live-region-alert` node always carries `role="alert"`, even
   * empty, so a bare `getByRole('alert')` query is unreliable here (see `TwoFactorSection.test.tsx`
   * for the same caveat on `role="status"`) -- assert on text instead.
   */
  it('is silent when the feature is off (404)', async () => {
    server.use(http.get('/admin/mfa/notices', () => new HttpResponse(null, { status: 404 })));
    render(<MfaNotices />);

    await waitFor(() => expect(screen.queryByText(/security event/i)).not.toBeInTheDocument());
  });

  it('is silent when there are no unseen notices', async () => {
    server.use(http.get('/admin/mfa/notices', () => HttpResponse.json({ data: [] })));
    render(<MfaNotices />);

    await waitFor(() => expect(screen.queryByText(/security event/i)).not.toBeInTheDocument());
  });

  /**
   * Mutant-proof for the `announced` ref. Dismissing the toast calls `markMfaNoticesSeen`, which
   * invalidates the `MfaNotices` tag and causes the still-mounted `getMfaNotices` query to
   * refetch automatically. RTK Query structurally shares query results, so a refetch returning
   * the *same* two notices would keep the same `data` reference regardless of the guard -- that
   * would not exercise it. Instead, the mock simulates a third event (id 3) arriving after the
   * dismiss but before the refetch settles: different content forces a genuinely new `notices`
   * reference. The spec is "one toast per app load", so even this new, still-unseen event must
   * not produce a second toast; without the `announced` ref, the effect's `notices` dependency
   * would have changed and it would fire again.
   */
  it('does not fire a second toast for a newly-arrived event once one has already been shown this session', async () => {
    let getCallCount = 0;
    let seenBody: unknown;
    server.use(
      http.get('/admin/mfa/notices', () => {
        getCallCount += 1;
        if (getCallCount === 1) {
          return HttpResponse.json({ data: NOTICES });
        }
        return HttpResponse.json({
          data: [
            {
              id: 3,
              type: 'challenge_failed',
              metadata: {},
              createdAt: '2026-09-01T12:00:00.000Z',
              seenAt: null,
            },
          ],
        });
      }),
      http.post('/admin/mfa/notices/seen', async ({ request }) => {
        seenBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const { user } = render(<MfaNotices />);

    await screen.findByText(/2 security events on your account/i);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(seenBody).toEqual({ ids: [1, 2] }));

    // The dismissed toast unmounts ~200ms after `toast.dismiss` (sonner's exit-animation delay,
    // `TIME_BEFORE_UNMOUNT`) -- wait for it to actually leave the DOM first, so the final check
    // below can only be satisfied by "no *second* toast appeared", not by "the first one is still
    // mid-animation".
    await waitFor(() =>
      expect(screen.queryByText(/2 security events on your account/i)).not.toBeInTheDocument()
    );

    // Now wait for the invalidation-triggered refetch (returning the new, different notice list)
    // to actually happen before asserting silence -- otherwise a premature check would pass
    // trivially before the refetch (and thus the would-be second effect run) ever occurs.
    await waitFor(() => expect(getCallCount).toBeGreaterThanOrEqual(2));
    expect(screen.queryByText(/security events? on your account/i)).not.toBeInTheDocument();
  });
});
