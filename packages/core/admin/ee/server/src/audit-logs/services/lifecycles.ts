import type { Core, Modules } from '@strapi/types';

import { getDisplayName } from '../utils';

const DEFAULT_RETENTION_DAYS = 90;

/**
 * Events audited before the payload standard; their stored shape is frozen for
 * compatibility. Do not add events here: new events come through registerEvent().
 * TODO: migrate these to the standard.
 */
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

/**
 * Legacy events store the first emitted argument as-is; registered events store the
 * standard shape built by their transformer.
 */
type EventRegistration =
  | { kind: 'legacy' }
  | { kind: 'standard'; transform: Modules.AuditLogs.EventTransformer };

const getEventMap = (events: string[]) => {
  return events.reduce(
    (acc, event) => {
      acc[event] = { kind: 'legacy' };
      return acc;
    },
    {} as Record<string, EventRegistration>
  );
};

const getRetentionDays = (strapi: Core.Strapi) => {
  const featureConfig = strapi.ee.features.get('audit-logs');
  const licenseRetentionDays =
    typeof featureConfig === 'object' && featureConfig?.options?.retentionDays;
  const userRetentionDays = strapi.config.get('admin.auditLogs.retentionDays');

  // For enterprise plans, use 90 days by default, but allow users to override it
  if (licenseRetentionDays == null) {
    return userRetentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  // Allow users to override the license retention days, but not to increase it
  if (userRetentionDays && userRetentionDays <= licenseRetentionDays) {
    return userRetentionDays;
  }

  // User didn't provide a retention days value, use the license one
  return licenseRetentionDays;
};

/**
 * @description
 * Manages the lifecycle of audit logs. Accessible via strapi.get('audit-logs-lifecycle')
 */
const createAuditLogsLifecycleService = (strapi: Core.Strapi) => {
  // Manage internal service state privately
  const state = {} as any;
  const auditLogsService = strapi.get('audit-logs');

  const eventMap = getEventMap(defaultEvents);

  /**
   * The system origins accepted from the execution context; anything else needs a
   * user. Keyed on the type, so extending SystemOrigin without gating it here fails
   * to compile.
   */
  const SYSTEM_ORIGIN_FLAGS: Record<Modules.AuditLogs.SystemOrigin, true> = {
    scheduler: true,
  };
  const SYSTEM_ORIGINS = Object.keys(SYSTEM_ORIGIN_FLAGS);

  const processEvent = async (name: string, ...args: any) => {
    const registration = eventMap[name];

    if (!registration) {
      return null;
    }

    const rawEvent = args[0];

    const requestState = strapi.requestContext.get()?.state;

    const isUsingAdminAuth = requestState?.route?.info?.type === 'admin';
    const auditSource = requestState?.auditSource;
    const isMcpAdminAction = auditSource === 'mcp';
    const user = requestState?.user;

    const systemOrigin =
      auditSource && SYSTEM_ORIGINS.includes(auditSource)
        ? (auditSource as Modules.AuditLogs.SystemOrigin)
        : undefined;

    if (!systemOrigin && ((!isUsingAdminAuth && !isMcpAdminAction) || !user)) {
      return null;
    }

    const origin: Modules.AuditLogs.AuditSource = systemOrigin ?? auditSource ?? 'admin-panel';
    const date = new Date().toISOString();
    // Scheduled actions have no user, so a null user is expected. The earlier audit
    // entry that set the schedule records who did it.
    const userId = systemOrigin ? null : user.id;

    if (registration.kind === 'legacy') {
      // TODO: What does this ignore in upload? Why would we want to ignore anything?
      const ignoredUids = ['plugin::upload.file', 'plugin::upload.folder'];
      if (ignoredUids.includes(rawEvent?.uid)) {
        return null;
      }

      return {
        action: name,
        date,
        payload: { ...rawEvent, origin },
        userId,
      };
    }

    const actor: Modules.AuditLogs.Actor = systemOrigin
      ? { type: 'system' }
      : {
          type: 'admin-user',
          // We copy the user data into the row so the history stays unchanged if the
          // user changes later
          user: { id: user.id, email: user.email, name: getDisplayName(user) },
        };

    let shape: Modules.AuditLogs.EventShape | null = null;

    try {
      shape = await registration.transform(...args);
    } catch (error) {
      // If the transformer fails, we still keep the audit event: the row is saved
      // with the subscriber's fields only.
      strapi.log.error(`Failed to build the audit log payload for ${name}`, { error });
    }

    const {
      action: _action,
      date: _date,
      actor: _actor,
      origin: _origin,
      ...rest
    } = (shape ?? {}) as Record<string, unknown>;
    const payload = shape
      ? ({ action: name, date, actor, origin, ...rest } as Modules.AuditLogs.StoredPayload)
      : { action: name, date, actor, origin };

    return { action: name, date, payload, userId };
  };

  const handleEvent = async (name: string, ...args: any) => {
    try {
      const processedEvent = await processEvent(name, ...args);

      if (processedEvent) {
        await auditLogsService.saveEvent(processedEvent);
      }
    } catch (error) {
      // Logged, not propagated: most emitters fire and forget (the document service
      // emits entry.* from an unawaited onCommit callback), and a rejection with no
      // one awaiting it takes the process down. Audit logging is therefore fail-open:
      // the entry is lost and only this line records it.
      strapi.log.error(`Failed to save the audit log entry for ${name}`, { error });
    }
  };

  return {
    /**
     * Adds an event to the list of audited events. Plugins register their own from
     * their bootstrap; the transformer builds the audited shape
     * ({resource, details, outcome}) from the arguments passed to eventHub.emit().
     */
    registerEvent<TDetails = unknown>(
      name: string,
      transform: Modules.AuditLogs.EventTransformer<TDetails>
    ) {
      if (eventMap[name]?.kind === 'legacy') {
        throw new Error(
          `Cannot register the audit log event "${name}": it is one of the built-in events, whose stored shape is frozen.`
        );
      }

      if (eventMap[name]) {
        strapi.log.warn(`The audit log event "${name}" was already registered and is replaced.`);
      }

      eventMap[name] = {
        kind: 'standard',
        transform: transform as Modules.AuditLogs.EventTransformer,
      };
    },

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

      strapi.cron.add({
        deleteExpiredAuditLogs: {
          async task() {
            const expirationDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
            await auditLogsService.deleteExpiredEvents(expirationDate);
          },
          options: '0 0 * * *',
        },
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

      strapi.cron.remove('deleteExpiredAuditLogs');

      return this;
    },

    destroy() {
      return this.unsubscribe();
    },
  };
};

export { createAuditLogsLifecycleService };
