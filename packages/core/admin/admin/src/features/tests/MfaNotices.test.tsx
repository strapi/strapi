import * as React from 'react';

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

/**
 * `/admin/mfa/me` defaults to a 404 in the shared test server (`tests/server.ts`), matching the
 * future flag being off. Tests that need `useGetMfaStatusQuery` to actually resolve (so F3's skip
 * on `useGetMfaNoticesQuery` doesn't suppress the request) override it with a 200 here.
 */
const status = (overrides = {}) =>
  http.get('/admin/mfa/me', () =>
    HttpResponse.json({
      data: {
        enabled: true,
        enabledAt: '2026-09-01T10:14:00.000Z',
        recoveryCodesRemaining: 7,
        codesAcknowledged: true,
        required: false,
        graceUntil: null,
        ...overrides,
      },
    })
  );

describe('MfaNotices', () => {
  it('shows one warning toast summarising unseen notices and marks them seen on dismiss', async () => {
    let seenBody: unknown;
    server.use(
      status(),
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

  /**
   * F3: before this fix, `useGetMfaNoticesQuery` had no `skip` at all, so `/admin/mfa/notices` was
   * requested on every authenticated app load regardless of the future flag -- a guaranteed 404 on
   * every default-off instance. `/admin/mfa/me` 404 (the same signal `TwoFactorSection` uses) is
   * the only thing this component is allowed to read to suppress the request; it must never read
   * the flag directly. Mutant-proof: removing the `skip` makes `noticesRequested` true.
   */
  it('does not request mfa notices at all when the status query 404s (feature off)', async () => {
    let noticesRequested = false;
    server.use(
      // `/admin/mfa/me` already defaults to a 404 in the shared test server; this test relies on
      // that default rather than overriding it, so it also documents that default's meaning.
      http.get('/admin/mfa/notices', () => {
        noticesRequested = true;
        return HttpResponse.json({ data: [] });
      })
    );
    render(<MfaNotices />);

    // Give the status query time to settle and, if the skip were absent, the notices request time
    // to fire, before asserting it never happened.
    await waitFor(() => expect(screen.queryByText(/security event/i)).not.toBeInTheDocument());
    expect(noticesRequested).toBe(false);
  });

  /**
   * F3 also guards against re-breaking F1: notices must still flow for a user who is not currently
   * enrolled (e.g. after a self-disable or a CLI reset), so the skip must depend only on whether
   * the status query itself 404s -- never on `status.enabled`.
   */
  it('still shows the toast when the status query resolves with enabled: false', async () => {
    server.use(
      status({ enabled: false, enabledAt: null, recoveryCodesRemaining: 0 }),
      http.get('/admin/mfa/notices', () =>
        HttpResponse.json({
          data: [
            {
              id: 1,
              type: 'reset',
              metadata: {},
              createdAt: '2026-09-01T10:00:00.000Z',
              seenAt: null,
            },
          ],
        })
      )
    );
    render(<MfaNotices />);

    expect(await screen.findByText(/1 security event on your account/i)).toBeInTheDocument();
  });

  it('is silent when there are no unseen notices', async () => {
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: [] }))
    );
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
      status(),
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

  /**
   * F2: the toast is `blockTransition: true` (`duration: Infinity`), and the real app's `Toaster`
   * lives above the router (rendered once by `NotificationsProvider` for the whole app), while
   * `MfaNotices` is mounted inside `AdminLayout`, below the router. An in-SPA logout unmounts
   * `AdminLayout` (and with it `MfaNotices`) without ever unmounting `Toaster`, so the toast used
   * to survive and sit on the login screen, then stack a second one after the next login.
   * `toast.dismiss(id)` does not fire the `Alert`'s `onClose`, so this must NOT mark the notices
   * seen -- the user never actually saw them.
   *
   * A bare top-level `unmount()` of `render(<MfaNotices />)` would not exercise this: the test
   * harness's `NotificationsProvider` (and thus `Toaster`) is part of that same render tree, so
   * unmounting it would trivially remove the toast from the DOM regardless of any cleanup effect.
   * This harness instead keeps `NotificationsProvider`/`Toaster` mounted for the whole test and
   * only unmounts `MfaNotices` itself, matching the real logout shape.
   */
  it('dismisses the toast when MfaNotices unmounts on its own (e.g. an in-SPA logout), without marking the notices seen', async () => {
    let seenCalled = false;
    server.use(
      status(),
      http.get('/admin/mfa/notices', () => HttpResponse.json({ data: NOTICES })),
      http.post('/admin/mfa/notices/seen', () => {
        seenCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const Harness = () => {
      const [mounted, setMounted] = React.useState(true);
      return (
        <>
          {mounted ? <MfaNotices /> : null}
          <button onClick={() => setMounted(false)}>logout</button>
        </>
      );
    };
    const { user } = render(<Harness />);

    await screen.findByText(/2 security events on your account/i);

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() =>
      expect(screen.queryByText(/2 security events on your account/i)).not.toBeInTheDocument()
    );
    expect(seenCalled).toBe(false);
  });
});
