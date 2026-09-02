import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useGetMfaStatusQuery, useMarkMfaNoticesSeenMutation, useGetMfaNoticesQuery } from '../mfa';

describe('mfa service', () => {
  it('exposes the /mfa/me status shape', async () => {
    server.use(
      http.get('/admin/mfa/me', () =>
        HttpResponse.json({
          data: {
            enabled: true,
            enabledAt: '2026-09-01T10:00:00.000Z',
            recoveryCodesRemaining: 7,
            codesAcknowledged: false,
          },
        })
      )
    );

    const { result } = renderHook(() => useGetMfaStatusQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      enabled: true,
      enabledAt: '2026-09-01T10:00:00.000Z',
      recoveryCodesRemaining: 7,
      codesAcknowledged: false,
    });
  });

  it('surfaces a 404 (flag off) as an error with status 404 instead of throwing', async () => {
    server.use(http.get('/admin/mfa/me', () => new HttpResponse(null, { status: 404 })));

    const { result } = renderHook(() => useGetMfaStatusQuery());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404 });
  });

  it('marking notices seen invalidates the notices list', async () => {
    let calls = 0;
    server.use(
      http.get('/admin/mfa/notices', () => {
        calls += 1;
        return HttpResponse.json({
          data:
            calls === 1
              ? [
                  {
                    id: 1,
                    type: 'challenge_failed',
                    metadata: {},
                    createdAt: '2026-09-01T10:00:00.000Z',
                    seenAt: null,
                  },
                ]
              : [],
        });
      }),
      http.post('/admin/mfa/notices/seen', () => new HttpResponse(null, { status: 204 }))
    );

    const { result } = renderHook(() => {
      const notices = useGetMfaNoticesQuery();
      const [markSeen] = useMarkMfaNoticesSeenMutation();
      return { notices, markSeen };
    });

    await waitFor(() => expect(result.current.notices.data).toHaveLength(1));
    await result.current.markSeen({ ids: [1] });
    await waitFor(() => expect(result.current.notices.data).toHaveLength(0));
    expect(calls).toBe(2);
  });
});
