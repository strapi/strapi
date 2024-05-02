import type { Core } from '@strapi/types';
import { auditLog } from './models/audit-logs';

interface Event {
  action: string;
  date: Date;
  userId: string | number;
  payload: Record<string, unknown>;
}

interface Log extends Omit<Event, 'userId'> {
  user: string | number;
}

export default {
  async register({ strapi }: { strapi: Core.Strapi }) {
    strapi.get('models').add(auditLog);

    // Return the provider object
    return {
      async saveEvent(event: Event) {
        const { userId, ...rest } = event;

        const auditLog: Log = { ...rest, user: userId };

        // Save to database
        await strapi.db?.query('admin::audit-log').create({ data: auditLog });

        return this;
      },

      findMany(query: Record<string, unknown>) {
        return strapi.db?.query('admin::audit-log').findPage({
          populate: ['user'],
          select: ['action', 'date', 'payload'],
          ...strapi.get('query-params').transform('admin::audit-log', query),
        });
      },

      findOne(id: `${number}` | number) {
        return strapi.db?.query('admin::audit-log').findOne({
          where: { id },
          populate: ['user'],
          select: ['action', 'date', 'payload'],
        });
      },

      deleteExpiredEvents(expirationDate: Date) {
        return strapi.db?.query('admin::audit-log').deleteMany({
          where: {
            date: {
              $lt: expirationDate.toISOString(),
            },
          },
        });
      },
    };
  },
};
