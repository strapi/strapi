'use strict';

jest.mock('bcryptjs', () => ({ hashSync: () => 'secret-password' }));

const createEntityService = require('../');
const entityValidator = require('../../entity-validator');

describe('Entity service triggers webhooks', () => {
  global.strapi = {
    getModel: () => ({}),
    config: {
      get: () => [],
    },
  };

  let instance;
  let eventHub = { emit: jest.fn() };
  let fakeDB = {
    query: () => ({
      count: () => 0,
      create: ({ data }) => data,
      update: ({ data }) => data,
      findOne: () => ({ attr: 'value' }),
      findMany: () => [{ attr: 'value' }, { attr: 'value2' }],
      delete: () => ({}),
      deleteMany: () => ({}),
    }),
  };

  beforeAll(() => {
    instance = createEntityService({
      strapi: {
        getModel: () => ({
          kind: 'singleType',
          modelName: 'test-model',
          privateAttributes: [],
          attributes: {
            attr: { type: 'string' },
          },
        }),
      },
      db: fakeDB,
      eventHub,
      entityValidator,
    });
  });

  test('Emit event: Create', async () => {
    const data = { attr: 'value' };

    // Create entity
    await instance.create('test-model', { data });

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.create', {
      entry: data,
      model: 'test-model',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Update', async () => {
    const data = { attr: 'value' };

    // Update entity
    await instance.update('test-model', 'entity-id', { data });

    // Expect entry.update event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.update', {
      entry: data,
      model: 'test-model',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Delete', async () => {
    // Delete entity
    await instance.delete('test-model', 'entity-id', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.delete', {
      entry: { attr: 'value' },
      model: 'test-model',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Delete Many', async () => {
    // Delete entity
    await instance.deleteMany('test-model', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.delete', {
      entry: { attr: 'value' },
      model: 'test-model',
    });
    // One event per each entity deleted
    expect(eventHub.emit).toHaveBeenCalledTimes(2);

    eventHub.emit.mockClear();
  });

  test('Do not emit event when no deleted entity', async () => {
    fakeDB.query = () => ({ findOne: () => null });
    // Delete entity
    await instance.delete('test-model', 'entity-id', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledTimes(0);

    eventHub.emit.mockClear();
  });
});
