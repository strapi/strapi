import auditService from '../services/audit';

describe('Audit Service', () => {
  let strapi;

  beforeEach(() => {
    strapi = {
      config: {
        get: jest.fn(() => ({ enabled: true, excludeContentTypes: [] })),
      },
      db: {
        query: jest.fn(() => ({
          create: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          findOne: jest.fn(),
        })),
      },
      log: {
        debug: jest.fn(),
        error: jest.fn(),
      },
    };
  });

  describe('createLog', () => {
    it('should create an audit log when enabled', async () => {
      const service = auditService({ strapi });
      const createMock = jest.fn();
      strapi.db.query.mockReturnValue({ create: createMock });

      await service.createLog({
        contentType: 'api::article.article',
        contentId: 1,
        action: 'create',
        userId: 1,
        userEmail: 'test@example.com',
      });

      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentType: 'api::article.article',
          contentId: 1,
          action: 'create',
          userId: 1,
          userEmail: 'test@example.com',
          timestamp: expect.any(Date),
        }),
      });
    });

    it('should not create log when disabled', async () => {
      strapi.config.get.mockReturnValue({ enabled: false });
      const service = auditService({ strapi });
      const createMock = jest.fn();
      strapi.db.query.mockReturnValue({ create: createMock });

      await service.createLog({
        contentType: 'api::article.article',
        contentId: 1,
        action: 'create',
      });

      expect(createMock).not.toHaveBeenCalled();
    });

    it('should not create log for excluded content types', async () => {
      strapi.config.get.mockReturnValue({
        enabled: true,
        excludeContentTypes: ['api::article.article'],
      });
      const service = auditService({ strapi });
      const createMock = jest.fn();
      strapi.db.query.mockReturnValue({ create: createMock });

      await service.createLog({
        contentType: 'api::article.article',
        contentId: 1,
        action: 'create',
      });

      expect(createMock).not.toHaveBeenCalled();
    });
  });

  describe('calculateChangedFields', () => {
    it('should detect changed fields', () => {
      const service = auditService({ strapi });
      const oldData = { title: 'Old Title', content: 'Same content' };
      const newData = { title: 'New Title', content: 'Same content' };

      const changes = service.calculateChangedFields(oldData, newData);

      expect(changes).toEqual({
        title: { from: 'Old Title', to: 'New Title' },
      });
    });

    it('should return null when no fields changed', () => {
      const service = auditService({ strapi });
      const oldData = { title: 'Same Title', content: 'Same content' };
      const newData = { title: 'Same Title', content: 'Same content' };

      const changes = service.calculateChangedFields(oldData, newData);

      expect(changes).toBeNull();
    });

    it('should ignore system fields', () => {
      const service = auditService({ strapi });
      const oldData = { id: 1, title: 'Title', createdAt: '2023-01-01' };
      const newData = { id: 1, title: 'Title', createdAt: '2023-01-02' };

      const changes = service.calculateChangedFields(oldData, newData);

      expect(changes).toBeNull();
    });
  });
});