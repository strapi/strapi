import type { Core } from '@strapi/types';
import { scheduleJob } from 'node-schedule';

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

const getEventMap = (defaultEvents: any) => {
  const getDefaultPayload = (...args: any) => args[0];

  // Use the default payload for all default events
  return defaultEvents.reduce((acc: any, event: any) => {
    acc[event] = getDefaultPayload;
    return acc;
  }, {} as any);
};

const getRetentionDays = (strapi: Core.Strapi) => {
  const featureConfig = strapi.ee.features.get('audit-logs');
  const licenseRetentionDays =
    typeof featureConfig === 'object' && featureConfig?.options.retentionDays;
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

/**
 * @description
 * Manages the the lifecycle of audit logs. Accessible via strapi.get('audit-logs-lifecycles')
 */
const createAuditLogsLifecycleService = (strapi: Core.Strapi) => {
  // Manage internal service state privately
  const state = {} as any;
  const auditLogsService = strapi.get('audit-logs');

  // NOTE: providers should be able to replace getEventMap to add or remove events
  const eventMap = getEventMap(defaultEvents);

  const processEvent = (name: string, ...args: any) => {
    const requestState = strapi.requestContext.get()?.state;

    // Ignore events with auth strategies different from admin
    const isUsingAdminAuth = requestState?.route.info.type === 'admin';
    const user = requestState?.user;
    if (!isUsingAdminAuth || !user) {
      return null;
    }

    const getPayload = eventMap[name];

    // Ignore the event if it's not in the map
    if (!getPayload) {
      return null;
    }

    // Ignore some events based on payload
    // TODO: What does this ignore in upload? Why would we want to ignore anything?
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

  const handleEvent = async (name: string, ...args: any) => {
    const processedEvent = processEvent(name, ...args);

    if (processedEvent) {
      await auditLogsService.saveEvent(processedEvent);
    }
  };

  return {
    async register() {
      // Handle license being enabled
      if (!state.eeEnableUnsubscribe) {
        // @ts-expect-error- update event hub to receive callback argument
        state.eeEnableUnsubscribe = strapi.eventHub.on('ee.enable', () => {
          // Recreate the service to use the new license info
          this.destroy();
          this.register();
        });
      }

      // Handle license being updated
      if (!state.eeUpdateUnsubscribe) {
        // @ts-expect-error- update event hub to receive callback argument
        state.eeUpdateUnsubscribe = strapi.eventHub.on('ee.update', () => {
          // Recreate the service to use the new license info
          this.destroy();
          this.register();
        });
      }

      // Handle license being disabled
      // @ts-expect-error- update event hub to receive callback argument
      state.eeDisableUnsubscribe = strapi.eventHub.on('ee.disable', () => {
        // Turn off service when the license gets disabled
        // Only ee.enable and ee.update listeners remain active to recreate the service
        this.destroy();
      });

      // Check current state of license
      if (!strapi.ee.features.isEnabled('audit-logs')) {
        return this;
      }

      // Start saving events
      state.eventHubUnsubscribe = strapi.eventHub.subscribe(handleEvent);

      // Manage audit logs auto deletion
      const retentionDays = getRetentionDays(strapi);
      state.deleteExpiredJob = scheduleJob('0 0 * * *', () => {
        const expirationDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        auditLogsService.deleteExpiredEvents(expirationDate);
      });

      return this;
    },

    unsubscribe() {
      if (state.eeDisableUnsubscribe) {
        state.eeDisableUnsubscribe();
      }

      if (state.eventHubUnsubscribe) {
        state.eventHubUnsubscribe();
      }

      if (state.deleteExpiredJob) {
        state.deleteExpiredJob.cancel();
      }

      return this;
    },

    destroy() {
      return this.unsubscribe();
    },
  };
};

export { createAuditLogsLifecycleService };
