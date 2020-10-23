'use strict';

const editingLockService = require('../editing-lock');

describe('EditingLock', () => {
  describe('Collection type', () => {
    const fakeModel = {
      kind: 'collectionType',
    };
    const user = {
      id: 1234,
      firstname: 'Claire',
      lastname: 'Heitzler',
      username: null,
    };

    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn(() => fakeModel),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('getLock', async () => {
      const model = 'application::country.country';
      const entityId = 1234;
      const result = {
        isLockFree: true,
        lock: { uid: '123' },
      };
      const get = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ get });

      const lockResult = await editingLockService.getLock({ model, entityId });
      expect(get).toHaveBeenCalledWith(`edit:${model}:${entityId}`);
      expect(lockResult).toBeDefined();
      expect(lockResult.isLockFree).toBe(result.isLockFree);
      expect(lockResult.lock).toEqual(result.lock);
    });

    test('setLock', async () => {
      const model = 'application::country.country';
      const entityId = 1;
      const result = {
        success: true,
        lock: { uid: '123' },
      };
      const metadata = { lastActivityDate: new Date() };
      const set = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ set });

      const lockResult = await editingLockService.setLock({ model, entityId, metadata, user });
      expect(set).toHaveBeenCalledWith(
        {
          key: `edit:${model}:${entityId}`,
          ttl: 30000,
          metadata: {
            lastActivityDate: metadata.lastActivityDate,
            lastUpdatedAt: expect.any(Date),
            lockedBy: user,
          },
        },
        { force: false }
      );
      expect(lockResult).toBeDefined();
      expect(lockResult.success).toBe(result.success);
      expect(lockResult.lock).toEqual(result.lock);
    });

    test('unlock', async () => {
      const model = 'application::country.country';
      const entityId = 1;
      const uid = 123;
      const result = {
        success: true,
        lock: { uid },
      };
      const extend = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ extend });

      const lockResult = await editingLockService.unlock({ model, entityId, uid });
      expect(extend).toHaveBeenCalledWith({ key: `edit:${model}:${entityId}`, uid, ttl: 0 });
      expect(lockResult).toBeDefined();
      expect(lockResult.success).toBe(result.success);
      expect(lockResult.lock).toEqual(result.lock);
    });

    test('extendLock', async () => {
      const model = 'application::country.country';
      const entityId = 1;
      const uid = 123;
      const result = {
        success: true,
        lock: { uid },
      };
      const metadata = { lastActivityDate: new Date() };
      const extend = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ extend });

      const lockResult = await editingLockService.extendLock({ model, entityId, uid, metadata });
      expect(extend).toHaveBeenCalledWith(
        {
          key: `edit:${model}:${entityId}`,
          uid,
          ttl: 30000,
          metadata: {
            lastActivityDate: metadata.lastActivityDate,
          },
        },
        { mergeMetadata: true }
      );
      expect(lockResult).toBeDefined();
      expect(lockResult.success).toBe(result.success);
      expect(lockResult.lock).toEqual(result.lock);
    });
  });

  describe('Single type', () => {
    const fakeModel = {
      kind: 'singleType',
    };
    const user = {
      id: 1234,
      firstname: 'Claire',
      lastname: 'Heitzler',
      username: null,
    };

    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn(() => fakeModel),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('getLock', async () => {
      const model = 'application::country.country';
      const result = {
        isLockFree: true,
        lock: { uid: '123' },
      };
      const get = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ get });

      const lockResult = await editingLockService.getLock({ model });
      expect(get).toHaveBeenCalledWith(`edit:${model}`);
      expect(lockResult).toBeDefined();
      expect(lockResult.isLockFree).toBe(result.isLockFree);
      expect(lockResult.lock).toEqual(result.lock);
    });

    test('setLock', async () => {
      const model = 'application::country.country';
      const result = {
        success: true,
        lock: { uid: '123' },
      };
      const metadata = { lastActivityDate: new Date() };
      const set = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ set });

      const lockResult = await editingLockService.setLock({ model, metadata, user });
      expect(set).toHaveBeenCalledWith(
        {
          key: `edit:${model}`,
          ttl: 30000,
          metadata: {
            lastActivityDate: metadata.lastActivityDate,
            lastUpdatedAt: expect.any(Date),
            lockedBy: user,
          },
        },
        { force: false }
      );
      expect(lockResult).toBeDefined();
      expect(lockResult.success).toBe(result.success);
      expect(lockResult.lock).toEqual(result.lock);
    });

    test('unlock', async () => {
      const model = 'application::country.country';
      const uid = 123;
      const result = {
        success: true,
        lock: { uid },
      };
      const extend = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ extend });

      const lockResult = await editingLockService.unlock({ model, uid });
      expect(extend).toHaveBeenCalledWith({ key: `edit:${model}`, uid, ttl: 0 });
      expect(lockResult).toBeDefined();
      expect(lockResult.success).toBe(result.success);
      expect(lockResult.lock).toEqual(result.lock);
    });

    test('extendLock', async () => {
      const model = 'application::country.country';
      const uid = 123;
      const result = {
        success: true,
        lock: { uid },
      };
      const metadata = { lastActivityDate: new Date() };
      const extend = jest.fn(() => Promise.resolve(result));
      global.strapi.lockService = () => ({ extend });

      const lockResult = await editingLockService.extendLock({ model, uid, metadata });
      expect(extend).toHaveBeenCalledWith(
        {
          key: `edit:${model}`,
          uid,
          ttl: 30000,
          metadata: {
            lastActivityDate: metadata.lastActivityDate,
          },
        },
        { mergeMetadata: true }
      );
      expect(lockResult).toBeDefined();
      expect(lockResult.success).toBe(result.success);
      expect(lockResult.lock).toEqual(result.lock);
    });
  });
});
