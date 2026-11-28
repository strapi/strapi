import { describe, it, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { setDefaultLocaleToRelations } from '../relations/transform/default-locale';

const POST_UID = 'api::post.post';
const TAG_UID = 'api::tag.tag';

const models: Record<string, any> = {
  [POST_UID]: {
    uid: POST_UID,
    modelType: 'contentType',
    attributes: {
      title: { type: 'string' },
      tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
      author: { type: 'relation', relation: 'manyToOne', target: TAG_UID },
    },
  },
  [TAG_UID]: {
    uid: TAG_UID,
    modelType: 'contentType',
    attributes: { name: { type: 'string' } },
  },
};

/**
 * The default locale is read from the database, and relations are mapped concurrently. Inside a
 * transaction every query is bound to the transaction's single connection, so the lookup must be
 * issued once however many relations need it.
 */
describe('Default locale of relations', () => {
  const setup = () => {
    const getDefaultLocale = vi.fn(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      return 'en';
    });

    global.strapi = {
      getModel: (uid: string) => models[uid],
      localization: { isLocalizedContentType: () => false, getDefaultLocale },
    } as unknown as Core.Strapi;

    return { getDefaultLocale };
  };

  it('looks the default locale up once for every relation that needs it', async () => {
    const { getDefaultLocale } = setup();

    const data = await setDefaultLocaleToRelations(
      {
        title: 'Hello',
        tags: { connect: [{ documentId: 'a' }, { documentId: 'b' }, { documentId: 'c' }] },
        author: { documentId: 'd' },
      },
      POST_UID
    );

    expect(getDefaultLocale).toHaveBeenCalledTimes(1);
    expect(data.tags.connect).toEqual([
      { documentId: 'a', locale: 'en' },
      { documentId: 'b', locale: 'en' },
      { documentId: 'c', locale: 'en' },
    ]);
    expect(data.author.set).toEqual([{ documentId: 'd', locale: 'en' }]);
  });

  it('does not look the default locale up when no relation needs it', async () => {
    const { getDefaultLocale } = setup();

    await setDefaultLocaleToRelations(
      { title: 'Hello', tags: { connect: [{ documentId: 'a', locale: 'fr' }] } },
      POST_UID
    );

    expect(getDefaultLocale).not.toHaveBeenCalled();
  });
});
