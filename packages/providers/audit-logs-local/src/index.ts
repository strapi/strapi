import type { Strapi } from '@strapi/strapi';
import auditLogContentType from './content-types/audit-log';

interface Event {
  action: string;
  date: Date;
  userId: string | number;
  payload: Record<string, unknown>;
}

interface Log extends Omit<Event, 'userId'> {
  user: string | number;
}

export = {
  async register({ strapi }: { strapi: Strapi }) {
    const contentTypes = strapi.container.get('content-types');
    if (!contentTypes.keys().includes('admin::audit-log')) {
      strapi.container.get('content-types').add('admin::', { 'audit-log': auditLogContentType });
    }

    // Return the provider object
    return {
      async saveEvent(event: Event) {
        const { userId, ...rest } = event;

        const auditLog: Log = { ...rest, user: userId };

        // Save to database
        await strapi.entityService.create('admin::audit-log', { data: auditLog });

        return this;
      },

      findMany(query: Record<string, unknown>) {
        return strapi.entityService.findPage('admin::audit-log', {
          populate: ['user'],
          fields: ['action', 'date', 'payload'],
          ...query,
        });
      },

      findOne(id: string | number) {
        return strapi.entityService.findOne('admin::audit-log', id, {
          populate: ['user'],
          fields: ['action', 'date', 'payload'],
        });
      },

      deleteExpiredEvents(expirationDate: Date) {
        return strapi.entityService.deleteMany('admin::audit-log', {
          filters: {
            date: {
              $lt: expirationDate.toISOString(),
            },
          },
        });
      },
    };
  },
};
