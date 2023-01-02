'use strict';

const localProvider = require('@strapi/provider-audit-logs-local');
const { scheduleJob } = require('node-schedule');
const { getService } = require('../../../server/utils');

const defaultEvents = [
  'entry.create',
  'entry.update',
  'entry.delete',
  'entry.publish',
  'entry.unpublish',
  'media.create',
  'media.update',
  'media.delete',
  'user.create',
  'user.update',
  'user.delete',
  'admin.auth.success',
  'admin.logout',
  'content-type.create',
  'content-type.update',
  'content-type.delete',
  'component.create',
  'component.update',
  'component.delete',
  'role.create',
  'role.update',
  'role.delete',
  'permission.create',
  'permission.update',
  'permission.delete',
];

const getEventMap = (defaultEvents) => {
  const getDefaultPayload = (...args) => args[0];

  // Use the default payload for all default events
  return defaultEvents.reduce((acc, event) => {
    acc[event] = getDefaultPayload;
    return acc;
  }, {});
};

const createAuditLogsService = (strapi) => {
  // NOTE: providers should be able to replace getEventMap to add or remove events
  const eventMap = getEventMap(defaultEvents);

  const processEvent = (name, ...args) => {
    const getPayload = eventMap[name];

    // Ignore the event if it's not in the map
    if (!getPayload) {
      return null;
    }

    return {
      action: name,
      date: new Date().toISOString(),
      payload: getPayload(...args) || {},
      userId: strapi.requestContext.get()?.state?.user?.id,
    };
  };

  async function handleEvent(name, ...args) {
    const processedEvent = processEvent(name, ...args);

    if (processedEvent) {
      await this._provider.saveEvent(processedEvent);
    }
  }

  return {
    async register() {
      this._provider = await localProvider.register({ strapi });
      this._eventHubUnsubscribe = strapi.eventHub.subscribe(handleEvent.bind(this));
      this._deleteExpiredsJob = scheduleJob('0 0 * * *', () =>
        this._provider.deleteExpiredEvents()
      );
      return this;
    },

    async findMany(query) {
      const { results, pagination } = await this._provider.findMany(query);

      const sanitizedResults = results.map((result) => {
        const { user, ...rest } = result;
        return {
          ...rest,
          user: user ? getService('user').sanitizeUser(user) : null,
        };
      });

      return {
        results: sanitizedResults,
        pagination,
      };
    },

    async findOne(id) {
      const result = await this._provider.findOne(id);

      if (!result) {
        return null;
      }

      const { user, ...rest } = result;
      return {
        ...rest,
        user: user ? getService('user').sanitizeUser(user) : null,
      };
    },

    unsubscribe() {
      if (this._eventHubUnsubscribe) {
        this._eventHubUnsubscribe();
      }

      if (this._deleteExpiredsJob) {
        this._deleteExpiredsJob.cancel();
      }

      return this;
    },

    destroy() {
      return this.unsubscribe();
    },
  };
};

module.exports = createAuditLogsService;
