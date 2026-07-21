import { validateFindMany, validateFindManyUsers } from '../audit-logs';

describe('Audit logs validation', () => {
  describe('validateFindMany', () => {
    it('should accept pagination and an allowed sort', async () => {
      await expect(
        validateFindMany({ page: 1, pageSize: 10, sort: 'date:DESC' })
      ).resolves.toBeDefined();
    });

    it('should reject a disallowed sort', async () => {
      await expect(validateFindMany({ sort: 'payload:ASC' })).rejects.toThrow();
    });
  });

  describe('validateFindManyUsers', () => {
    it('should accept pagination params', async () => {
      await expect(validateFindManyUsers({ page: 2, pageSize: 20 })).resolves.toBeDefined();
    });

    it('should reject a page size above the limit', async () => {
      await expect(validateFindManyUsers({ pageSize: 1000 })).rejects.toThrow();
    });

    it('should reject a non-positive page', async () => {
      await expect(validateFindManyUsers({ page: 0 })).rejects.toThrow();
    });
  });
});
