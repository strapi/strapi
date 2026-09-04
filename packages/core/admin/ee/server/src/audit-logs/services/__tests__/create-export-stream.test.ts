import type { Readable } from 'stream';

import { AUDIT_LOG_EXPORT_EVENT } from '../../../../../../shared/utils/audit-log-export';
import { createAuditLogsService, toCsvLine } from '../audit-logs';
import { signExportToken, verifyExportToken } from '../../utils/export-token';

const SECRET = 'test-secret';

const continuationToken = (until: number, filters?: unknown) =>
  signExportToken(SECRET, until, filters);

const CSV_BOM = '\uFEFF';
const CSV_HEADER = 'id,action,date,user_id,user_email,user_display_name,origin,payload';

const streamToString = async (stream: Readable) => {
  let output = '';
  for await (const chunk of stream) {
    output += chunk;
  }
  return output;
};

const makeRow = (id: number) => ({
  id,
  action: 'entry.update',
  date: '2026-08-25T10:00:00.000Z',
  payload: { model: 'article', origin: 'admin' },
  user: null,
});

describe('Audit logs export stream', () => {
  const transform = jest.fn((uid: string, params: unknown) => params);
  const findMany = jest.fn();
  const emit = jest.fn().mockResolvedValue(undefined);
  const configGet = jest.fn((key: string, defaultValue?: unknown) =>
    key === 'admin.auth.secret' ? SECRET : defaultValue
  );

  const strapiMock = {
    get: jest.fn((name: string) => (name === 'query-params' ? { transform } : {})),
    db: { query: jest.fn(() => ({ findMany })) },
    eventHub: { emit },
    config: { get: configGet },
    log: { error: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockReset();
    configGet.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'admin.auth.secret' ? SECRET : defaultValue
    );
  });

  it('echoes the original token on continuations instead of re-signing it', async () => {
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const original = continuationToken(50);
    const service = createAuditLogsService(strapiMock);
    const { exportToken, stream } = await service.createExportStream({
      cursor: 10,
      until: 50,
      token: original,
    });
    await streamToString(stream);

    expect(exportToken).toBe(original);
  });

  it('refuses to export before writing anything when admin.auth.secret is not set', async () => {
    configGet.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'admin.auth.secret' ? undefined : defaultValue
    );

    const service = createAuditLogsService(strapiMock);

    await expect(service.createExportStream({})).rejects.toThrow('admin.auth.secret');
    expect(emit).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('records an export event, freezes the id bound, and streams header plus rows', async () => {
    findMany
      .mockResolvedValueOnce([{ id: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeRow(1), makeRow(2)]);

    const service = createAuditLogsService(strapiMock);
    const { stream, nextCursor, until, isNewExport, exportToken } =
      await service.createExportStream({});

    expect(emit).toHaveBeenCalledWith(AUDIT_LOG_EXPORT_EVENT, { filters: null });
    expect(emit.mock.invocationCallOrder[0]).toBeLessThan(findMany.mock.invocationCallOrder[0]);
    expect(until).toBe(2);
    expect(isNewExport).toBe(true);
    expect(nextCursor).toBeNull();
    expect(verifyExportToken(SECRET, exportToken, 2, undefined)).toBe(true);
    expect(verifyExportToken(SECRET, exportToken, 3, undefined)).toBe(false);

    const lines = (await streamToString(stream)).split('\r\n');
    expect(lines[0]).toBe(CSV_BOM + CSV_HEADER);
    expect(lines).toHaveLength(1 + 2 + 1);
  });

  it('omits the BOM and header on part continuations so parts concatenate into one file', async () => {
    findMany
      .mockResolvedValueOnce([{ id: 20 }, { id: 21 }])
      .mockResolvedValueOnce([makeRow(11), makeRow(12)]);

    const service = createAuditLogsService(strapiMock);
    const { stream, nextCursor, until, isNewExport } = await service.createExportStream({
      cursor: 10,
      until: 50,
      pageSize: 10,
      token: continuationToken(50),
    });

    expect(emit).not.toHaveBeenCalled();
    expect(isNewExport).toBe(false);
    expect(until).toBe(50);
    expect(nextCursor).toBe(20);

    const text = await streamToString(stream);
    expect(text.startsWith(CSV_BOM)).toBe(false);
    expect(text).not.toContain(CSV_HEADER);
    expect(text.trim().split('\r\n')).toHaveLength(2);

    expect(findMany).toHaveBeenNthCalledWith(1, {
      select: ['id'],
      where: { $and: [{}, { id: { $lte: 50 } }, { id: { $gt: 10 } }] },
      orderBy: { id: 'asc' },
      offset: 9,
      limit: 2,
    });
  });

  it('streams the part in keyset batches clamped to the probed boundary', async () => {
    const firstBatch = Array.from({ length: 5000 }, (unused, index) => makeRow(index + 1));
    const secondBatch = Array.from({ length: 1000 }, (unused, index) => makeRow(index + 5001));

    findMany
      .mockResolvedValueOnce([{ id: 6000 }, { id: 6001 }])
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce(secondBatch);

    const service = createAuditLogsService(strapiMock);
    const { stream, nextCursor } = await service.createExportStream({
      until: 10000,
      cursor: 1,
      pageSize: 6000,
      token: continuationToken(10000),
    });

    const lines = (await streamToString(stream)).trim().split('\r\n');

    expect(nextCursor).toBe(6000);
    expect(lines).toHaveLength(6000);
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        limit: 5000,
        where: { $and: [{}, { id: { $lte: 6000 } }, { id: { $gt: 1 } }] },
      })
    );
    expect(findMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        limit: 1000,
        where: { $and: [{}, { id: { $lte: 6000 } }, { id: { $gt: 5000 } }] },
      })
    );
  });

  it('sizes the part from the exportPartRows config when the request does not choose one', async () => {
    configGet.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === 'admin.auth.secret') return SECRET;
      return key === 'admin.auditLogs.exportPartRows' ? 7 : defaultValue;
    });
    findMany.mockResolvedValueOnce([{ id: 8 }, { id: 9 }]).mockResolvedValueOnce([]);

    const service = createAuditLogsService(strapiMock);
    const { partSize, nextCursor, stream } = await service.createExportStream({
      cursor: 1,
      until: 100,
      token: continuationToken(100),
    });
    await streamToString(stream);

    expect(partSize).toBe(7);
    expect(nextCursor).toBe(8);
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 6, limit: 2 }));
  });

  it('clamps the configured part size to the maximum', async () => {
    configGet.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === 'admin.auth.secret') return SECRET;
      return key === 'admin.auditLogs.exportPartRows' ? 10_000_000 : defaultValue;
    });
    findMany.mockResolvedValue([]);

    const service = createAuditLogsService(strapiMock);
    const { partSize, stream } = await service.createExportStream({
      cursor: 1,
      until: 100,
      token: continuationToken(100),
    });
    await streamToString(stream);

    expect(partSize).toBe(100000);
  });

  it('clamps a zero or negative configured part size to one row', async () => {
    configGet.mockImplementation((key: string, defaultValue: unknown) => {
      if (key === 'admin.auth.secret') return SECRET;
      return key === 'admin.auditLogs.exportPartRows' ? 0 : defaultValue;
    });
    findMany.mockResolvedValueOnce([{ id: 3 }, { id: 4 }]).mockResolvedValueOnce([makeRow(3)]);

    const service = createAuditLogsService(strapiMock);
    const { partSize, stream } = await service.createExportStream({
      cursor: 2,
      until: 100,
      token: continuationToken(100),
    });
    const lines = (await streamToString(stream)).trim().split('\r\n');

    expect(partSize).toBe(1);
    expect(lines).toHaveLength(1);
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0, limit: 2 }));
  });

  it('cannot stream past the boundary when rows below it are deleted mid part', async () => {
    findMany
      .mockResolvedValueOnce([{ id: 12 }, { id: 13 }])
      .mockResolvedValueOnce([makeRow(5), makeRow(6), makeRow(7), makeRow(8)]);

    const service = createAuditLogsService(strapiMock);
    const { stream, nextCursor } = await service.createExportStream({
      until: 100,
      cursor: 2,
      pageSize: 10,
      token: continuationToken(100),
    });

    const lines = (await streamToString(stream)).trim().split('\r\n');

    expect(nextCursor).toBe(12);
    expect(lines).toHaveLength(4);

    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { $and: [{}, { id: { $lte: 12 } }, { id: { $gt: 2 } }] },
      })
    );
  });

  it('only hydrates the user columns the export writes', async () => {
    findMany.mockResolvedValue([]);

    const service = createAuditLogsService(strapiMock);
    const { stream } = await service.createExportStream({
      until: 10,
      cursor: 1,
      token: continuationToken(10),
    });
    await streamToString(stream);

    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        populate: { user: { select: ['id', 'email', 'username', 'firstname', 'lastname'] } },
      })
    );
  });

  it('records an export event when a cursor arrives without a token', async () => {
    findMany
      .mockResolvedValueOnce([{ id: 5 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeRow(2), makeRow(3)]);

    const service = createAuditLogsService(strapiMock);
    const { stream, until, isNewExport } = await service.createExportStream({ cursor: 1 });
    await streamToString(stream);

    expect(emit).toHaveBeenCalledWith(AUDIT_LOG_EXPORT_EVENT, { filters: null });
    expect(isNewExport).toBe(true);
    expect(until).toBe(5);
  });

  it('does not trust a crafted cursor and until pair without a valid token', async () => {
    findMany
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeRow(2)]);

    const service = createAuditLogsService(strapiMock);
    const { stream, until, isNewExport } = await service.createExportStream({
      cursor: 1,
      until: 999999,
      token: 'forged-token',
    });
    await streamToString(stream);

    expect(emit).toHaveBeenCalledWith(AUDIT_LOG_EXPORT_EVENT, { filters: null });
    expect(isNewExport).toBe(true);
    expect(until).toBe(7);
  });

  it('logs a truncated part when the stream fails after the response started', async () => {
    findMany
      .mockResolvedValueOnce([{ id: 10 }])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('connection lost'));

    const service = createAuditLogsService(strapiMock);
    const { stream } = await service.createExportStream({});

    await expect(streamToString(stream)).rejects.toThrow('connection lost');
    expect(strapiMock.log.error).toHaveBeenCalledWith(expect.stringContaining('truncated'));
  });

  it('reports an export too large only when rows exist beyond the cap', async () => {
    findMany.mockResolvedValueOnce([{ id: 42 }]).mockResolvedValueOnce([]);

    const service = createAuditLogsService(strapiMock);

    await expect(service.isExportTooLarge({ filters: null })).resolves.toBe(true);
    await expect(service.isExportTooLarge({ filters: null })).resolves.toBe(false);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ offset: 1000000, limit: 1 }));
  });

  describe('toCsvLine', () => {
    it('sanitizes the user and stringifies object payloads', () => {
      const line = toCsvLine({
        id: 1,
        action: 'entry.update',
        date: new Date('2026-08-25T10:00:00.000Z'),
        payload: { model: 'article', origin: 'admin' },
        user: { id: 3, email: 'marie@test.io', firstname: 'Marie', lastname: 'Dubois' },
      });

      expect(line).toBe(
        '1,entry.update,2026-08-25T10:00:00.000Z,3,marie@test.io,Marie Dubois,admin,"{""model"":""article"",""origin"":""admin""}"\r\n'
      );
    });

    it('extracts the origin from payloads the driver returns as JSON text', () => {
      const line = toCsvLine({
        id: 1,
        action: 'entry.update',
        date: '2026-08-25T10:00:00.000Z',
        payload: '{"model":"article","origin":"mcp"}',
        user: null,
      });

      expect(line).toBe(
        '1,entry.update,2026-08-25T10:00:00.000Z,,,,mcp,"{""model"":""article"",""origin"":""mcp""}"\r\n'
      );
    });

    it('keeps corrupt payload text verbatim with an empty origin', () => {
      const line = toCsvLine({
        id: 2,
        action: 'entry.update',
        date: '2026-08-25T10:00:01.000Z',
        payload: '{corrupt json',
        user: null,
      });

      expect(line).toBe('2,entry.update,2026-08-25T10:00:01.000Z,,,,,{corrupt json\r\n');
    });

    it('neutralizes payload content that spreadsheets would evaluate as a formula', () => {
      const line = toCsvLine({
        id: 1,
        action: 'entry.update',
        date: '2026-08-25T10:00:00.000Z',
        payload: '=cmd|calc',
        user: null,
      });

      expect(line).toBe("1,entry.update,2026-08-25T10:00:00.000Z,,,,,'=cmd|calc\r\n");
    });

    it('leaves origin and payload empty for an absent payload', () => {
      const line = toCsvLine({
        id: 2,
        action: 'audit-log.export',
        date: '2026-08-25T10:00:00.000Z',
        payload: null,
        user: null,
      });

      expect(line).toBe('2,audit-log.export,2026-08-25T10:00:00.000Z,,,,,\r\n');
    });
  });
});
