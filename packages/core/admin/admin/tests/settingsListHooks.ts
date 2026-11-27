import * as React from 'react';

import { SettingsListToolbarSelect } from '../src/components/SettingsListToolbarFilters';
import { HOOKS } from '../src/constants';

import type {
  InjectSettingsListColumnsArgs,
  InjectSettingsListFiltersArgs,
  InjectableSettingsListFilter,
  InjectableSettingsListHeader,
  SettingsListToolbarFilterProps,
} from '../src/hooks/useSettingsListExtensions';

/**
 * A `runHookWaterfall` for the test providers that does what a plugin registering both Settings
 * list hooks would do: add a column after a core one, and a filter
 */
const settingsListHooks =
  ({
    after,
    column,
    filter,
  }: {
    after: string;
    column: InjectableSettingsListHeader<never>;
    filter: InjectableSettingsListFilter;
  }) =>
  (name: string, value: unknown) => {
    if (name === HOOKS.INJECT_COLUMN_IN_SETTINGS_TABLE) {
      const args = value as InjectSettingsListColumnsArgs;
      const headers: unknown[] = [...args.displayedHeaders];

      headers.splice(
        args.displayedHeaders.findIndex((header) => header.name === after) + 1,
        0,
        column
      );

      return { ...args, displayedHeaders: headers };
    }

    if (name === HOOKS.INJECT_SETTINGS_LIST_FILTERS) {
      const args = value as InjectSettingsListFiltersArgs;

      return { ...args, displayedFilters: [...args.displayedFilters, filter] };
    }

    return value;
  };

const SpaceFilter = (props: SettingsListToolbarFilterProps) =>
  React.createElement(SettingsListToolbarSelect, {
    ...props,
    label: 'Space',
    placeholder: 'All spaces',
    options: [{ label: 'France', value: 'france' }],
  });

const SPACE_FILTER: InjectableSettingsListFilter = {
  placement: 'toolbar',
  pluginId: 'spaces',
  name: 'space',
  Component: SpaceFilter,
};

const DATE_FILTER: InjectableSettingsListFilter = {
  name: 'reviewedAt',
  label: 'Reviewed at',
  type: 'datetime',
};

// The tests run in UTC: the day is midnight to midnight UTC
const DAY_BOUNDS = { $gte: '2023-10-31T00:00:00.000Z', $lt: '2023-11-01T00:00:00.000Z' };

export { settingsListHooks, DATE_FILTER, DAY_BOUNDS, SPACE_FILTER };
