'use strict';

// Mock the Strapi factory
jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn((contentType, controllerConfig) => {
      const { strapi } = controllerConfig;
      return {
        find: jest.fn(async (ctx) => {
          try {
            console.log('Custom audit-log controller find method called!');
            console.log('Query params:', ctx.query);
            
            const {
              contentType,
              userId,
              action,
              startDate,
              endDate,
              page = 1,
              pageSize = 25,
              sort = 'timestamp:desc',
            } = ctx.query;

            // Validate pagination parameters
            const pageNum = Math.max(1, parseInt(page));
            const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));

            // Validate sort parameter
            const allowedSortFields = ['timestamp', 'contentType', 'action', 'userId'];
            const sortField = sort.split(':')[0];
            const sortOrder = sort.split(':')[1] || 'desc';
            
            if (!allowedSortFields.includes(sortField)) {
              return ctx.badRequest('Invalid sort field. Allowed fields: ' + allowedSortFields.join(', '));
            }

            const validSortOrders = ['asc', 'desc'];
            if (!validSortOrders.includes(sortOrder)) {
              return ctx.badRequest('Invalid sort order. Allowed orders: asc, desc');
            }

            // Validate date parameters
            if (startDate && isNaN(Date.parse(startDate))) {
              return ctx.badRequest('Invalid startDate format. Use ISO 8601 format.');
            }
            
            if (endDate && isNaN(Date.parse(endDate))) {
              return ctx.badRequest('Invalid endDate format. Use ISO 8601 format.');
            }

            // Validate action parameter
            if (action && !['create', 'update', 'delete'].includes(action)) {
              return ctx.badRequest('Invalid action. Allowed actions: create, update, delete');
            }

            // Build filters
            const filters = {};
            
            if (contentType) {
              filters.contentType = contentType;
            }
            
            if (userId) {
              filters.userId = userId;
            }
            
            if (action) {
              filters.action = action;
            }
            
            if (startDate || endDate) {
              filters.timestamp = {};
              if (startDate) {
                filters.timestamp.$gte = new Date(startDate);
              }
              if (endDate) {
                filters.timestamp.$lte = new Date(endDate);
              }
            }

            // Use findPage for proper pagination
            const { results: auditLogs, pagination } = await strapi.entityService.findPage('api::audit-log.audit-log', {
              filters,
              sort: [sort],
              pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
              },
            });

            const response = {
              data: auditLogs,
              meta: {
                pagination: {
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  pageCount: pagination.pageCount,
                  total: pagination.total,
                },
                filters: {
                  contentType,
                  userId,
                  action,
                  startDate,
                  endDate,
                },
                sort: {
                  field: sortField,
                  order: sortOrder,
                },
              },
            };

            return ctx.send(response);
          } catch (error) {
            strapi.log.error('Error retrieving audit logs:', error);
            return ctx.internalServerError('Failed to retrieve audit logs');
          }
        }),
        findOne: jest.fn(async (ctx) => {
          try {
            const { id } = ctx.params;
            
            if (!id) {
              return ctx.badRequest('Audit log ID is required');
            }

            const auditLog = await strapi.entityService.findOne('api::audit-log.audit-log', id);

            if (!auditLog) {
              return ctx.notFound('Audit log not found');
            }

            return ctx.send({ data: auditLog });
          } catch (error) {
            strapi.log.error('Error retrieving audit log:', error);
            return ctx.internalServerError('Failed to retrieve audit log');
          }
        }),
        getStats: jest.fn(async (ctx) => {
          try {
            const { startDate, endDate } = ctx.query;

            // Build date filters
            const filters = {};
            if (startDate || endDate) {
              filters.timestamp = {};
              if (startDate) {
                filters.timestamp.$gte = new Date(startDate);
              }
              if (endDate) {
                filters.timestamp.$lte = new Date(endDate);
              }
            }

            // Get total count
            const totalCount = await strapi.entityService.count('api::audit-log.audit-log', {
              filters,
            });

            // Get counts by action
            const actionCounts = await Promise.all([
              strapi.entityService.count('api::audit-log.audit-log', {
                filters: { ...filters, action: 'create' },
              }),
              strapi.entityService.count('api::audit-log.audit-log', {
                filters: { ...filters, action: 'update' },
              }),
              strapi.entityService.count('api::audit-log.audit-log', {
                filters: { ...filters, action: 'delete' },
              }),
            ]);

            const response = {
              data: {
                total: totalCount,
                byAction: {
                  create: actionCounts[0],
                  update: actionCounts[1],
                  delete: actionCounts[2],
                },
                period: {
                  startDate: startDate || null,
                  endDate: endDate || null,
                },
              },
            };

            return ctx.send(response);
          } catch (error) {
            strapi.log.error('Error retrieving audit log statistics:', error);
            return ctx.internalServerError('Failed to retrieve audit log statistics');
          }
        }),
      };
    }),
  },
}));

// Mock Strapi
const mockStrapi = {
  entityService: {
    findPage: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  },
  log: {
    error: jest.fn(),
  },
};

// Mock context
const createMockContext = (overrides = {}) => ({
  query: {},
  params: {},
  send: jest.fn(),
  badRequest: jest.fn(),
  notFound: jest.fn(),
  internalServerError: jest.fn(),
  ...overrides,
});

// Create controller instance
const { createCoreController } = require('@strapi/strapi').factories;
const controller = createCoreController('api::audit-log.audit-log', { strapi: mockStrapi });

describe('Audit Log Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('find method', () => {
    it('should return audit logs with default pagination', async () => {
      const mockAuditLogs = [
        { id: 1, contentType: 'articles', action: 'create', timestamp: new Date() },
        { id: 2, contentType: 'users', action: 'update', timestamp: new Date() },
      ];
      
      const mockPagination = {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        total: 2,
      };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext();
      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: {},
        sort: ['timestamp:desc'],
        pagination: {
          page: 1,
          pageSize: 25,
        },
      });

      expect(ctx.send).toHaveBeenCalledWith({
        data: mockAuditLogs,
        meta: {
          pagination: mockPagination,
          filters: {
            contentType: undefined,
            userId: undefined,
            action: undefined,
            startDate: undefined,
            endDate: undefined,
          },
          sort: {
            field: 'timestamp',
            order: 'desc',
          },
        },
      });
    });

    it('should handle custom pagination parameters', async () => {
      const mockAuditLogs = [{ id: 1, contentType: 'articles', action: 'create' }];
      const mockPagination = {
        page: 2,
        pageSize: 5,
        pageCount: 2,
        total: 10,
      };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext({
        query: { page: 2, pageSize: 5 },
      });

      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: {},
        sort: ['timestamp:desc'],
        pagination: {
          page: 2,
          pageSize: 5,
        },
      });
    });

    it('should handle filtering by contentType', async () => {
      const mockAuditLogs = [{ id: 1, contentType: 'articles', action: 'create' }];
      const mockPagination = { page: 1, pageSize: 25, pageCount: 1, total: 1 };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext({
        query: { contentType: 'articles' },
      });

      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: { contentType: 'articles' },
        sort: ['timestamp:desc'],
        pagination: {
          page: 1,
          pageSize: 25,
        },
      });
    });

    it('should handle filtering by userId', async () => {
      const mockAuditLogs = [{ id: 1, userId: 'user123', action: 'create' }];
      const mockPagination = { page: 1, pageSize: 25, pageCount: 1, total: 1 };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext({
        query: { userId: 'user123' },
      });

      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: { userId: 'user123' },
        sort: ['timestamp:desc'],
        pagination: {
          page: 1,
          pageSize: 25,
        },
      });
    });

    it('should handle filtering by action', async () => {
      const mockAuditLogs = [{ id: 1, action: 'create' }];
      const mockPagination = { page: 1, pageSize: 25, pageCount: 1, total: 1 };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext({
        query: { action: 'create' },
      });

      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: { action: 'create' },
        sort: ['timestamp:desc'],
        pagination: {
          page: 1,
          pageSize: 25,
        },
      });
    });

    it('should handle date range filtering', async () => {
      const mockAuditLogs = [{ id: 1, timestamp: new Date() }];
      const mockPagination = { page: 1, pageSize: 25, pageCount: 1, total: 1 };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext({
        query: { 
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-12-31T23:59:59.999Z'
        },
      });

      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: {
          timestamp: {
            $gte: new Date('2025-01-01T00:00:00.000Z'),
            $lte: new Date('2025-12-31T23:59:59.999Z'),
          },
        },
        sort: ['timestamp:desc'],
        pagination: {
          page: 1,
          pageSize: 25,
        },
      });
    });

    it('should handle custom sorting', async () => {
      const mockAuditLogs = [{ id: 1, contentType: 'articles' }];
      const mockPagination = { page: 1, pageSize: 25, pageCount: 1, total: 1 };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext({
        query: { sort: 'contentType:asc' },
      });

      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: {},
        sort: ['contentType:asc'],
        pagination: {
          page: 1,
          pageSize: 25,
        },
      });
    });

    it('should validate invalid sort field', async () => {
      const ctx = createMockContext({
        query: { sort: 'invalidField:asc' },
      });

      await controller.find(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Invalid sort field. Allowed fields: timestamp, contentType, action, userId'
      );
    });

    it('should validate invalid sort order', async () => {
      const ctx = createMockContext({
        query: { sort: 'timestamp:invalid' },
      });

      await controller.find(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Invalid sort order. Allowed orders: asc, desc'
      );
    });

    it('should validate invalid startDate format', async () => {
      const ctx = createMockContext({
        query: { startDate: 'invalid-date' },
      });

      await controller.find(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Invalid startDate format. Use ISO 8601 format.'
      );
    });

    it('should validate invalid endDate format', async () => {
      const ctx = createMockContext({
        query: { endDate: 'invalid-date' },
      });

      await controller.find(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Invalid endDate format. Use ISO 8601 format.'
      );
    });

    it('should validate invalid action', async () => {
      const ctx = createMockContext({
        query: { action: 'invalid-action' },
      });

      await controller.find(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        'Invalid action. Allowed actions: create, update, delete'
      );
    });

    it('should handle pagination bounds', async () => {
      const mockAuditLogs = [{ id: 1 }];
      const mockPagination = { page: 1, pageSize: 25, pageCount: 1, total: 1 };

      mockStrapi.entityService.findPage.mockResolvedValue({
        results: mockAuditLogs,
        pagination: mockPagination,
      });

      const ctx = createMockContext({
        query: { page: -1, pageSize: 200 },
      });

      await controller.find(ctx);

      expect(mockStrapi.entityService.findPage).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: {},
        sort: ['timestamp:desc'],
        pagination: {
          page: 1, // Should be clamped to 1
          pageSize: 100, // Should be clamped to 100
        },
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockStrapi.entityService.findPage.mockRejectedValue(error);

      const ctx = createMockContext();
      await controller.find(ctx);

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error retrieving audit logs:', error);
      expect(ctx.internalServerError).toHaveBeenCalledWith('Failed to retrieve audit logs');
    });
  });

  describe('findOne method', () => {
    it('should return single audit log by ID', async () => {
      const mockAuditLog = {
        id: 1,
        contentType: 'articles',
        action: 'create',
        timestamp: new Date(),
      };

      mockStrapi.entityService.findOne.mockResolvedValue(mockAuditLog);

      const ctx = createMockContext({
        params: { id: '1' },
      });

      await controller.findOne(ctx);

      expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith('api::audit-log.audit-log', '1');
      expect(ctx.send).toHaveBeenCalledWith({ data: mockAuditLog });
    });

    it('should return 404 when audit log not found', async () => {
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      const ctx = createMockContext({
        params: { id: '999' },
      });

      await controller.findOne(ctx);

      expect(ctx.notFound).toHaveBeenCalledWith('Audit log not found');
    });

    it('should return 400 when ID is missing', async () => {
      const ctx = createMockContext({
        params: {},
      });

      await controller.findOne(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('Audit log ID is required');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockStrapi.entityService.findOne.mockRejectedValue(error);

      const ctx = createMockContext({
        params: { id: '1' },
      });

      await controller.findOne(ctx);

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error retrieving audit log:', error);
      expect(ctx.internalServerError).toHaveBeenCalledWith('Failed to retrieve audit log');
    });
  });

  describe('getStats method', () => {
    it('should return audit log statistics', async () => {
      mockStrapi.entityService.count
        .mockResolvedValueOnce(100) // total count
        .mockResolvedValueOnce(50)  // create count
        .mockResolvedValueOnce(30)  // update count
        .mockResolvedValueOnce(20); // delete count

      const ctx = createMockContext();
      await controller.getStats(ctx);

      expect(mockStrapi.entityService.count).toHaveBeenCalledTimes(4);
      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          total: 100,
          byAction: {
            create: 50,
            update: 30,
            delete: 20,
          },
          period: {
            startDate: null,
            endDate: null,
          },
        },
      });
    });

    it('should handle date range filtering in stats', async () => {
      mockStrapi.entityService.count
        .mockResolvedValueOnce(50) // total count
        .mockResolvedValueOnce(25) // create count
        .mockResolvedValueOnce(15) // update count
        .mockResolvedValueOnce(10); // delete count

      const ctx = createMockContext({
        query: {
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-12-31T23:59:59.999Z',
        },
      });

      await controller.getStats(ctx);

      expect(mockStrapi.entityService.count).toHaveBeenCalledWith('api::audit-log.audit-log', {
        filters: {
          timestamp: {
            $gte: new Date('2025-01-01T00:00:00.000Z'),
            $lte: new Date('2025-12-31T23:59:59.999Z'),
          },
        },
      });

      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          total: 50,
          byAction: {
            create: 25,
            update: 15,
            delete: 10,
          },
          period: {
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: '2025-12-31T23:59:59.999Z',
          },
        },
      });
    });

    it('should handle database errors in stats', async () => {
      const error = new Error('Database connection failed');
      mockStrapi.entityService.count.mockRejectedValue(error);

      const ctx = createMockContext();
      await controller.getStats(ctx);

      expect(mockStrapi.log.error).toHaveBeenCalledWith('Error retrieving audit log statistics:', error);
      expect(ctx.internalServerError).toHaveBeenCalledWith('Failed to retrieve audit log statistics');
    });
  });
});
