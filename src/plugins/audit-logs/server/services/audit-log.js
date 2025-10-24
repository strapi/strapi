'use strict';

const _ = require('lodash');

module.exports = ({ strapi }) => ({
  async createLog({ user, contentType, entityId, action, payload }) {
    const excludeList = strapi.config.get('plugin.audit-logs.excludeContentTypes', []);
    if (excludeList.includes(contentType)) return;

    const model = strapi.db.query('plugin::audit-logs.audit-log');

    const log = {
      contentType,
      recordId: entityId,
      action,
      user: user ? user.id || user.username : 'anonymous',
      payload: JSON.stringify(payload || {}),
      createdAt: new Date(),
    };

    await model.create({ data: log });
  },

  async find(filters) {
    const { page = 1, pageSize = 10, sort = 'createdAt:desc', ...rest } = filters;

    const [sortField, sortOrder] = sort.split(':');
    const qb = strapi.db.query('plugin::audit-logs.audit-log');

    const where = {};

    if (rest.contentType) where.contentType = rest.contentType;
    if (rest.user) where.user = rest.user;
    if (rest.action) where.action = rest.action;
    if (rest.startDate && rest.endDate) {
      where.createdAt = {
        $between: [new Date(rest.startDate), new Date(rest.endDate)],
      };
    }

    const total = await qb.count({ where });
    const data = await qb.findMany({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: { [sortField]: sortOrder },
    });

    return {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      },
    };
  },
});

