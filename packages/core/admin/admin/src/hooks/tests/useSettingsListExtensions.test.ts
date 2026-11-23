import { renderHook } from '@tests/utils';

import {
  useSettingsListFilters,
  useSettingsListHeaders,
  useSettingsListPluginParams,
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
  const useOptions = () => [{ value: 'fr', label: 'France' }];

  it('keeps popover filters for the filter bar and turns dropdown filters into selects', () => {
    const runHookWaterfall = (_name: string, value: unknown) => {
      const args = value as InjectSettingsListFiltersArgs;

      return {
        ...args,
        displayedFilters: [
          ...args.displayedFilters,
          {
            unstable_display: 'select' as const,
            pluginId: 'spaces',
            name: 'space',
            label: { id: 'space', defaultMessage: 'Space' },
            placeholder: { id: 'all', defaultMessage: 'All spaces' },
            useOptions,
          },
        ],
      };
    };

    const { result } = renderHook(
      () =>
        useSettingsListFilters('users', [
          { name: 'email', label: { id: 'email', defaultMessage: 'Email' }, type: 'email' },
        ]),
      { providerOptions: { runHookWaterfall } }
    );

    expect(result.current).toEqual({
      filters: [{ name: 'email', label: 'Email', type: 'email', operators: undefined }],
      selects: [
        {
          pluginId: 'spaces',
          name: 'space',
          label: 'Space',
          placeholder: 'All spaces',
          useOptions,
        },
      ],
    });
  });
});

describe('useSettingsListPluginParams', () => {
  const selects = [
    {
      pluginId: 'spaces',
      name: 'space',
      label: 'Space',
      placeholder: 'All spaces',
      useOptions: () => [],
    },
  ];

  it('sends the plugin values of the URL, encoded', () => {
    const { result } = renderHook(() => useSettingsListPluginParams(selects), {
      initialEntries: ['/?plugins[spaces][space]=fr%20%26%20es&filters[$and][0][a][$eq]=b'],
    });

    expect(result.current).toEqual({ plugins: { spaces: { space: 'fr%20%26%20es' } } });
  });

  it('sends nothing without plugin values', () => {
    const { result } = renderHook(() => useSettingsListPluginParams(selects));

    expect(result.current).toEqual({});
  });

  it('leaves out the values of dropdowns no plugin registered', () => {
    const { result } = renderHook(() => useSettingsListPluginParams(selects), {
      initialEntries: [
        '/?plugins[spaces][space]=france&plugins[spaces][team]=blue&plugins[old][x]=y',
      ],
    });

    expect(result.current).toEqual({ plugins: { spaces: { space: 'france' } } });
  });
});
