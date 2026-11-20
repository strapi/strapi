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
  display?: 'popover';
  label: string | MessageDescriptor;
  operators?: Array<{ value: string; label: string | MessageDescriptor }>;
};

/**
 * Renders as its own dropdown on the right of the list toolbar. Named `plugin::<pluginId>.<name>`,
 * its value goes to `plugins[<pluginId>][<name>]`, apart from the core filters
 */
interface InjectableSettingsListSelectFilter {
  display: 'select';
  name: string;
  label: string | MessageDescriptor;
  /** The option that clears the filter, e.g. "All spaces" */
  placeholder: string | MessageDescriptor;
  options: Array<{ value: string; label: string | MessageDescriptor }>;
}

type InjectableSettingsListFilter =
  InjectableSettingsListPopoverFilter | InjectableSettingsListSelectFilter;

interface SettingsListSelectFilter {
  pluginId: string;
  name: string;
  label: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}

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

const PLUGIN_FILTER_PREFIX = 'plugin::';

const parsePluginFilterName = (key: string) => {
  if (!key.startsWith(PLUGIN_FILTER_PREFIX)) {
    return null;
  }

  const rest = key.slice(PLUGIN_FILTER_PREFIX.length);
  const dot = rest.indexOf('.');

  return dot > 0 ? { pluginId: rest.slice(0, dot), name: rest.slice(dot + 1) } : null;
};

const useSettingsListFilters = (
  list: SettingsList,
  coreFilters: InjectableSettingsListFilter[]
): { filters: Filters.Filter[]; selects: SettingsListSelectFilter[] } => {
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
    const selects: SettingsListSelectFilter[] = [];

    for (const filter of displayedFilters) {
      if (filter.display === 'select') {
        const pluginFilter = parsePluginFilterName(filter.name);

        if (pluginFilter) {
          selects.push({
            ...pluginFilter,
            label: resolveLabel(filter.label, formatMessage),
            placeholder: resolveLabel(filter.placeholder, formatMessage),
            options: filter.options.map((option) => ({
              ...option,
              label: resolveLabel(option.label, formatMessage),
            })),
          });
        }
      } else {
        filters.push({
          ...filter,
          label: resolveLabel(filter.label, formatMessage),
          operators: filter.operators?.map((operator) => ({
            ...operator,
            label: resolveLabel(operator.label, formatMessage),
          })),
        });
      }
    }

    return { filters, selects };
  }, [runHookWaterfall, list, coreFilters, formatMessage]);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The values of the dropdown filters, to send with the list request. The fetch client does not
 * encode params, so they are encoded here
 */
const useSettingsListPluginParams = (): { plugins?: Record<string, unknown> } => {
  const [{ query }] = useQueryParams<{ plugins?: unknown }>();

  return React.useMemo(
    () =>
      isRecord(query.plugins) && Object.keys(query.plugins).length > 0
        ? { plugins: deepEncodeQueryValues(query.plugins) }
        : {},
    [query.plugins]
  );
};

export { useSettingsListFilters, useSettingsListHeaders, useSettingsListPluginParams };
export type {
  InjectSettingsListColumnsArgs,
  InjectSettingsListFiltersArgs,
  InjectableSettingsListFilter,
  InjectableSettingsListHeader,
  InjectableSettingsListSelectFilter,
  SettingsList,
  SettingsListRows,
  SettingsListSelectFilter,
};
