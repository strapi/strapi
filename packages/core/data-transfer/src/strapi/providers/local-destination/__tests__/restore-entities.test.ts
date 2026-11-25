import { Writable } from 'stream';
import type { Core } from '@strapi/types';

import { createEntitiesWriteStream } from '../strategies/restore/entities';
import type { IEntity, Transaction } from '../../../../../types';

const create = jest.fn();
const getDeepPopulateComponentLikeQuery = jest.fn(() => ({}));

jest.mock('../../../queries', () => ({
  entity: {
    createEntityQuery: jest.fn(() => () => ({
      create,
      getDeepPopulateComponentLikeQuery,
    })),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

const componentUID = 'test.comp';

const schemas: Record<string, unknown> = {
  'api::foo.foo': {
    uid: 'api::foo.foo',
    kind: 'collectionType',
    modelType: 'contentType',
    attributes: {
      title: { type: 'string' },
      comp: { type: 'component', repeatable: false, component: componentUID },
    },
  },
  [componentUID]: {
    uid: componentUID,
    modelType: 'component',
    attributes: {
      title: { type: 'string' },
    },
  },
};

const strapi = {
  getModel: jest.fn((uid: string) => schemas[uid]),
} as unknown as Core.Strapi;

const transaction = {
  attach: jest.fn(async (callback: () => unknown) => callback()),
  end: jest.fn(),
  rollback: jest.fn(),
} as unknown as Transaction;

const writeEntity = (stream: Writable, entity: IEntity) =>
  new Promise<void>((resolve, reject) => {
    // Consume the stream error event to avoid unhandled error failures
    stream.once('error', reject);
    stream.write(entity, (error) => (error ? reject(error) : resolve()));
  });

describe('createEntitiesWriteStream', () => {
  test('Should map the entity ID and the changed component ID', async () => {
    create.mockResolvedValueOnce({ id: 9, comp: { id: 21 } });

    const updateMappingTable = jest.fn();
    const stream = createEntitiesWriteStream({ strapi, updateMappingTable, transaction });

    await writeEntity(stream, {
      type: 'api::foo.foo',
      id: 1,
      data: { title: 'hello', comp: { id: 7, title: 'component' } },
    } as IEntity);

    expect(updateMappingTable).toHaveBeenCalledWith('api::foo.foo', 1, 9);
    expect(updateMappingTable).toHaveBeenCalledWith(componentUID, 7, 21);
  });

  test('Should map component IDs even when they did not change', async () => {
    create.mockResolvedValueOnce({ id: 9, comp: { id: 7 } });

    const updateMappingTable = jest.fn();
    const stream = createEntitiesWriteStream({ strapi, updateMappingTable, transaction });

    await writeEntity(stream, {
      type: 'api::foo.foo',
      id: 1,
      data: { title: 'hello', comp: { id: 7, title: 'component' } },
    } as IEntity);

    // The unchanged component ID must still be registered so that the links
    // stage can tell transferred components apart from orphaned ones
    expect(updateMappingTable).toHaveBeenCalledWith(componentUID, 7, 7);
  });

  test('Should propagate creation errors', async () => {
    create.mockRejectedValueOnce(new Error('creation failed'));

    const updateMappingTable = jest.fn();
    const stream = createEntitiesWriteStream({ strapi, updateMappingTable, transaction });

    await expect(
      writeEntity(stream, {
        type: 'api::foo.foo',
        id: 1,
        data: { title: 'hello' },
      } as IEntity)
    ).rejects.toThrow('creation failed');

    expect(updateMappingTable).not.toHaveBeenCalled();
  });
});
