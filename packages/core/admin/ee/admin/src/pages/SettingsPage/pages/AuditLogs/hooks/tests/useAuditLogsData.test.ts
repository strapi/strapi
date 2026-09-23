import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useAuditLogsData } from '../useAuditLogsData';

const AUTHORS = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  email: `user${index + 1}@test.io`,
  displayName: `User ${index + 1}`,
}));

describe('useAuditLogsData', () => {
  beforeEach(() => {
    server.use(
      http.get('/admin/audit-logs/users', ({ request }) => {
        const url = new URL(request.url);
        const pageSize = Number(url.searchParams.get('pageSize') ?? 10);

        return HttpResponse.json({
          results: AUTHORS.slice(0, pageSize),
          pagination: {
            page: 1,
            pageSize,
            pageCount: Math.ceil(AUTHORS.length / pageSize),
            total: AUTHORS.length,
          },
        });
      })
    );
  });

  it('should fetch audit log authors with the given page size and expose the pagination', async () => {
    const { result } = renderHook(() =>
      useAuditLogsData({ canReadAuditLogs: true, usersPageSize: 12 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toHaveLength(12);
    expect(result.current.usersPagination).toMatchObject({ page: 1, pageCount: 1, total: 12 });
  });

  it('should only expose the first page of audit log authors by default', async () => {
    const { result } = renderHook(() =>
      useAuditLogsData({ canReadAuditLogs: true, usersPageSize: 10 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toHaveLength(10);
    expect(result.current.usersPagination).toMatchObject({ page: 1, pageCount: 2, total: 12 });
  });
});
