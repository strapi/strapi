'use strict';

const createEntityService = require('../entity-service');
const { EventEmitter } = require('events');

describe('Entity service', () => {
  describe('Find', () => {
    test('Returns first element for single types', async () => {
      const data = {
        id: 1,
        title: 'Test',
      };

      const fakeQuery = {
        find: jest.fn(() => Promise.resolve([data])),
      };

      const fakeDB = {
        getModel: jest.fn(() => {
          return { kind: 'singleType' };
        }),
        query: jest.fn(() => fakeQuery),
      };

      const instance = createEntityService({
        db: fakeDB,
        eventHub: new EventEmitter(),
      });

      const result = await instance.find({}, { model: 'test-model' });

      expect(fakeDB.getModel).toHaveBeenCalledTimes(1);
      expect(fakeDB.getModel).toHaveBeenCalledWith('test-model');

      expect(fakeDB.query).toHaveBeenCalledWith('test-model');
      expect(fakeQuery.find).toHaveBeenCalledWith({ _limit: 1 }, undefined);
      expect(result).toEqual(data);
    });
  });

  describe('Create', () => {
    test('Throws when trying to create a new single type entry if there is already one', async () => {
      const fakeQuery = {
        count: jest.fn(() => Promise.resolve(1)),
      };

      const fakeDB = {
        getModel: jest.fn(() => {
          return { kind: 'singleType' };
        }),
        query: jest.fn(() => fakeQuery),
      };

      const instance = createEntityService({
        db: fakeDB,
        eventHub: new EventEmitter(),
      });

      await expect(
        instance.create({ data: {} }, { model: 'test-model' })
      ).rejects.toThrow('Single type entry can only be created once');

      expect(fakeDB.getModel).toHaveBeenCalledTimes(1);
      expect(fakeDB.getModel).toHaveBeenCalledWith('test-model');

      expect(fakeDB.query).toHaveBeenCalledWith('test-model');
      expect(fakeQuery.count).toHaveBeenCalled();
    });
  });
});
