import type { Core } from '@strapi/types';
import { createIdMap } from '../id-map';

const AUTHOR_UID = 'api::author.author';
const CATEGORY_UID = 'api::category.category';
const TAG_UID = 'api::tag.tag';

/**
 * `load` runs one `findMany` per uid/locale group. Inside a transaction every query is bound to
 * the transaction's single connection, so the groups must load one after another there, and keep
 * fanning out over the pool outside one.
 */
describe('Id map | Transaction', () => {
  /**
   * A strapi double whose `findMany` records how many group loads are in flight at once. Every
   * query takes a tick to resolve, so concurrent loads overlap and sequential ones do not.
   */
  const setup = (inTransaction: boolean) => {
    let inFlight = 0;
    let maxInFlight = 0;

    const findMany = async ({ where }: any) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      inFlight -= 1;

      return where.documentId.$in.map((documentId: string, index: number) => ({
        id: index + 1,
        documentId,
        locale: null,
        publishedAt: null,
      }));
    };

    global.strapi = {
      db: {
        query: () => ({ findMany }),
        inTransaction: () => inTransaction,
      },
      getModel: () => ({ options: { draftAndPublish: false } }),
      localization: { isLocalizedContentType: () => false },
    } as unknown as Core.Strapi;

    const idMap = createIdMap({ strapi: global.strapi });

    idMap.add({ uid: AUTHOR_UID, documentId: 'Author1' });
    idMap.add({ uid: CATEGORY_UID, documentId: 'Category1' });
    idMap.add({ uid: TAG_UID, documentId: 'Tag1' });

    return { idMap, getMaxInFlight: () => maxInFlight };
  };

  const expectLoaded = (idMap: ReturnType<typeof createIdMap>) => {
    expect(idMap.get({ uid: AUTHOR_UID, documentId: 'Author1' })).toEqual(1);
    expect(idMap.get({ uid: CATEGORY_UID, documentId: 'Category1' })).toEqual(1);
    expect(idMap.get({ uid: TAG_UID, documentId: 'Tag1' })).toEqual(1);
  };

  it('loads the uid groups in parallel outside a transaction', async () => {
    const { idMap, getMaxInFlight } = setup(false);

    await idMap.load();

    expect(getMaxInFlight()).toBe(3);
    expectLoaded(idMap);
  });

  it('loads the uid groups one at a time inside a transaction', async () => {
    const { idMap, getMaxInFlight } = setup(true);

    await idMap.load();

    expect(getMaxInFlight()).toBe(1);
    expectLoaded(idMap);
  });
});
