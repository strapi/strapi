import { UploadRouteValidator } from '../upload';

describe('UploadRouteValidator', () => {
  let validator: UploadRouteValidator;

  beforeEach(() => {
    validator = new UploadRouteValidator({} as any);
  });

  describe('file schema', () => {
    it('should validate a valid file object', () => {
      const validFile = {
        id: 1,
        documentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'test.jpg',
        alternativeText: 'Test image',
        caption: 'A test caption',
        width: 1920,
        height: 1080,
        formats: { thumbnail: { url: '/thumb.jpg' } },
        hash: 'abc123',
        ext: '.jpg',
        mime: 'image/jpeg',
        size: 1024,
        url: '/uploads/test.jpg',
        previewUrl: '/preview.jpg',
        folder: 1,
        folderPath: '/images',
        provider: 'local',
        provider_metadata: { public_id: '123' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 1,
        updatedBy: 1,
      };

      expect(() => validator.file.parse(validFile)).not.toThrow();
    });

    it('should reject invalid file object', () => {
      const invalidFile = {
        id: 'not-a-number', // Should be number
        documentId: 'not-a-uuid',
        name: 123, // Should be string
      };

      expect(() => validator.file.parse(invalidFile)).toThrow();
    });
  });

  describe('query parameters', () => {
    it('should validate fields parameter', () => {
      const params = validator.queryParams(['fields']);

      // Single field
      expect(() => params.fields?.parse('name')).not.toThrow();

      // Array of fields
      expect(() => params.fields?.parse(['name', 'url'])).not.toThrow();
    });

    it('should validate pagination parameter', () => {
      const params = validator.queryParams(['pagination']);

      // Page-based
      expect(() => params.pagination?.parse({ page: 1, pageSize: 10 })).not.toThrow();

      // Offset-based
      expect(() => params.pagination?.parse({ start: 0, limit: 10 })).not.toThrow();

      // Invalid
      expect(() => params.pagination?.parse({ page: -1 })).toThrow();
    });

    it('should validate sort parameter', () => {
      const params = validator.queryParams(['sort']);

      // String sort
      expect(() => params.sort?.parse('name:asc')).not.toThrow();

      // Array sort
      expect(() => params.sort?.parse(['name:asc', 'createdAt:desc'])).not.toThrow();

      // Object sort
      expect(() => params.sort?.parse({ name: 'asc', createdAt: 'desc' })).not.toThrow();
    });
  });
});
