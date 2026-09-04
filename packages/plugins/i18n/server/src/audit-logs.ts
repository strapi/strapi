import type { Modules } from '@strapi/types';
import type { FieldChange } from '@strapi/utils';

import { AUDITED_EVENTS } from './constants';

interface LocaleEvent {
  localeId: number;
  name?: string;
}

export interface CreateDetails {
  isDefault: boolean;
}

export interface UpdateDetails {
  changes: Partial<Record<'name', FieldChange>>;
}

export interface LocaleRef {
  id: number | null;
  code: string;
}

export interface DefaultUpdateDetails {
  changes: Record<'defaultLocale', FieldChange<LocaleRef | null>>;
}

/**
 * The part of the audit-logs lifecycle service used by this plugin.
 * The full service type lives in the Admin EE package and cannot be imported here.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>
  ): void;
}

export const registerAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  const localeResource = (event: LocaleEvent): Modules.AuditLogs.Resource => ({
    type: 'locale',
    id: event.localeId,
    name: event.name,
  });

  auditLogsLifecycle.registerEvent<CreateDetails>(
    AUDITED_EVENTS.LOCALE_CREATE,
    (event: LocaleEvent & CreateDetails) => ({
      resource: localeResource(event),
      details: { isDefault: event.isDefault },
    })
  );

  auditLogsLifecycle.registerEvent<UpdateDetails>(
    AUDITED_EVENTS.LOCALE_UPDATE,
    (event: LocaleEvent & UpdateDetails) => ({
      resource: localeResource(event),
      details: { changes: event.changes },
    })
  );

  auditLogsLifecycle.registerEvent(AUDITED_EVENTS.LOCALE_DELETE, (event: LocaleEvent) => ({
    resource: localeResource(event),
  }));

  /**
   * The resource is the locale that became the default. `before` is null when no
   * default was set yet.
   */
  auditLogsLifecycle.registerEvent<DefaultUpdateDetails>(
    AUDITED_EVENTS.LOCALE_DEFAULT_UPDATE,
    (event: LocaleEvent & DefaultUpdateDetails) => ({
      resource: localeResource(event),
      details: { changes: event.changes },
    })
  );
};
