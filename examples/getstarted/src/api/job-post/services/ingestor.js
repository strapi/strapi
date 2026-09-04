'use strict';

/**
 * @typedef {{
 *   objectID: string | number;
 *   title?: string;
 *   url?: string;
 * }} HackerNewsHit
 */

module.exports = {
  // Safe sync logic for one item
  /**
   * @param {HackerNewsHit} data
   */
  async syncOne(data) {
    try {
      // 1. Check if ID exists
      const existing = await strapi.documents('api::job-post.job-post').findFirst({
        filters: { externalId: data.objectID.toString() },
      });

      if (existing) {
        return { status: 'skipped', id: data.objectID };
      }

      // 2. Create if new
      await strapi.documents('api::job-post.job-post').create({
        data: {
          title: data.title,
          url: data.url || `https://news.ycombinator.com/item?id=${data.objectID}`,
          externalId: data.objectID.toString(),
        },
        status: 'published',
      });

      return { status: 'created', id: data.objectID };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'failed', id: data.objectID, error: message };
    }
  },
};
