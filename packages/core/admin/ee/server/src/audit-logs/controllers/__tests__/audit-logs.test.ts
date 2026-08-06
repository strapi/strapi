import auditLogsController from '../audit-logs';

describe('Audit logs controller', () => {
  const findManyUsers = jest.fn().mockResolvedValue({
    results: [{ id: 1, email: 'ana@test.io', displayName: 'Ana Doe' }],
    pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      get: jest.fn(() => ({ findManyUsers })),
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
});
