import type { Core, Modules } from '@strapi/types';

import { getDisplayName, type AdminUserLike } from '../utils';

export const DEFAULT_RETENTION_DAYS = 90;

/**
 * Events audited before the payload standard; their stored shape is frozen for
 * compatibility. Do not add events here: new events come through registerEvent().
 * The event hub still emits user.create, user.update and user.delete; the audit log
 * records them as admin-user.* (server/src/audit-logs/admin-users.ts).
 * TODO: migrate the rest to the standard.
 */
export const defaultEvents = [
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
  'admin.auth.success',
  'admin.auth.mfa_required',
  'admin.mfa.enabled',
  'admin.mfa.disabled',
  'admin.mfa.reset',
  'admin.mfa.challenge.failed',
  'admin.mfa.authenticator.replaced',
  'admin.mfa.locked',
  'admin.mfa.unlocked',
  'admin.mfa.device.trusted',
  'admin.mfa.device.trust.revoked',
  'admin.mfa.trusted.device.used',
  'admin.mfa.passkey.registered',
  'admin.mfa.passkey.removed',
  'admin.mfa.passkey.used',
  'admin.security-settings.update',
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
  | {
      kind: 'standard';
      transform: Modules.AuditLogs.EventTransformer;
      options: RegisterEventOptions;
    };

export interface RegisterEventOptions {
  /**
   * Records the event when the request has no authenticated user, with an
   * `unknown` actor and no user column. For actions taken from public admin
   * forms (password reset, invitation). Off by default: an event with no user
   * is dropped.
   */
  allowUnknownActor?: boolean;
  /**
   * Records the event with an `unknown` actor and no user column even when the request
   * has an authenticated user. For events about a login that did not complete.
   */
  alwaysUnknownActor?: boolean;
  /**
   * Receives the arguments passed to eventHub.emit(); returning false keeps the
   * event out of the audit log. Listeners on the event hub still receive it.
   */
  shouldRecord?: (...args: any[]) => boolean;
}

const getEventMap = (events: string[]) => {
  return events.reduce(
    (acc, event) => {
      acc[event] = { kind: 'legacy' };
      return acc;
    },
    {} as Record<string, EventRegistration>
  );
};

/** The user an audit row is attributed to: the session user, or the account an `admin.mfa.*` payload names. */
type AttributableUser = AdminUserLike & { id: string | number };

const getActor = (
  systemOrigin: Modules.AuditLogs.SystemOrigin | undefined,
  user: AttributableUser | undefined
): Modules.AuditLogs.Actor => {
  if (systemOrigin) {
    return { type: 'system' };
  }

  if (!user) {
    return { type: 'unknown' };
  }

  // We copy the user data into the row so the history stays unchanged if the user
  // changes later
  return {
    type: 'admin-user',
    user: { id: user.id, email: user.email, name: getDisplayName(user) },
  };
};

/**
 * The retention the daily delete job applies, from the license's value and the admin override.
 * Shared with the Plan card's resolver (../entitlements.ts) so the card shows this same figure.
 */
export const computeRetentionDays = (
  licenseRetentionDays: unknown,
  userRetentionDays: number | null | undefined
): number => {
  // For enterprise plans, use 90 days by default, but allow users to override it
  if (licenseRetentionDays == null) {
    return userRetentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  // The registry can ship the value as a numeric string
  const licenseDays = Number(licenseRetentionDays);

  // Allow users to override the license retention days, but not to increase it
  if (userRetentionDays && userRetentionDays <= licenseDays) {
    return userRetentionDays;
  }

  // User didn't provide a retention days value, use the license one
  return licenseDays;
};

const getRetentionDays = (strapi: Core.Strapi) => {
  const featureConfig = strapi.ee.features.get('audit-logs');

  return computeRetentionDays(
    typeof featureConfig === 'object' ? featureConfig?.options?.retentionDays : undefined,
    strapi.config.get('admin.auditLogs.retentionDays')
  );
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
    const options: RegisterEventOptions =
      registration.kind === 'standard' ? registration.options : {};
    const user = options.alwaysUnknownActor ? undefined : requestState?.user;
    const systemOrigin =
      auditSource && SYSTEM_ORIGINS.includes(auditSource)
        ? (auditSource as Modules.AuditLogs.SystemOrigin)
        : undefined;

    if (!systemOrigin && !isUsingAdminAuth && !isMcpAdminAction) {
      return null;
    }

    // `/login/mfa` challenges a second factor before `ctx.state.user` exists -- it is only
    // populated on a successful login (`issueSession`, called after the challenge passes) -- and
    // the refresh exchange locks an expired grace with no session user on the context either. Both
    // are exactly the rows an audit log most wants. `admin::mfa`'s `notify` names the account in
    // the event payload (`{ userId }`), so for `admin.mfa.*` names only, fall back to that id and
    // load the user it names; every other event still requires `requestState.user` exactly as
    // before. A payload id that matches no user cannot be attributed and is dropped. An event
    // registered with `alwaysUnknownActor` opts out of attribution entirely, so it never falls
    // back.
    let attributedUser: AttributableUser | undefined = user;
    if (
      !attributedUser &&
      !systemOrigin &&
      !options.alwaysUnknownActor &&
      name.startsWith('admin.mfa.')
    ) {
      const fallbackId = args[0]?.userId;
      if (fallbackId !== undefined) {
        attributedUser = await strapi.db.query('admin::user').findOne({
          where: { id: fallbackId },
          select: ['id', 'email', 'username', 'firstname', 'lastname'],
        });
      }
    }

    const allowsUnknownActor =
      options.allowUnknownActor === true || options.alwaysUnknownActor === true;

    if (!systemOrigin && !attributedUser && !allowsUnknownActor) {
      return null;
    }

    if (options.shouldRecord?.(...args) === false) {
      return null;
    }

    const origin: Modules.AuditLogs.AuditSource = systemOrigin ?? auditSource ?? 'admin-panel';
    const date = new Date().toISOString();
    // Scheduled actions have no user, so a null user is expected. The earlier audit
    // entry that set the schedule records who did it. Events allowing an unknown actor
    // have no user either.
    const userId = attributedUser ? attributedUser.id : null;

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

    const actor = getActor(systemOrigin, attributedUser);

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
      transform: Modules.AuditLogs.EventTransformer<TDetails>,
      options: RegisterEventOptions = {}
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
        options,
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
