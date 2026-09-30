import type { Modules } from '@strapi/types';

import { AUDITED_EVENTS } from './constants';

interface LocaleEvent {
  localeId: number;
  name?: string;
  code: string;
}

/**
 * The code is what the rest of the system refers to a locale by, and it outlives the
 * row: the name can be edited, and the id resolves to nothing once it is deleted.
 */
interface LocaleResource extends Modules.AuditLogs.Resource {
  type: 'locale';
  code: string;
}

export interface CreateDetails {
  isDefault: boolean;
}

export interface UpdateDetails {
  changes: Partial<Record<'name', Modules.AuditLogs.FieldChange>>;
}

export interface LocaleRef {
  id: number | null;
  code: string;
}

export interface DefaultUpdateDetails {
  changes: Record<'defaultLocale', Modules.AuditLogs.FieldChange<LocaleRef | null>>;
}

/**
 * The part of the audit-logs lifecycle service used by this plugin.
 * The full service type lives in the Admin EE package and cannot be imported here.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails, TResource extends Modules.AuditLogs.Resource>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails, TResource>
  ): void;
}

export const registerAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  const localeResource = (event: LocaleEvent): LocaleResource => ({
    type: 'locale',
    id: event.localeId,
    name: event.name,
    code: event.code,
  });

  auditLogsLifecycle.registerEvent<CreateDetails, LocaleResource>(
    AUDITED_EVENTS.LOCALE_CREATE,
    (event: LocaleEvent & CreateDetails) => ({
      resource: localeResource(event),
      details: { isDefault: event.isDefault },
    })
  );

  auditLogsLifecycle.registerEvent<UpdateDetails, LocaleResource>(
    AUDITED_EVENTS.LOCALE_UPDATE,
    (event: LocaleEvent & UpdateDetails) => ({
      resource: localeResource(event),
      details: { changes: event.changes },
    })
  );

  auditLogsLifecycle.registerEvent<undefined, LocaleResource>(
    AUDITED_EVENTS.LOCALE_DELETE,
    (event: LocaleEvent) => ({
      resource: localeResource(event),
    })
  );

  /**
   * The resource is the locale that became the default. `before` is null when no
   * default was set yet.
   */
  auditLogsLifecycle.registerEvent<DefaultUpdateDetails, LocaleResource>(
    AUDITED_EVENTS.LOCALE_DEFAULT_UPDATE,
    (event: LocaleEvent & DefaultUpdateDetails) => ({
      resource: localeResource(event),
      details: { changes: event.changes },
    })
  );
};
