'use strict';

module.exports = ({ strapi }) => ({
  async find(params) {
    // params may contain filters, pagination, sort
    const query = { ...params };
    // @ts-ignore - Strapi UID string
    const results = await strapi.entityService.findMany('api::audit-log.audit-log', query);
    return results;
  },
});
