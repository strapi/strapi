import { createAuditLogsService } from '../audit-logs';

describe('Audit logs service | findManyUsers', () => {
  const authors = [
    { id: 1, email: 'ana@test.io', username: null, firstname: 'Ana', lastname: 'Doe' },
    { id: 2, email: 'bob@test.io', username: 'bob', firstname: null, lastname: null },
  ];

  const mockPluck = jest.fn().mockResolvedValue([1, 2]);
  const mockDistinct = jest.fn(() => ({ pluck: mockPluck }));
  const mockFindPage = jest.fn().mockResolvedValue({
    results: authors,
    pagination: { page: 1, pageSize: 10, pageCount: 1, total: 2 },
  });

  const strapi = {
    db: {
      connection: jest.fn(() => ({ distinct: mockDistinct })),
      metadata: {
        get: jest.fn(() => ({
          attributes: {
            user: {
              type: 'relation',
              joinTable: {
                name: 'strapi_audit_logs_user_lnk',
                inverseJoinColumn: { name: 'user_id' },
              },
            },
          },
        })),
      },
      query: jest.fn(() => ({ findPage: mockFindPage })),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return only the users that authored audit logs, sanitized to the audit log user shape', async () => {
    const service = createAuditLogsService(strapi);

    const result = await service.findManyUsers({ page: 1, pageSize: 10 });

    expect(strapi.db.connection).toHaveBeenCalledWith('strapi_audit_logs_user_lnk');
    expect(mockPluck).toHaveBeenCalledWith('user_id');
    expect(strapi.db.query).toHaveBeenCalledWith('admin::user');
    expect(mockFindPage).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { $in: [1, 2] } },
        page: 1,
        pageSize: 10,
      })
    );
    expect(result.results).toEqual([
      { id: 1, email: 'ana@test.io', displayName: 'Ana Doe' },
      { id: 2, email: 'bob@test.io', displayName: 'bob' },
    ]);
    expect(result.pagination).toMatchObject({ page: 1, pageCount: 1, total: 2 });
  });

  it('should only forward pagination params to the users query', async () => {
    const service = createAuditLogsService(strapi);

    await service.findManyUsers({
      page: 2,
      pageSize: 20,
      filters: { password: { $startsWith: 'x' } },
      populate: ['roles'],
    } as any);

    const findPageArgs = mockFindPage.mock.calls[0][0];
    expect(findPageArgs.page).toBe(2);
    expect(findPageArgs.pageSize).toBe(20);
    expect(findPageArgs.where).toEqual({ id: { $in: [1, 2] } });
    expect(findPageArgs.filters).toBeUndefined();
    expect(findPageArgs.populate).toBeUndefined();
  });
});
