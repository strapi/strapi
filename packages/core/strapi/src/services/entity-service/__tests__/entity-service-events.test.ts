import createEntityService from '..';
import entityValidator from '../../entity-validator';

describe('Entity service triggers webhooks', () => {
  let instance: any;
  const eventHub = { emit: jest.fn() };
  let entity: unknown = { attr: 'value' };

  beforeAll(() => {
    const model = {
      uid: 'api::test.test',
      kind: 'singleType',
      modelName: 'test-model',
      attributes: {
        attr: { type: 'string' },
      },
    };
    instance = createEntityService({
      strapi: {
        getModel: () => model,
        webhookStore: {
          addAllowedEvent: jest.fn(),
        },
      },
      db: {
        transaction: (cb: any) => cb(),
        query: () => ({
          count: () => 0,
          create: ({ data }: any) => data,
          update: ({ data }: any) => data,
          findOne: () => entity,
          findMany: () => [entity, entity],
          delete: () => ({}),
          deleteMany: () => ({}),
        }),
      },
      eventHub,
      entityValidator,
    } as any);

    global.strapi = {
      getModel: () => model,
    } as any;
  });

  test('Emit event: Create', async () => {
    // Create entity
    await instance.create('api::test.test-model', { data: entity });

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.create', {
      entry: entity,
      model: 'test-model',
      uid: 'api::test.test',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Update', async () => {
    // Update entity
    await instance.update('api::test.test-model', 'entity-id', { data: entity });

    // Expect entry.update event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.update', {
      entry: entity,
      model: 'test-model',
      uid: 'api::test.test',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Delete', async () => {
    // Delete entity
    await instance.delete('api::test.test-model', 'entity-id', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.delete', {
      entry: entity,
      model: 'test-model',
      uid: 'api::test.test',
    });

    eventHub.emit.mockClear();
  });

  test('Emit event: Delete Many', async () => {
    // Delete entity
    await instance.deleteMany('api::test.test-model', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledWith('entry.delete', {
      entry: entity,
      model: 'test-model',
      uid: 'api::test.test',
    });
    // One event per each entity deleted
    expect(eventHub.emit).toHaveBeenCalledTimes(2);

    eventHub.emit.mockClear();
  });

  test('Do not emit event when no deleted entity', async () => {
    entity = null;
    // Delete non existent entity
    await instance.delete('api::test.test-model', 'entity-id', {});

    // Expect entry.create event to be emitted
    expect(eventHub.emit).toHaveBeenCalledTimes(0);

    eventHub.emit.mockClear();
  });
});
