'use strict';

const { sanitizeData } = require('../src/utils/sanitize');

describe('Sanitize Utility', () => {
  describe('sanitizeData', () => {
    it('should redact password fields', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
      };

      const result = sanitizeData(data);

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('[REDACTED]');
      expect(result.email).toBe('test@example.com');
    });

    it('should redact passwordHash fields', () => {
      const data = {
        username: 'testuser',
        passwordHash: 'hashed_password',
      };

      const result = sanitizeData(data);

      expect(result.passwordHash).toBe('[REDACTED]');
    });

    it('should redact multiple sensitive fields', () => {
      const data = {
        username: 'testuser',
        password: 'secret',
        resetPasswordToken: 'token123',
        apiToken: 'api_key',
        confirmationToken: 'confirm123',
      };

      const result = sanitizeData(data);

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('[REDACTED]');
      expect(result.resetPasswordToken).toBe('[REDACTED]');
      expect(result.apiToken).toBe('[REDACTED]');
      expect(result.confirmationToken).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      const data = {
        username: 'testuser',
        password: null,
        apiToken: undefined,
      };

      const result = sanitizeData(data);

      expect(result.username).toBe('testuser');
      expect(result.password).toBeNull();
      expect(result.apiToken).toBeUndefined();
    });

    it('should not mutate original data', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
      };

      const result = sanitizeData(data);

      expect(data.password).toBe('secret123'); // Original unchanged
      expect(result.password).toBe('[REDACTED]'); // Copy redacted
    });

    it('should handle empty objects', () => {
      const result = sanitizeData({});
      expect(result).toEqual({});
    });

    it('should handle non-object inputs', () => {
      expect(sanitizeData(null)).toBeNull();
      expect(sanitizeData(undefined)).toBeUndefined();
      expect(sanitizeData('string')).toBe('string');
      expect(sanitizeData(123)).toBe(123);
    });
  });
});
