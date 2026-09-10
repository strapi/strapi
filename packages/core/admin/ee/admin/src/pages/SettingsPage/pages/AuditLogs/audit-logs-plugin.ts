/* eslint-disable check-file/filename-naming-convention */
import type * as React from 'react';

import type { Filters } from '../../../../../../../admin/src/components/Filters';
import type { AuditLog } from '../../../../../../../shared/contracts/audit-logs';
import type { IntlShape, MessageDescriptor } from 'react-intl';

/**
 * Extension points other plugins can use to augment the audit logs page
 * without the admin depending on them (today's consumer: @strapi/plugin-spaces,
 * which adds a "Workspace" column and filter). Registration happens during the
 * consumer's `register`/`bootstrap`, before the page renders, so plain module
 * state is enough — same pattern as the settings form extensions.
 */
interface AuditLogTableColumn {
  id: string;
  header: MessageDescriptor;
  Cell: React.ComponentType<{ log: AuditLog }>;
  /** Called at render time; the column is hidden when it returns false. */
  isVisible?: () => boolean;
}

interface AuditLogFilterContext {
  formatMessage: IntlShape['formatMessage'];
}

interface AuditLogFilter {
  id: string;
  /** Called at render time; returns the filter, or `null` to hide it. */
  getFilter: (context: AuditLogFilterContext) => Filters.Filter | null;
}

const columns: AuditLogTableColumn[] = [];
const filters: AuditLogFilter[] = [];

const upsertById = <T extends { id: string }>(list: T[], entry: T) => {
  const index = list.findIndex((item) => item.id === entry.id);
  if (index === -1) {
    list.push(entry);
  } else {
    list[index] = entry;
  }
};

export const registerAuditLogTableColumn = (column: AuditLogTableColumn) => {
  upsertById(columns, column);
};

export const registerAuditLogFilter = (filter: AuditLogFilter) => {
  upsertById(filters, filter);
};

export const getAuditLogTableColumns = (): readonly AuditLogTableColumn[] =>
  columns.filter((column) => column.isVisible?.() ?? true);

export const getAuditLogFilters = (context: AuditLogFilterContext): Filters.Filter[] =>
  filters
    .map((filter) => filter.getFilter(context))
    .filter((filter): filter is Filters.Filter => filter !== null);

export type { AuditLogTableColumn, AuditLogFilter, AuditLogFilterContext };
