'use strict';

module.exports = ({ strapi }) => ({
  /**
   * Create a new audit log entry
   */
  async logAction({ action, contentType, recordId, payload, actor }) {
    try {
      await strapi.entityService.create('plugin::audit-log.audit-log', {
        data: {
          action,
          contentType,
          recordId: String(recordId),
          payload,
          actorId: actor ? String(actor.id) : null,
          actorType: actor ? actor.type : null,
          publishedAt: new Date(), // Manually publish
        },
      });
    } catch (e) {
      console.error('Failed to create audit log:', e);
    }
  },

  /**
   * Find audit log entries
   * Strapi's query engine automatically handles filtering, sorting, and pagination
   * from the query object.
   */
  async find(query) {
    return await strapi.entityService.findMany(
      'plugin::audit-log.audit-log',
      query
    );
  },
});
