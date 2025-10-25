import auditLogService from '../services/audit-log';

describe('Audit Log Service', () => {
  let strapi: any;

  beforeEach(() => {
    strapi = {
      entityService: {
        findPage: jest.fn(),
      },
      plugin: jest.fn(() => ({
        service: jest.fn(() => auditLogService({ strapi })),
      })),
    };
  });

  test('find method calls entityService.findPage with correct arguments', async () => {
    const mockQuery = {
      filters: { contentType: 'product' },
      pagination: { page: 1, pageSize: 10 },
      sort: 'createdAt:desc',
    };

    await auditLogService({ strapi }).find(mockQuery);

    expect(strapi.entityService.findPage).toHaveBeenCalledWith(
      'plugin::audit-log.audit-log',
      mockQuery
    );
  });
});
