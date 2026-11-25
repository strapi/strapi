import { act, renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useExportAuditLogs } from '../useExportAuditLogs';

describe('useExportAuditLogs', () => {
  it('runs a single export when called twice in the same tick', async () => {
    let exportCalls = 0;
    server.use(
      http.get('/admin/audit-logs/export', () => {
        exportCalls += 1;

        return new HttpResponse('﻿id,action\r\n1,entry.update\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'X-Audit-Logs-Export-Until': '10',
            'X-Audit-Logs-Export-Token': 'tok',
            'X-Audit-Logs-Export-Next-Cursor': 'none',
          },
        });
      })
    );

    const { result } = renderHook(() => useExportAuditLogs());

    await act(async () => {
      await Promise.all([
        result.current.exportAuditLogs(undefined, 1),
        result.current.exportAuditLogs(undefined, 1),
      ]);
    });

    expect(exportCalls).toBe(1);
    await waitFor(() => expect(result.current.exportResult).not.toBeNull());
  });
});
