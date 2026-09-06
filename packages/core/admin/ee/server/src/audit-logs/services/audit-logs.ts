import type { Core } from '@strapi/types';

import { getDisplayName } from '../utils';

interface Event {
  action: string;
  date: Date;
  // Null for actions no person performed, such as a scheduled job
  userId: string | number | null;
  payload: Record<string, unknown>;
}

interface Log extends Omit<Event, 'userId'> {
  user: string | number | null;
}

const getSanitizedUser = (user: any) => {
  return {
    id: user.id,
    email: user.email,
    displayName: getDisplayName(user),
  };
};

/**
 * @description
 * Manages audit logs interaction with the database. Accessible via strapi.get('audit-logs')
 */
const createAuditLogsService = (strapi: Core.Strapi) => {
  return {
    async saveEvent(event: Event) {
      const { userId, ...rest } = event;

      const auditLog: Log = { ...rest, user: userId };

      // Save to database
      await strapi.db.query('admin::audit-log').create({ data: auditLog });

      return this;
    },

    async findMany(query: unknown) {
      // NOTE: We get the IDs first because sorting full rows runs MySQL/MariaDB out of sort memory
      // See: https://github.com/strapi/strapi/issues/27399
      const { results: logRows, pagination } = await strapi.db.query('admin::audit-log').findPage({
        ...strapi.get('query-params').transform('admin::audit-log', query),
        select: ['id'],
      });

      const ids = logRows.map((log) => log.id);
      const logs = ids.length
        ? await strapi.db.query('admin::audit-log').findMany({
            where: { id: { $in: ids } },
            populate: ['user'],
            select: ['action', 'date', 'payload'],
          })
        : [];
      const logsById = new Map(logs.map((log) => [log.id, log]));
      const results = ids.map((id) => logsById.get(id)).filter(Boolean);

      const sanitizedResults = results.map((result: any) => {
        const { user, ...rest } = result;
        return {
          ...rest,
          user: user ? getSanitizedUser(user) : null,
        };
      });

      return {
        results: sanitizedResults,
        pagination,
      };
    },

    async findManyUsers(query: { page?: number | string; pageSize?: number | string }) {
      const { page = 1, pageSize = 10 } = query;

      const userAttribute = strapi.db.metadata.get('admin::audit-log').attributes.user;

      if (
        userAttribute?.type !== 'relation' ||
        !('joinTable' in userAttribute) ||
        !userAttribute.joinTable ||
        !('inverseJoinColumn' in userAttribute.joinTable)
      ) {
        throw new Error('The audit log user relation is expected to use a join table');
      }

      const { joinTable } = userAttribute;

      const authorIds = await strapi.db
        .connection(joinTable.name)
        .distinct(joinTable.inverseJoinColumn.name)
        .pluck(joinTable.inverseJoinColumn.name);

      const { results, pagination } = await strapi.db.query('admin::user').findPage({
        select: ['id', 'email', 'username', 'firstname', 'lastname'],
        where: { id: { $in: authorIds } },
        orderBy: { id: 'asc' },
        page: Number(page),
        pageSize: Number(pageSize),
      });

      return {
        results: results.map(getSanitizedUser),
        pagination,
      };
    },

    async findOne(id: unknown) {
      const result: any = await strapi.db.query('admin::audit-log').findOne({
        where: { id },
        populate: ['user'],
        select: ['action', 'date', 'payload'],
      });

      if (!result) {
        return null;
      }

      const { user, ...rest } = result;
      return {
        ...rest,
        user: user ? getSanitizedUser(user) : null,
      };
    },

    deleteExpiredEvents(expirationDate: Date) {
      return strapi.db.query('admin::audit-log').deleteMany({
        where: {
          date: {
            $lt: expirationDate.toISOString(),
          },
        },
      });
    },
  };
};

export { createAuditLogsService };
