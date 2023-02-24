'use strict';

const localProvider = require('@strapi/provider-audit-logs-local');
const { scheduleJob } = require('node-schedule');
const { features } = require('@strapi/strapi/lib/utils/ee');

const DEFAULT_RETENTION_DAYS = 90;

const defaultEvents = [
  'entry.create',
  'entry.update',
  'entry.delete',
  'entry.publish',
  'entry.unpublish',
  'media.create',
  'media.update',
  'media.delete',
  'media-folder.create',
  'media-folder.update',
  'media-folder.delete',
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

const getSanitizedUser = (user) => ({
  id: user.id,
  email: user.email,
  fullname: `${user.firstname} ${user.lastname}`,
});

const getEventMap = (defaultEvents) => {
  const getDefaultPayload = (...args) => args[0];

  // Use the default payload for all default events
  return defaultEvents.reduce((acc, event) => {
    acc[event] = getDefaultPayload;
    return acc;
  }, {});
};

const getRetentionDays = (strapi) => {
  const licenseRetentionDays = features.get('audit-logs')?.options.retentionDays;
  const userRetentionDays = strapi.config.get('admin.auditLogs.retentionDays');

  // For enterprise plans, use 90 days by default, but allow users to override it
  if (licenseRetentionDays == null) {
    return userRetentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  // Allow users to override the license retention days, but not to increase it
  if (userRetentionDays && userRetentionDays < licenseRetentionDays) {
    return userRetentionDays;
  }

  // User didn't provide a retention days value, use the license one
  return licenseRetentionDays;
};

const createAuditLogsService = (strapi) => {
  // NOTE: providers should be able to replace getEventMap to add or remove events
  const eventMap = getEventMap(defaultEvents);

  const processEvent = (name, ...args) => {
    const state = strapi.requestContext.get()?.state;

    // Ignore events with auth strategies different from admin
    const isUsingAdminAuth = state?.auth?.strategy.name === 'admin';
    const user = state?.user;

    if (!isUsingAdminAuth || !user) {
      return null;
    }

    const getPayload = eventMap[name];

    // Ignore the event if it's not in the map
    if (!getPayload) {
      return null;
    }

    // Ignore some events based on payload
    const ignoredUids = ['plugin::upload.file', 'plugin::upload.folder'];
    if (ignoredUids.includes(args[0]?.uid)) {
      return null;
    }

    return {
      action: name,
      date: new Date().toISOString(),
      payload: getPayload(...args) || {},
      userId: user.id,
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
      // Handle license being enabled
      if (!this._eeEnableUnsubscribe) {
        this._eeEnableUnsubscribe = strapi.eventHub.once('ee.enable', () => {
          // Recreate the service to use the new license info
          this.destroy();
          this.register();
        });
      }

      // Handle license being updated
      this._eeUpdateUnsubscribe = strapi.eventHub.on('ee.update', () => {
        // Recreate the service to use the new license info
        this.destroy();
        this.register();
      });

      // Handle license being disabled
      this._eeDisableUnsubscribe = strapi.eventHub.on('ee.disable', () => {
        // Turn off service when the license gets disabled
        // Only the ee.enable listener remains active to recreate the service
        this.destroy();
      });

      // Check current state of license
      if (!features.isEnabled('audit-logs')) {
        return this;
      }

      // Start saving events
      this._provider = await localProvider.register({ strapi });
      this._eventHubUnsubscribe = strapi.eventHub.subscribe(handleEvent.bind(this));

      // Manage audit logs auto deletion
      const retentionDays = getRetentionDays(strapi);
      this._deleteExpiredJob = scheduleJob('0 0 * * *', () => {
        const expirationDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        this._provider.deleteExpiredEvents(expirationDate);
      });

      return this;
    },

    async findMany(query) {
      const { results, pagination } = await this._provider.findMany(query);

      const sanitizedResults = results.map((result) => {
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

    async findOne(id) {
      const result = await this._provider.findOne(id);

      if (!result) {
        return null;
      }

      const { user, ...rest } = result;
      return {
        ...rest,
        user: user ? getSanitizedUser(user) : null,
      };
    },

    unsubscribe() {
      if (this._eeUpdateUnsubscribe) {
        this._eeUpdateUnsubscribe();
      }

      if (this._eeDisableUnsubscribe) {
        this._eeDisableUnsubscribe();
      }

      if (this._eventHubUnsubscribe) {
        this._eventHubUnsubscribe();
      }

      if (this._deleteExpiredJob) {
        this._deleteExpiredJob.cancel();
      }

      return this;
    },

    destroy() {
      return this.unsubscribe();
    },
  };
};

module.exports = createAuditLogsService;
