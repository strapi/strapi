import { Writable } from 'stream';
import type { Core } from '@strapi/types';

import { createLocalStrapiDestinationProvider } from '../index';
import type { IEntity, ILink } from '../../../../../types';

/**
 * Exercises the entities -> links contract through the real destination
 * provider so both stages share the provider's private `#entitiesMapper`.
 *
 * The focused unit tests (restore-entities / restore-links) each mock that
 * shared mapper, so they cannot catch a mismatch between what the entities
 * stage records and what the links stage looks up. Here only the database
 * writes (`create` / link `insert`) are mocked; the mapper wiring is real.
 *
 * The behaviour under test: a relation whose component side was never recreated
 * on the destination (an orphaned component) must be skipped rather than
 * inserted with the raw source id, which would violate a foreign key constraint
 * and abort the whole restore transaction on PostgreSQL.
 */

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

const insert = jest.fn();

jest.mock('../../../queries/link', () => ({
  createLinkQuery: jest.fn(() => () => ({ insert })),
}));

afterEach(() => {
  jest.clearAllMocks();
});

const componentUID = 'test.comp';
const fooUID = 'api::foo.foo';
const barUID = 'api::bar.bar';

// bar is the relation target and keeps the same mapping across every test
const BAR_SOURCE_ID = 5;
const BAR_DEST_ID = 55;

const schemas: Record<string, unknown> = {
  [fooUID]: {
    uid: fooUID,
    kind: 'collectionType',
    modelType: 'contentType',
    attributes: {
      title: { type: 'string' },
      comp: { type: 'component', repeatable: false, component: componentUID },
    },
  },
  [barUID]: {
    uid: barUID,
    kind: 'collectionType',
    modelType: 'contentType',
    attributes: {
      name: { type: 'string' },
    },
  },
  [componentUID]: {
    uid: componentUID,
    modelType: 'component',
    attributes: {
      name: { type: 'string' },
    },
  },
};

// `createTransaction` drives an attach() loop until `end()` is emitted; this
// stub just runs that loop synchronously against a throwaway trx.
const transaction = jest.fn(async (cb) => {
  const trx = {};
  const rollback = jest.fn();
  // eslint-disable-next-line node/no-callback-literal
  await cb({ trx, rollback });
});

const buildStrapi = () =>
  ({
    getModel: jest.fn((uid: string) => schemas[uid]),
    db: {
      transaction,
      lifecycles: { enable: jest.fn(), disable: jest.fn() },
    },
    destroy: jest.fn(),
  }) as unknown as Core.Strapi;

const writeChunk = (stream: Writable, chunk: IEntity | ILink) =>
  new Promise<void>((resolve, reject) => {
    stream.once('error', reject);
    stream.write(chunk, (error) => (error ? reject(error) : resolve()));
  });

const aComponentLink = (componentRef: number): ILink =>
  ({
    kind: 'relation.basic',
    relation: 'oneToOne',
    left: { type: componentUID, ref: componentRef, field: 'related' },
    right: { type: barUID, ref: BAR_SOURCE_ID },
  }) as ILink;

describe('restore mapper integration (entities -> links)', () => {
  const bootstrapProvider = async () => {
    const strapi = buildStrapi();
    const onWarning = jest.fn();

    const provider = createLocalStrapiDestinationProvider({
      getStrapi: () => strapi,
      autoDestroy: false,
      strategy: 'restore',
      restore: { entities: { exclude: [] } },
    });
    provider.onWarning = onWarning;

    await provider.bootstrap();

    return { provider, onWarning };
  };

  /**
   * Restore a `foo` carrying one component, then the `bar` it relates to, so the
   * shared mapper ends up with foo, bar and the component instance. `compDestId`
   * lets a test cover both a changed and an unchanged component id.
   */
  const restoreSourceData = async (
    provider: ReturnType<typeof createLocalStrapiDestinationProvider>,
    { compSourceId, compDestId }: { compSourceId: number; compDestId: number }
  ) => {
    create.mockResolvedValueOnce({ id: 100, comp: { id: compDestId } });
    create.mockResolvedValueOnce({ id: BAR_DEST_ID });

    await writeChunk(provider.createEntitiesWriteStream(), {
      type: fooUID,
      id: 1,
      data: { title: 'foo', comp: { id: compSourceId, name: 'component' } },
    } as IEntity);
    await writeChunk(provider.createEntitiesWriteStream(), {
      type: barUID,
      id: BAR_SOURCE_ID,
      data: { name: 'bar' },
    } as IEntity);
  };

  test('inserts a relation with both sides resolved to their destination ids', async () => {
    const { provider, onWarning } = await bootstrapProvider();
    await restoreSourceData(provider, { compSourceId: 7, compDestId: 21 });

    const linksStream = await provider.createLinksWriteStream();
    await writeChunk(linksStream, aComponentLink(7));

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.objectContaining({ ref: 21 }),
        right: expect.objectContaining({ ref: BAR_DEST_ID }),
      })
    );
    expect(onWarning).not.toHaveBeenCalled();

    provider.transaction?.end();
  });

  test('resolves a relation to a component whose id did not change on the destination', async () => {
    const { provider, onWarning } = await bootstrapProvider();

    // A component can be recreated with the same id it had in the source. The
    // mapper must still record that identity mapping, otherwise the links stage
    // cannot tell the (transferred) component apart from an orphaned one and
    // would skip a perfectly valid relation.
    await restoreSourceData(provider, { compSourceId: 8, compDestId: 8 });

    const linksStream = await provider.createLinksWriteStream();
    await writeChunk(linksStream, aComponentLink(8));

    expect(onWarning).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.objectContaining({ ref: 8 }),
        right: expect.objectContaining({ ref: BAR_DEST_ID }),
      })
    );

    provider.transaction?.end();
  });

  test('skips a relation to a component that was never transferred', async () => {
    const { provider, onWarning } = await bootstrapProvider();
    await restoreSourceData(provider, { compSourceId: 7, compDestId: 21 });

    const linksStream = await provider.createLinksWriteStream();

    // Component 999 has no mapping because it was never restored (its parent
    // entity was gone in the source). The relation must be dropped before
    // reaching the database rather than inserted with the unmapped source id.
    await writeChunk(linksStream, aComponentLink(999));

    expect(insert).not.toHaveBeenCalled();
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining(`${componentUID}:999`));
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('was not transferred during the entities stage')
    );

    provider.transaction?.end();
  });
});
