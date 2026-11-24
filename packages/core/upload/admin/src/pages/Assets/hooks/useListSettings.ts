import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';

interface ListSettings {
  /**
   * Management affordances on list items: the right-click menu and the bulk
   * actions bar. A picker hosted elsewhere (the Content Manager asset picker)
   * turns them off — choosing an asset is not the place to delete or move it.
   */
  showItemActions: boolean;
  /**
   * "Folders (n)" / "Assets (n)" headings above each grid section, with a
   * divider between them. The page carries the count in its own header instead.
   */
  showSectionHeadings: boolean;
  /** Narrowest a grid tile may get before the grid drops a column. */
  gridMinTileWidth: string;
  /**
   * A "Select all" checkbox beside the grid's "Assets (n)" heading, the grid's
   * counterpart of the table's header checkbox. The page reaches select-all
   * from its bulk actions bar instead.
   */
  showGridSelectAll: boolean;
}

const DEFAULT_LIST_SETTINGS: ListSettings = {
  showItemActions: true,
  showSectionHeadings: false,
  gridMinTileWidth: '240px',
  showGridSelectAll: false,
};

const ListSettingsContext = createContext<ListSettings>(DEFAULT_LIST_SETTINGS);

interface ListSettingsProviderProps extends Partial<ListSettings> {
  children: ReactNode;
}

export const ListSettingsProvider = ({
  children,
  showItemActions = DEFAULT_LIST_SETTINGS.showItemActions,
  showSectionHeadings = DEFAULT_LIST_SETTINGS.showSectionHeadings,
  gridMinTileWidth = DEFAULT_LIST_SETTINGS.gridMinTileWidth,
  showGridSelectAll = DEFAULT_LIST_SETTINGS.showGridSelectAll,
}: ListSettingsProviderProps) => {
  const value = useMemo(
    () => ({ showItemActions, showSectionHeadings, gridMinTileWidth, showGridSelectAll }),
    [showItemActions, showSectionHeadings, gridMinTileWidth, showGridSelectAll]
  );

  return createElement(ListSettingsContext.Provider, { value }, children);
};

/** Without a provider, returns the Media Library page's settings. */
export const useListSettings = () => useContext(ListSettingsContext);
