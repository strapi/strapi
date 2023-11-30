import type { LoadedStrapi as Strapi, Common } from '@strapi/types';

export default ({ strapi }: { strapi: Strapi }) => ({
  async getAvailableLocales(
    id: string,
    uid: Common.UID.ContentType,
    opts: { locale: string; status: string }
  ) {
    if (!opts.locale) return [];

    // TODO: Use document service instead of query engine
    // Find other locales of the document in the same status
    return strapi.db.query(uid).findMany({
      where: {
        documentId: id,
        // Omit current one
        locale: { $ne: opts.locale },
        // Find locales of the same status
        publishedAt: opts.status === 'published' ? { $ne: null } : null,
      },
      select: ['id', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    });
  },

  async getAvailableStatus(
    id: string,
    uid: Common.UID.ContentType,
    opts: { locale: string; status: string }
  ) {
    if (!opts.locale) return null;

    // Find if the other status of the document is available
    const otherStatus = opts.status === 'published' ? 'draft' : 'published';

    return strapi.documents(uid).findOne(id, {
      locale: opts.locale,
      status: otherStatus,
      fields: ['id', 'updatedAt', 'createdAt', 'publishedAt'],
    });
  },

  /**
   * Returns associated metadata of a document:
   * - Available locales of the document for the current status
   * - Available status of the document for the current locale
   */
  async getMetadata(
    id: string,
    uid: Common.UID.ContentType,
    opts: { locale: string; status: string }
  ) {
    const [availableLocales, availableStatus] = await Promise.all([
      this.getAvailableLocales(id, uid, opts),
      this.getAvailableStatus(id, uid, opts),
    ]);

    return {
      availableLocales,
      availableStatus: availableStatus ? [availableStatus] : [],
    };
  },
});
