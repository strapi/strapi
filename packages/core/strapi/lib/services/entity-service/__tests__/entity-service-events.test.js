'use strict';

const createEntityService = require('..');
const entityValidator = require('../../entity-validator');

describe('Entity service triggers webhooks', () => {
  let instance;
  const eventHub = { emit: jest.fn() };
  let entity = { attr: 'value' };

  beforeAll(() => {
    const model = {
      uid: 'api::test.test',
      kind: 'singleType',
      modelName: 'test-model',
      privateAttributes: [],
      attributes: {
        attr: { type: 'string' },
      },
    };
    instance = createEntityService({
      strapi: {
        getModel: () => model,
      },
      db: {
        transaction: (cb) => cb(),
        query: () => ({
          count: () => 0,
          create: ({ data }) => data,
          update: ({ data }) => data,
          findOne: () => entity,
          findMany: () => [entity, entity],
          delete: () => ({}),
          deleteMany: () => ({}),
        }),
      },
      eventHub,
      entityValidator,
    });

    global.strapi = {
      getModel: () => model,
      config: {
        get: () => [],
      },
    };
  });

  test('Emit event: Create', async () => {
    // Create entity
    await instance.create('test-model', { data: entity });

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.create', {
      entry: entity,
      model: 'test-model',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Update', async () => {
    // Update entity
    await instance.update('test-model', 'entity-id', { data: entity });

    // Expect entry.update event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.update', {
      entry: entity,
      model: 'test-model',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Delete', async () => {
    // Delete entity
    await instance.delete('test-model', 'entity-id', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.delete', {
      entry: entity,
      model: 'test-model',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Delete Many', async () => {
    // Delete entity
    await instance.deleteMany('test-model', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.delete', {
      entry: entity,
      model: 'test-model',
    });
    // One event per each entity deleted
    expect(eventHub.emit).toHaveBeenCalledTimes(2);

    eventHub.emit.mockClear();
  });

  test('Do not emit event when no deleted entity', async () => {
    entity = null;
    // Delete non existent entity
    await instance.delete('test-model', 'entity-id', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledTimes(0);

    eventHub.emit.mockClear();
  });
});
