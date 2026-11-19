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

type InjectableSettingsListFilter = Omit<Filters.Filter, 'label' | 'operators'> & {
  label: string | MessageDescriptor;
  operators?: Array<{ value: string; label: string | MessageDescriptor }>;
};

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

    return displayedHeaders.map((header) => ({
      ...header,
      label: resolveLabel(header.label, formatMessage),
      sortable: header.sortable ?? false,
    }));
  }, [runHookWaterfall, list, coreHeaders, formatMessage]);
};

const useSettingsListFilters = (
  list: SettingsList,
  coreFilters: InjectableSettingsListFilter[]
): Filters.Filter[] => {
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

    return displayedFilters.map((filter) => ({
      ...filter,
      label: resolveLabel(filter.label, formatMessage),
      operators: filter.operators?.map((operator) => ({
        ...operator,
        label: resolveLabel(operator.label, formatMessage),
      })),
    }));
  }, [runHookWaterfall, list, coreFilters, formatMessage]);
};

const PLUGIN_FILTER_PREFIX = 'plugin::';

type FilterEntry = Record<string, unknown>;

interface SettingsListFilterParams {
  filters?: Filters.Query['filters'];
  plugins?: Record<string, { $and: FilterEntry[] }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parsePluginFilterName = (key: string) => {
  if (!key.startsWith(PLUGIN_FILTER_PREFIX)) {
    return null;
  }

  const rest = key.slice(PLUGIN_FILTER_PREFIX.length);
  const dot = rest.indexOf('.');

  return dot > 0 ? { pluginId: rest.slice(0, dot), name: rest.slice(dot + 1) } : null;
};

/**
 * Filters named `plugin::<pluginId>.<name>` are sent apart, as `plugins[<pluginId>][$and]`: the
 * server would refuse them in `filters`, which it validates against the core model
 */
const splitSettingsListFilters = (filters: unknown): SettingsListFilterParams => {
  const entries = isRecord(filters) && Array.isArray(filters.$and) ? filters.$and : [];
  const coreEntries: unknown[] = [];
  const plugins: NonNullable<SettingsListFilterParams['plugins']> = {};

  for (const entry of entries) {
    const keys = isRecord(entry) ? Object.keys(entry) : [];
    const pluginFilter = keys.length === 1 ? parsePluginFilterName(keys[0]) : null;

    if (!pluginFilter) {
      coreEntries.push(entry);
      continue;
    }

    const { $and = [] } = plugins[pluginFilter.pluginId] ?? {};

    plugins[pluginFilter.pluginId] = {
      $and: [
        ...$and,
        deepEncodeQueryValues({ [pluginFilter.name]: (entry as FilterEntry)[keys[0]] }),
      ],
    };
  }

  if (coreEntries.length === entries.length) {
    return { filters: filters as SettingsListFilterParams['filters'] };
  }

  return {
    filters:
      coreEntries.length > 0
        ? ({ ...(filters as object), $and: coreEntries } as SettingsListFilterParams['filters'])
        : undefined,
    plugins,
  };
};

const useSettingsListFilterParams = (): SettingsListFilterParams => {
  const [{ query }] = useQueryParams<{ filters?: unknown }>();

  return React.useMemo(() => splitSettingsListFilters(query.filters), [query.filters]);
};

export {
  splitSettingsListFilters,
  useSettingsListFilterParams,
  useSettingsListFilters,
  useSettingsListHeaders,
};
export type {
  InjectSettingsListColumnsArgs,
  InjectSettingsListFiltersArgs,
  InjectableSettingsListFilter,
  InjectableSettingsListHeader,
  SettingsList,
  SettingsListFilterParams,
  SettingsListRows,
};
