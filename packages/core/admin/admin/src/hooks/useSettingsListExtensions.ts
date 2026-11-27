import * as React from 'react';

import { useIntl } from 'react-intl';

import { HOOKS } from '../constants';
import { useStrapiApp } from '../features/StrapiApp';

import { deepEncodeQueryValues, useQueryParams } from './useQueryParams';

import type { ApiToken } from '../../../shared/contracts/api-token';
import type { AuditLog } from '../../../shared/contracts/audit-logs';
import type { FindRoles } from '../../../shared/contracts/roles';
import type { SanitizedAdminUser } from '../../../shared/contracts/shared';
import type { Filters } from '../components/Filters';
import type { Table } from '../components/Table';
import type { MessageDescriptor } from 'react-intl';

interface SettingsListRows {
  'api-tokens': ApiToken;
  'audit-logs': AuditLog;
  roles: FindRoles.Response['data'][number];
  users: SanitizedAdminUser;
}

type SettingsList = keyof SettingsListRows;

type InjectableSettingsListHeader<TRow = unknown> = Omit<Table.Header<TRow, object>, 'label'> & {
  label: string | MessageDescriptor;
};

type InjectableSettingsListPopoverFilter = Omit<Filters.Filter, 'label' | 'operators'> & {
  placement?: 'popover';
  label: string | MessageDescriptor;
  operators?: Array<{ value: string; label: string | MessageDescriptor }>;
};

/**
 * Renders on the right of the list toolbar. Its value goes to `plugins[<pluginId>][<name>]`,
 * apart from the core filters
 */
interface InjectableSettingsListToolbarFilter {
  placement: 'toolbar';
  pluginId: string;
  name: string;
  /** Renders the filter, usually with `unstable_SettingsListToolbarSelect`. It can load its options with hooks */
  Component: React.ComponentType<SettingsListToolbarFilterProps>;
}

interface SettingsListToolbarFilterProps {
  value: string;
  /** `replace` changes the URL without adding a history entry */
  onChange: (value: string, options?: { replace?: boolean }) => void;
}

type InjectableSettingsListFilter =
  InjectableSettingsListPopoverFilter | InjectableSettingsListToolbarFilter;

type SettingsListToolbarFilter = Omit<InjectableSettingsListToolbarFilter, 'placement'>;

/**
 * Arguments of the `INJECT_COLUMN_IN_SETTINGS_TABLE` hook. Narrow on `list` to type the rows.
 */
type InjectSettingsListColumnsArgs = {
  [TList in SettingsList]: {
    list: TList;
    displayedHeaders: InjectableSettingsListHeader<SettingsListRows[TList]>[];
  };
}[SettingsList];

interface InjectSettingsListFiltersArgs {
  list: SettingsList;
  displayedFilters: InjectableSettingsListFilter[];
}

const resolveLabel = (
  label: string | MessageDescriptor,
  formatMessage: ReturnType<typeof useIntl>['formatMessage']
) => (typeof label === 'string' ? label : formatMessage(label));

const useSettingsListHeaders = <TList extends SettingsList>(
  list: TList,
  coreHeaders: InjectableSettingsListHeader<SettingsListRows[TList]>[]
): Table.Header<SettingsListRows[TList], object>[] => {
  const runHookWaterfall = useStrapiApp(
    'useSettingsListHeaders',
    (state) => state.runHookWaterfall
  );
  const { formatMessage } = useIntl();

  return React.useMemo(() => {
    const { displayedHeaders } = runHookWaterfall(HOOKS.INJECT_COLUMN_IN_SETTINGS_TABLE, {
      list,
      displayedHeaders: coreHeaders,
    } as InjectSettingsListColumnsArgs) as { displayedHeaders: typeof coreHeaders };

    const coreNames = new Set(coreHeaders.map(({ name }) => name));

    return displayedHeaders.map((header) => ({
      ...header,
      label: resolveLabel(header.label, formatMessage),
      // The server sorts on its own fields only
      sortable: coreNames.has(header.name) ? (header.sortable ?? false) : false,
    }));
  }, [runHookWaterfall, list, coreHeaders, formatMessage]);
};

const useSettingsListFilters = (
  list: SettingsList,
  coreFilters: InjectableSettingsListFilter[]
): { filters: Filters.Filter[]; toolbarFilters: SettingsListToolbarFilter[] } => {
  const runHookWaterfall = useStrapiApp(
    'useSettingsListFilters',
    (state) => state.runHookWaterfall
  );
  const { formatMessage } = useIntl();

  return React.useMemo(() => {
    const { displayedFilters } = runHookWaterfall<InjectSettingsListFiltersArgs>(
      HOOKS.INJECT_SETTINGS_LIST_FILTERS,
      { list, displayedFilters: coreFilters }
    );

    const filters: Filters.Filter[] = [];
    const toolbarFilters: SettingsListToolbarFilter[] = [];

    for (const filter of displayedFilters) {
      if (filter.placement === 'toolbar') {
        const { placement: _placement, ...toolbarFilter } = filter;

        toolbarFilters.push(toolbarFilter);
      } else {
        const { placement: _placement, ...popoverFilter } = filter;

        filters.push({
          ...popoverFilter,
          label: resolveLabel(filter.label, formatMessage),
          operators: filter.operators?.map((operator) => ({
            ...operator,
            label: resolveLabel(operator.label, formatMessage),
          })),
        });
      }
    }

    return { filters, toolbarFilters };
  }, [runHookWaterfall, list, coreFilters, formatMessage]);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The values of the toolbar filters, to send with the list request. The fetch client does not
 * encode params, so they are encoded here
 */
const useSettingsListPluginParams = (
  toolbarFilters: SettingsListToolbarFilter[]
): { plugins?: Record<string, Record<string, string>> } => {
  const [{ query }] = useQueryParams<{ plugins?: unknown }>();

  return React.useMemo(() => {
    const plugins: Record<string, Record<string, string>> = {};

    // Only the values of registered filters: a stale link filters nothing
    for (const { pluginId, name } of toolbarFilters) {
      const values = isRecord(query.plugins) ? query.plugins[pluginId] : undefined;
      const value = isRecord(values) ? values[name] : undefined;

      if (typeof value === 'string' && value !== '') {
        plugins[pluginId] = { ...plugins[pluginId], [name]: value };
      }
    }

    return Object.keys(plugins).length > 0 ? { plugins: deepEncodeQueryValues(plugins) } : {};
  }, [query.plugins, toolbarFilters]);
};

export {
  resolveLabel,
  useSettingsListFilters,
  useSettingsListHeaders,
  useSettingsListPluginParams,
};
export type {
  InjectSettingsListColumnsArgs,
  InjectSettingsListFiltersArgs,
  InjectableSettingsListFilter,
  InjectableSettingsListHeader,
  InjectableSettingsListToolbarFilter,
  SettingsList,
  SettingsListRows,
  SettingsListToolbarFilter,
  SettingsListToolbarFilterProps,
};
