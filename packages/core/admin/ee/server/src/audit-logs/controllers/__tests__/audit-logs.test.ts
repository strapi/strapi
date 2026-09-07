import { Readable } from 'stream';

import {
  AUDIT_LOGS_EXPORT_CURSOR_DONE,
  AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER,
  AUDIT_LOGS_EXPORT_PART_SIZE_HEADER,
  AUDIT_LOGS_EXPORT_TOKEN_HEADER,
  AUDIT_LOGS_EXPORT_UNTIL_HEADER,
} from '../../../../../../shared/utils/audit-log-export';
import auditLogsController from '../audit-logs';

describe('Audit logs controller', () => {
  const findManyUsers = jest.fn().mockResolvedValue({
    results: [{ id: 1, email: 'ana@test.io', displayName: 'Ana Doe' }],
    pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
  });

  const isExportTooLarge = jest.fn().mockResolvedValue(false);
  const isTrustedContinuation = jest.fn().mockReturnValue(false);

  const createExportStream = jest.fn().mockResolvedValue({
    stream: Readable.from(['id,action\r\n']),
    nextCursor: null,
    until: 42,
    isNewExport: true,
    partSize: 50000,
    exportToken: 'signed-token',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    isExportTooLarge.mockResolvedValue(false);
    isTrustedContinuation.mockReturnValue(false);

    global.strapi = {
      get: jest.fn(
        () =>
          ({ findManyUsers, isExportTooLarge, isTrustedContinuation, createExportStream }) as any
      ),
      telemetry: { send: jest.fn() },
    } as any;
  });

  describe('findManyUsers', () => {
    it('should return the users provided by the audit logs service', async () => {
      const ctx = { request: { query: { page: 1, pageSize: 10, filters: { id: 1 } } } } as any;

      await auditLogsController.findManyUsers(ctx);

      expect(strapi.get).toHaveBeenCalledWith('audit-logs');
      expect(findManyUsers).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(ctx.body).toEqual({
        results: [{ id: 1, email: 'ana@test.io', displayName: 'Ana Doe' }],
        pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
      });
    });

    it('should reject an invalid query', async () => {
      const ctx = { request: { query: { pageSize: 1000 } } } as any;

      await expect(auditLogsController.findManyUsers(ctx)).rejects.toThrow();
      expect(findManyUsers).not.toHaveBeenCalled();
    });
  });

  describe('export', () => {
    const createExportCtx = (query: Record<string, unknown>, encoding = 'identity') =>
      ({
        request: { query },
        response: { get: jest.fn(() => '') },
        set: jest.fn(),
        vary: jest.fn(),
        acceptsEncodings: jest.fn(() => encoding),
      }) as any;

    const getHeader = (ctx: any, name: string) =>
      ctx.set.mock.calls.find(([headerName]: [string]) => headerName === name)?.[1];

    it('should stream CSV with the frozen bound header and send telemetry on a new export', async () => {
      const ctx = createExportCtx({ filters: { action: { $eq: 'entry.update' } } });

      await auditLogsController.export(ctx);

      expect(strapi.telemetry.send).toHaveBeenCalledWith('didExportAuditLogs');
      expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(ctx.set).toHaveBeenCalledWith(AUDIT_LOGS_EXPORT_UNTIL_HEADER, '42');
      expect(ctx.body).toBeInstanceOf(Readable);
    });

    it('should gzip the response when the client accepts it', async () => {
      const ctx = createExportCtx({}, 'gzip');

      await auditLogsController.export(ctx);

      expect(ctx.set).toHaveBeenCalledWith('Content-Encoding', 'gzip');
      expect(ctx.vary).toHaveBeenCalledWith('Accept-Encoding');
      expect(ctx.body).toBeInstanceOf(Readable);
    });

    it('should not gzip when the client does not accept it', async () => {
      const ctx = createExportCtx({});

      await auditLogsController.export(ctx);

      const headerNames = ctx.set.mock.calls.map(([name]: [string]) => name);
      expect(headerNames).not.toContain('Content-Encoding');
    });

    it('should expose the part headers so cross-origin admin panels can read them', async () => {
      const ctx = createExportCtx({});

      await auditLogsController.export(ctx);

      const exposed = getHeader(ctx, 'Access-Control-Expose-Headers');
      expect(exposed).toContain(AUDIT_LOGS_EXPORT_UNTIL_HEADER);
      expect(exposed).toContain(AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER);
      expect(exposed).toContain(AUDIT_LOGS_EXPORT_PART_SIZE_HEADER);
      expect(exposed).toContain(AUDIT_LOGS_EXPORT_TOKEN_HEADER);
      expect(exposed).toContain('Content-Disposition');
    });

    it('should return the signed continuation token on every part', async () => {
      const ctx = createExportCtx({});

      await auditLogsController.export(ctx);

      expect(ctx.set).toHaveBeenCalledWith(AUDIT_LOGS_EXPORT_TOKEN_HEADER, 'signed-token');
    });

    it('should refuse a first part exceeding the cap and skip the probe on tokened continuations', async () => {
      isExportTooLarge.mockResolvedValueOnce(true);
      const first = createExportCtx({});

      await expect(auditLogsController.export(first)).rejects.toThrow('configured limit');
      expect(createExportStream).not.toHaveBeenCalled();

      isTrustedContinuation.mockReturnValueOnce(true);
      const continuation = createExportCtx({ cursor: 100, until: 42, token: 'signed-token' });
      await auditLogsController.export(continuation);

      expect(isExportTooLarge).toHaveBeenCalledTimes(1);
    });

    it('should refuse a cursored request whose continuation token does not verify', async () => {
      const forged = createExportCtx({ cursor: 1, until: 42, token: 'forged' });

      await expect(auditLogsController.export(forged)).rejects.toThrow('continuation');
      expect(isExportTooLarge).not.toHaveBeenCalled();
      expect(createExportStream).not.toHaveBeenCalled();

      const missing = createExportCtx({ cursor: 1 });

      await expect(auditLogsController.export(missing)).rejects.toThrow('continuation');
      expect(createExportStream).not.toHaveBeenCalled();
    });

    it('should refuse a crafted cursor and until without a valid token', async () => {
      const ctx = createExportCtx({ cursor: 1, until: 42, token: 'forged' });

      await expect(auditLogsController.export(ctx)).rejects.toThrow('continuation');
      expect(createExportStream).not.toHaveBeenCalled();
    });

    it('should not send telemetry on part continuations and set the cursor header', async () => {
      isTrustedContinuation.mockReturnValueOnce(true);
      createExportStream.mockResolvedValueOnce({
        stream: Readable.from([]),
        nextCursor: 200,
        until: 42,
        isNewExport: false,
        partSize: 50000,
        exportToken: 'signed-token',
      });
      const ctx = createExportCtx({ cursor: 100, until: 42, token: 'signed-token' });

      await auditLogsController.export(ctx);

      expect(strapi.telemetry.send).not.toHaveBeenCalled();
      expect(ctx.set).toHaveBeenCalledWith(AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER, '200');
      expect(ctx.set).toHaveBeenCalledWith(AUDIT_LOGS_EXPORT_PART_SIZE_HEADER, '50000');
    });

    it('should mark the final part with the terminal cursor value', async () => {
      const ctx = createExportCtx({ until: 42 });

      await auditLogsController.export(ctx);

      expect(ctx.set).toHaveBeenCalledWith(
        AUDIT_LOGS_EXPORT_NEXT_CURSOR_HEADER,
        AUDIT_LOGS_EXPORT_CURSOR_DONE
      );
    });

    it('should reject an invalid query', async () => {
      const ctx = createExportCtx({ until: 'not-a-number' });

      await expect(auditLogsController.export(ctx)).rejects.toThrow();
      expect(createExportStream).not.toHaveBeenCalled();
    });
  });
});
