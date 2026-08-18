import { createAuditLogsService } from '../audit-logs';

describe('Audit logs service | findMany', () => {
  const logs = [
    { id: 1, action: 'entry.create', date: '2026-01-01', payload: {}, user: null },
    { id: 2, action: 'entry.update', date: '2026-01-02', payload: {}, user: null },
  ];

  const mockFindPage = jest.fn().mockResolvedValue({
    results: [{ id: 2 }, { id: 1 }],
    pagination: { page: 1, pageSize: 10, pageCount: 1, total: 2 },
  });
  const mockFindMany = jest.fn().mockResolvedValue(logs);

  const strapi = {
    db: {
      query: jest.fn(() => ({ findPage: mockFindPage, findMany: mockFindMany })),
    },
    get: jest.fn(() => ({
      transform: jest.fn(() => ({ orderBy: [{ date: 'desc' }, { id: 'asc' }] })),
    })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sort the log ids only, then fetch the logs by id', async () => {
    const service = createAuditLogsService(strapi);

    const result = await service.findMany({ page: 1, pageSize: 10 });

    expect(mockFindPage).toHaveBeenCalledWith(expect.objectContaining({ select: ['id'] }));
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { id: { $in: [2, 1] } },
      populate: ['user'],
      select: ['action', 'date', 'payload'],
    });
    expect(result.results.map((log: any) => log.id)).toEqual([2, 1]);
    expect(result.pagination).toMatchObject({ page: 1, pageCount: 1, total: 2 });
  });

  it('should leave out the logs deleted between the two queries', async () => {
    mockFindMany.mockResolvedValueOnce([logs[1]]);

    const service = createAuditLogsService(strapi);

    const result = await service.findMany({ page: 1, pageSize: 10 });

    expect(result.results.map((log: any) => log.id)).toEqual([2]);
  });
});
