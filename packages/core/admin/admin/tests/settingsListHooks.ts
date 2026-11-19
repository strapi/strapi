import { HOOKS } from '../src/constants';

import type {
  InjectSettingsListColumnsArgs,
  InjectSettingsListFiltersArgs,
  InjectableSettingsListFilter,
  InjectableSettingsListHeader,
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

const SPACE_FILTER: InjectableSettingsListFilter = {
  name: 'plugin::spaces.space',
  label: 'Space',
  type: 'enumeration',
  options: [{ label: 'France', value: 'france' }],
};

export { settingsListHooks, SPACE_FILTER };
