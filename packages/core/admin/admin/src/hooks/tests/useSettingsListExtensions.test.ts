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
  const SpaceFilter = () => null;

  it('keeps popover filters for the filter bar and toolbar filters for the toolbar', () => {
    const runHookWaterfall = (_name: string, value: unknown) => {
      const args = value as InjectSettingsListFiltersArgs;

      return {
        ...args,
        displayedFilters: [
          ...args.displayedFilters,
          {
            placement: 'toolbar' as const,
            pluginId: 'spaces',
            name: 'space',
            Component: SpaceFilter,
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
      toolbarFilters: [{ pluginId: 'spaces', name: 'space', Component: SpaceFilter }],
    });
  });
});

describe('useSettingsListPluginParams', () => {
  const toolbarFilters = [{ pluginId: 'spaces', name: 'space', Component: () => null }];

  it('sends the plugin values of the URL, encoded', () => {
    const { result } = renderHook(() => useSettingsListPluginParams(toolbarFilters), {
      initialEntries: ['/?plugins[spaces][space]=fr%20%26%20es&filters[$and][0][a][$eq]=b'],
    });

    expect(result.current).toEqual({ plugins: { spaces: { space: 'fr%20%26%20es' } } });
  });

  it('sends nothing without plugin values', () => {
    const { result } = renderHook(() => useSettingsListPluginParams(toolbarFilters));

    expect(result.current).toEqual({});
  });

  it('leaves out the values of dropdowns no plugin registered', () => {
    const { result } = renderHook(() => useSettingsListPluginParams(toolbarFilters), {
      initialEntries: [
        '/?plugins[spaces][space]=france&plugins[spaces][team]=blue&plugins[old][x]=y',
      ],
    });

    expect(result.current).toEqual({ plugins: { spaces: { space: 'france' } } });
  });
});
