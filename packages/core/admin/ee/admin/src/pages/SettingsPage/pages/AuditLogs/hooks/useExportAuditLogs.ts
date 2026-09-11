import * as React from 'react';

import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../../../../admin/src/features/Notifications';
import {
  getFetchClient,
  isFetchError,
  type FetchResponse,
} from '../../../../../../../../admin/src/utils/getFetchClient';
import {
  AUDIT_LOGS_EXPORT_CURSOR_DONE,
  AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER,
  AUDIT_LOGS_EXPORT_PART_ROWS,
  AUDIT_LOGS_EXPORT_PART_SIZE_HEADER,
  AUDIT_LOGS_EXPORT_TOKEN_HEADER,
  AUDIT_LOGS_EXPORT_UNTIL_HEADER,
} from '../../../../../../../../shared/utils/audit-log-export';

const DEFAULT_FILE_NAME = 'audit-logs.csv';

interface ExportProgress {
  fetched: number;
  total: number;
}

interface ExportResult {
  blob: Blob;
  fileName: string;
}

const getFileName = (contentDisposition: string | null) => {
  const match = contentDisposition?.match(/filename="([^"]+)"/);

  return match?.[1] ?? DEFAULT_FILE_NAME;
};

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking during a later tick to avoid aborting the download
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const useExportAuditLogs = () => {
  const [isExporting, setIsExporting] = React.useState(false);
  const [progress, setProgress] = React.useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = React.useState<ExportResult | null>(null);
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  const isExportingRef = React.useRef(false);

  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const exportAuditLogs = async (filters: unknown, totalEntries: number) => {
    if (isExportingRef.current) {
      return;
    }

    isExportingRef.current = true;
    setIsExporting(true);
    setExportResult(null);
    setProgress({ fetched: 0, total: totalEntries });

    const { get } = getFetchClient();

    let cursor: string | null = null;
    let until: string | null = null;
    let token: string | null = null;
    let fileName = DEFAULT_FILE_NAME;
    const parts: Blob[] = [];

    try {
      do {
        const { data, headers }: FetchResponse<Blob> = await get<Blob>('/admin/audit-logs/export', {
          params: {
            ...(filters ? { filters } : {}),
            ...(cursor ? { cursor } : {}),
            ...(until ? { until } : {}),
            ...(token ? { token } : {}),
          },
          responseType: 'blob',
        });

        if (!isMountedRef.current) {
          return;
        }

        const nextCursorHeader: string | null =
          headers?.get(AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER) ?? null;
        const untilHeader: string | null = headers?.get(AUDIT_LOGS_EXPORT_UNTIL_HEADER) ?? null;
        const tokenHeader: string | null = headers?.get(AUDIT_LOGS_EXPORT_TOKEN_HEADER) ?? null;

        if (!nextCursorHeader || !untilHeader || !tokenHeader) {
          throw new Error('The audit logs export part headers are missing');
        }

        cursor = nextCursorHeader === AUDIT_LOGS_EXPORT_CURSOR_DONE ? null : nextCursorHeader;
        until = untilHeader;
        token = tokenHeader;

        if (parts.length === 0) {
          fileName = getFileName(headers?.get('Content-Disposition') ?? null);
        }

        parts.push(data);

        const partRows =
          Number(headers?.get(AUDIT_LOGS_EXPORT_PART_SIZE_HEADER)) || AUDIT_LOGS_EXPORT_PART_ROWS;
        setProgress({
          fetched: Math.min(parts.length * partRows, totalEntries),
          total: totalEntries,
        });
      } while (cursor);

      setExportResult({ blob: new Blob(parts, { type: 'text/csv;charset=utf-8' }), fileName });
    } catch (error) {
      const message = () => {
        if (isFetchError(error) && error.status === 413) {
          return formatMessage({
            id: 'Settings.permissions.auditLogs.listview.export.error.tooLarge',
            defaultMessage: 'Table too large to export. Please add filters and try again.',
          });
        }

        if (isFetchError(error) && error.status === 403) {
          return formatMessage({
            id: 'Settings.permissions.auditLogs.listview.export.error.forbidden',
            defaultMessage: "You don't have the permissions to export audit logs.",
          });
        }

        return formatMessage({
          id: 'Settings.permissions.auditLogs.listview.export.error',
          defaultMessage: 'The export failed. Please try again.',
        });
      };

      toggleNotification({ type: 'danger', message: message() });
    } finally {
      isExportingRef.current = false;
      setIsExporting(false);
      setProgress(null);
    }
  };

  const downloadExport = () => {
    if (!exportResult) {
      return;
    }

    downloadFile(exportResult.blob, exportResult.fileName);
    setExportResult(null);
  };

  const dismissExport = () => {
    setExportResult(null);
  };

  return { exportAuditLogs, downloadExport, dismissExport, isExporting, progress, exportResult };
};

export { useExportAuditLogs };
export type { ExportProgress, ExportResult };
