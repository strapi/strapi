import { renderHook } from '@tests/utils';

import {
  splitSettingsListFilters,
  useSettingsListFilters,
  useSettingsListHeaders,
} from '../useSettingsListExtensions';

import type {
  InjectSettingsListColumnsArgs,
  InjectSettingsListFiltersArgs,
} from '../useSettingsListExtensions';

describe('useSettingsListHeaders', () => {
  it('runs the plugin hook with the list, formats the labels, and never sorts plugin columns', () => {
    const runHookWaterfall = jest.fn((_name: string, value: unknown) => {
      const args = value as InjectSettingsListColumnsArgs;

      return {
        ...args,
        displayedHeaders: [
          ...args.displayedHeaders,
          { name: 'space', label: { id: 'space', defaultMessage: 'Space' }, sortable: true },
        ],
      };
    });

    const { result } = renderHook(
      () =>
        useSettingsListHeaders('users', [
          { name: 'email', label: { id: 'email', defaultMessage: 'Email' }, sortable: true },
        ]),
      { providerOptions: { runHookWaterfall } }
    );

    expect(runHookWaterfall).toHaveBeenCalledWith(
      'Admin/Settings/pages/ListPage/unstable_inject-column-in-table',
      expect.objectContaining({ list: 'users' })
    );
    expect(result.current).toEqual([
      { name: 'email', label: 'Email', sortable: true },
      { name: 'space', label: 'Space', sortable: false },
    ]);
  });
});

describe('useSettingsListFilters', () => {
  it('runs the plugin hook with the list and formats the labels', () => {
    const runHookWaterfall = (_name: string, value: unknown) => {
      const args = value as InjectSettingsListFiltersArgs;

      return {
        ...args,
        displayedFilters: [
          {
            name: 'plugin::spaces.space',
            label: { id: 'space', defaultMessage: 'Space' },
            type: 'enumeration' as const,
            operators: [{ value: '$eq', label: { id: 'is', defaultMessage: 'is' } }],
          },
        ],
      };
    };

    const { result } = renderHook(() => useSettingsListFilters('api-tokens', []), {
      providerOptions: { runHookWaterfall },
    });

    expect(result.current).toEqual([
      {
        name: 'plugin::spaces.space',
        label: 'Space',
        type: 'enumeration',
        operators: [{ value: '$eq', label: 'is' }],
      },
    ]);
  });
});

describe('splitSettingsListFilters', () => {
  it('sends the plugin filters apart from the core ones, encoded', () => {
    expect(
      splitSettingsListFilters({
        $and: [{ name: { $eq: 'a' } }, { 'plugin::spaces.space': { $eq: 'fr & es' } }],
      })
    ).toEqual({
      filters: { $and: [{ name: { $eq: 'a' } }] },
      plugins: { spaces: { $and: [{ space: { $eq: 'fr%20%26%20es' } }] } },
    });
  });

  it('leaves the filters as they are when no plugin filter is applied', () => {
    const filters = { $and: [{ name: { $eq: 'a' } }] };

    expect(splitSettingsListFilters(filters)).toEqual({ filters });
    expect(splitSettingsListFilters(undefined)).toEqual({ filters: undefined });
  });

  it('drops the core filters when only plugin filters are applied', () => {
    expect(splitSettingsListFilters({ $and: [{ 'plugin::spaces.space': { $ne: 'fr' } }] })).toEqual(
      {
        filters: undefined,
        plugins: { spaces: { $and: [{ space: { $ne: 'fr' } }] } },
      }
    );
  });
});
