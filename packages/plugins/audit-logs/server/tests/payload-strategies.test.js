'use strict';

const createPayloadStrategy = require('../src/strategies/create-payload');
const updatePayloadStrategy = require('../src/strategies/update-payload');
const deletePayloadStrategy = require('../src/strategies/delete-payload');

describe('Payload Strategies', () => {
  describe('Create Payload Strategy', () => {
    it('should build payload for create operation', () => {
      const event = {
        params: {
          data: {
            title: 'Test Article',
            content: 'Test content',
          },
        },
        result: {
          id: 1,
          documentId: 'abc123',
        },
      };

      const payload = createPayloadStrategy.build(event);

      expect(payload).toEqual({
        action: 'create',
        data: {
          title: 'Test Article',
          content: 'Test content',
        },
        result: {
          id: 1,
          documentId: 'abc123',
        },
      });
    });

    it('should sanitize sensitive fields in create payload', () => {
      const event = {
        params: {
          data: {
            username: 'testuser',
            password: 'secret123',
            email: 'test@example.com',
          },
        },
        result: {
          id: 1,
          documentId: 'user123',
        },
      };

      const payload = createPayloadStrategy.build(event);

      expect(payload.data.username).toBe('testuser');
      expect(payload.data.password).toBe('[REDACTED]');
      expect(payload.data.email).toBe('test@example.com');
    });

    it('should handle missing params', () => {
      const event = {
        result: {
          id: 1,
          documentId: 'abc123',
        },
      };

      const payload = createPayloadStrategy.build(event);

      expect(payload.action).toBe('create');
      expect(payload.data).toEqual({});
    });

    it('should handle missing result', () => {
      const event = {
        params: {
          data: {
            title: 'Test',
          },
        },
      };

      const payload = createPayloadStrategy.build(event);

      expect(payload.result).toBeNull();
    });
  });

  describe('Update Payload Strategy', () => {
    it('should build payload for update operation', () => {
      const event = {
        params: {
          data: {
            title: 'Updated Title',
          },
          where: {
            id: 5,
          },
        },
        result: {
          id: 5,
          documentId: 'abc123',
        },
      };

      const payload = updatePayloadStrategy.build(event);

      expect(payload).toEqual({
        action: 'update',
        changes: {
          title: 'Updated Title',
        },
        where: {
          id: 5,
        },
        result: {
          id: 5,
          documentId: 'abc123',
        },
      });
    });

    it('should sanitize sensitive fields in update payload', () => {
      const event = {
        params: {
          data: {
            email: 'newemail@example.com',
            password: 'newsecret',
          },
          where: {
            id: 1,
          },
        },
        result: {
          id: 1,
          documentId: 'user123',
        },
      };

      const payload = updatePayloadStrategy.build(event);

      expect(payload.changes.email).toBe('newemail@example.com');
      expect(payload.changes.password).toBe('[REDACTED]');
    });

    it('should handle missing params', () => {
      const event = {
        result: {
          id: 1,
          documentId: 'abc123',
        },
      };

      const payload = updatePayloadStrategy.build(event);

      expect(payload.changes).toEqual({});
      expect(payload.where).toEqual({});
    });
  });

  describe('Delete Payload Strategy', () => {
    it('should build payload for delete operation', () => {
      const event = {
        params: {
          where: {
            id: 5,
          },
        },
        state: {
          originalData: {
            id: 5,
            title: 'Deleted Article',
          },
        },
        result: null,
      };

      const payload = deletePayloadStrategy.build(event);

      expect(payload).toEqual({
        action: 'delete',
        where: {
          id: 5,
        },
        deletedData: {
          id: 5,
          title: 'Deleted Article',
        },
        result: null,
      });
    });

    it('should sanitize sensitive fields in deleted data', () => {
      const event = {
        params: {
          where: {
            id: 1,
          },
        },
        state: {
          originalData: {
            id: 1,
            username: 'testuser',
            password: 'secret123',
            apiToken: 'token123',
          },
        },
      };

      const payload = deletePayloadStrategy.build(event);

      expect(payload.deletedData.username).toBe('testuser');
      expect(payload.deletedData.password).toBe('[REDACTED]');
      expect(payload.deletedData.apiToken).toBe('[REDACTED]');
    });

    it('should handle missing originalData', () => {
      const event = {
        params: {
          where: {
            id: 5,
          },
        },
      };

      const payload = deletePayloadStrategy.build(event);

      expect(payload.deletedData).toBeNull();
    });

    it('should handle missing params', () => {
      const event = {};

      const payload = deletePayloadStrategy.build(event);

      expect(payload.where).toEqual({});
      expect(payload.deletedData).toBeNull();
    });
  });
});
