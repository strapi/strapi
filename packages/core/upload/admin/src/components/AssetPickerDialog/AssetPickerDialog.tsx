import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Page, usePersistentState } from '@strapi/admin/strapi-admin';
import { Badge, Box, Button, Flex, Loader, Modal, Tabs, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { AssetsGrid } from '../../pages/Assets/components/AssetsGrid';
import { AssetsSearchInput } from '../../pages/Assets/components/AssetsSearchInput';
import { AssetsView } from '../../pages/Assets/components/AssetsView';
import { FilterBadges } from '../../pages/Assets/components/FilterBadges';
import { FilterMenu } from '../../pages/Assets/components/FilterMenu';
import { SortMenu } from '../../pages/Assets/components/SortMenu';
import { ViewToggle } from '../../pages/Assets/components/ViewToggle';
import { localStorageKeys, viewOptions } from '../../pages/Assets/constants';
import { useAssetSelection } from '../../pages/Assets/hooks/useAssetSelection';
import { useAssetsList } from '../../pages/Assets/hooks/useAssetsList';
import { ListQueryStateProvider } from '../../pages/Assets/hooks/useListQueryParams';
import { ListSettingsProvider } from '../../pages/Assets/hooks/useListSettings';
import { assetKey } from '../../pages/Assets/utils/selection';
import { type MediaAllowedTypes } from '../../utils/isAllowedAssetType';
import { buildItemLocations } from '../../utils/itemLocations';
import { getTranslationKey } from '../../utils/translations';

import { FolderBreadcrumbs } from './FolderBreadcrumbs';
import { isSameSelection } from './pickerSelection';
import { PickerSelectionProvider, usePickerSelection } from './PickerSelectionProvider';
import { SortableSelection } from './SortableSelection';

import type { File } from '../../../../shared/contracts/files';

// Fixed height (design: 720 × 680) so the modal doesn't grow and shrink as the
// list loads, filters empty it, or tabs switch.
const StyledModalContent = styled(Modal.Content)`
  max-width: 72rem;
  height: min(68rem, 90vh);
`;

const TabsRoot = styled(Tabs.Root)`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

// Full-width divider under the tabs. Inset so it paints beneath the triggers,
// letting the active tab's own underline sit on top of it.
const TabsList = styled(Tabs.List)`
  box-shadow: inset 0 -1px 0 0 ${({ theme }) => theme.colors.neutral150};
`;

// Radix keeps the inactive panel mounted with `hidden`; `display: flex` would
// override it and the empty panel would take half the height.
const TabPanel = styled(Tabs.Content)`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  &[hidden] {
    display: none;
  }
`;

// The DS body is a scroll area sized `height: 100%`, which does not resolve
// inside the tab panel's flex column; take the remaining space instead.
//
// Its side padding also moves from the scroll area onto the viewport inside
// it: the viewport clips at its padding edge, so anything reaching past the
// content edge (the breadcrumbs pull their first crumb's highlight 8px left,
// card focus rings) stays visible instead of being cut off.
//
// No top padding: it would scroll away with the content, leaving the list
// flush against whatever sits above. The gap belongs to that fixed element.
const ScrollingBody = styled(Modal.Body)`
  flex: 1;
  min-height: 0;
  height: auto;
  padding-inline: 0;

  && > [data-radix-scroll-area-viewport] {
    margin: 0;
    padding-inline: ${({ theme }) => theme.spaces[7]};
    padding-block-start: 0;
  }

  /* The DS body pads every direct child div, meant for the viewport. The
     scrollbar is one too, and 2px of inline padding on each side of a 4px
     track leaves the thumb no width at all. Restore the DS scrollbar's own
     spacing. */
  && > [data-orientation] {
    padding: 0;
    margin: ${({ theme }) => theme.spaces[1]};
  }
`;

// The DS footer is `flex: 1`, which assumes a content-sized modal. With a fixed
// height it would absorb all the free space.
const Footer = styled(Modal.Footer)`
  flex: 0 0 auto;
`;

/* -------------------------------------------------------------------------------------------------
 * Shared
 * -----------------------------------------------------------------------------------------------*/

type AssetsList = ReturnType<typeof useAssetsList>;

// Both tabs share these; the Selected tab only drops the section headings.
const PICKER_LIST_SETTINGS = {
  showItemActions: false,
  // Three tiles per row in the 672px content width.
  gridMinTileWidth: '200px',
} as const;

/** In the picker a plain click on an asset picks it (or un-picks it). */
const useToggleAsset = () => {
  const { toggle } = useAssetSelection();

  return useCallback((assetId: number) => toggle(assetKey(assetId)), [toggle]);
};

/* -------------------------------------------------------------------------------------------------
 * BrowseTab
 * -----------------------------------------------------------------------------------------------*/

interface BrowseTabProps {
  list: AssetsList;
}

const BrowseTab = ({ list }: BrowseTabProps) => {
  const {
    currentFolderId,
    navigateToFolderId,
    searchQuery,
    isSearching,
    clearSearch,
    listSort,
    listFilters,
    assets,
    subscribers,
    pagination,
    isLoadingAssets,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    assetsError,
    folders,
    isLoadingFolders,
  } = list;
  const toggleAsset = useToggleAsset();
  // Shares the Media Library page's key: a user who prefers the table there
  // gets it here too.
  const [view, setView] = usePersistentState(localStorageKeys.view, viewOptions.GRID);
  const isGridView = view === viewOptions.GRID;

  const itemLocations = useMemo(() => buildItemLocations(assets, folders), [assets, folders]);

  return (
    <>
      <Box paddingLeft={7} paddingRight={7} paddingTop={6} paddingBottom={6}>
        <Flex justifyContent="space-between" gap={2} wrap="wrap">
          <Flex gap={2}>
            <FilterMenu listFilters={listFilters} />
            <AssetsSearchInput collapsible />
          </Flex>
          <Flex gap={2}>
            <SortMenu sort={listSort} showFoldersGroup={!isGridView} />
            <ViewToggle view={view} onChange={setView} iconsOnly />
          </Flex>
        </Flex>
        <FilterBadges listFilters={listFilters} />
        {/* In the fixed header with the toolbar, so the way back up stays in
            reach however far the list is scrolled. Search results are global,
            so a folder trail would be misleading there. */}
        {currentFolderId !== null && !isSearching && (
          <Box paddingTop={2}>
            <FolderBreadcrumbs
              currentFolderId={currentFolderId}
              onSelectFolder={navigateToFolderId}
            />
          </Box>
        )}
      </Box>
      <ScrollingBody>
        {/* Renders nothing — keeps every loaded page's query subscribed. */}
        {subscribers}
        <AssetsView
          view={view}
          folders={folders}
          isLoadingFolders={isLoadingFolders}
          assets={assets}
          assetsTotal={pagination?.total}
          isLoadingAssets={isLoadingAssets}
          isFetchingMore={isFetchingMore}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          error={assetsError}
          locations={itemLocations}
          searchQuery={searchQuery}
          assetsSort={listSort.assetsSort}
          foldersPosition={listSort.foldersPosition}
          hasActiveFilters={listFilters.filters.length > 0}
          onClearFilters={listFilters.clearFilters}
          onAssetItemClick={toggleAsset}
          // Uploading from the picker is out of scope; the empty state hides its CTA.
          onAddAssets={() => {}}
          canAddAssets={false}
          onClearSearch={clearSearch}
        />
      </ScrollingBody>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SelectedTab
 * -----------------------------------------------------------------------------------------------*/

// Always a grid, whatever view Browse uses: the selection is short, and its
// order (which reordering changes) reads best as tiles.
const SelectedTab = () => {
  const { formatMessage } = useIntl();
  const { selection } = usePickerSelection();
  const toggleAsset = useToggleAsset();

  return (
    <ScrollingBody>
      {/* No toolbar above this tab, so the gap under the tabs lives here. */}
      <Box paddingTop={6}>
        {selection.length === 0 ? (
          <Typography textColor="neutral600">
            {formatMessage({
              id: getTranslationKey('asset-picker.selected.empty'),
              defaultMessage: 'No asset selected yet.',
            })}
          </Typography>
        ) : (
          <ListSettingsProvider {...PICKER_LIST_SETTINGS}>
            {/* The order here is the order the field will hold. */}
            <SortableSelection>
              <AssetsGrid assets={selection} onAssetItemClick={toggleAsset} />
            </SortableSelection>
          </ListSettingsProvider>
        )}
      </Box>
    </ScrollingBody>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PickerContent
 * -----------------------------------------------------------------------------------------------*/

type PickerTab = 'browse' | 'selected';

interface PickerContentProps {
  title: string;
  initialSelection: File[];
  onClose: () => void;
  onConfirm: (files: File[]) => void;
}

const PickerContent = ({ title, initialSelection, onClose, onConfirm }: PickerContentProps) => {
  const { formatMessage } = useIntl();
  const { selection } = usePickerSelection();
  // Always Browse, even when the field already holds assets: the picker is
  // opened to add some. What it holds is one tab away, and on the field itself.
  const [activeTab, setActiveTab] = useState<PickerTab>('browse');
  const list = useAssetsListContext();

  return (
    <>
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <TabsRoot
        variant="simple"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as PickerTab)}
      >
        <Box paddingLeft={7} paddingRight={7} paddingTop={2}>
          <TabsList
            aria-label={formatMessage({
              id: getTranslationKey('asset-picker.tabs.label'),
              defaultMessage: 'Asset picker tabs',
            })}
          >
            <Tabs.Trigger value="browse">
              {formatMessage({
                id: getTranslationKey('asset-picker.tabs.browse'),
                defaultMessage: 'Browse assets',
              })}
            </Tabs.Trigger>
            <Tabs.Trigger value="selected">
              {formatMessage({
                id: getTranslationKey('asset-picker.tabs.selected'),
                defaultMessage: 'Selected assets',
              })}
              <Badge marginLeft={2}>{selection.length}</Badge>
            </Tabs.Trigger>
          </TabsList>
        </Box>
        {/* Radix makes a panel a Tab stop, meant for panels with nothing focusable
            inside. These hold controls, so focus goes straight to them. */}
        <TabPanel value="browse" tabIndex={-1}>
          <BrowseTab list={list} />
        </TabPanel>
        <TabPanel value="selected" tabIndex={selection.length > 0 ? -1 : undefined}>
          <SelectedTab />
        </TabPanel>
      </TabsRoot>
      <Footer>
        <Button variant="tertiary" onClick={onClose}>
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button
          disabled={isSameSelection(selection, initialSelection)}
          onClick={() => onConfirm(selection)}
        >
          {formatMessage({
            id: getTranslationKey('asset-picker.confirm'),
            defaultMessage: 'Confirm',
          })}
        </Button>
      </Footer>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetPickerDialog
 * -----------------------------------------------------------------------------------------------*/

// The list is read above the selection provider (which resolves picked keys
// against the loaded assets) and below it (the Browse tab renders it). One
// instance, shared, so tab switches keep the pages already loaded.
const AssetsListContext = createContext<AssetsList | null>(null);

const useAssetsListContext = () => {
  const context = useContext(AssetsListContext);

  if (!context) {
    throw new Error('useAssetsListContext must be used within the asset picker');
  }

  return context;
};

interface PickerSelectionRootProps {
  children: ReactNode;
  initialSelection: File[];
  multiple: boolean;
  allowedTypes?: MediaAllowedTypes | null;
}

const PickerSelectionRoot = ({
  children,
  initialSelection,
  multiple,
  allowedTypes,
}: PickerSelectionRootProps) => {
  const list = useAssetsList();

  return (
    <AssetsListContext.Provider value={list}>
      <PickerSelectionProvider
        initialSelection={initialSelection}
        multiple={multiple}
        allowedTypes={allowedTypes}
        knownFiles={list.assets}
      >
        {children}
      </PickerSelectionProvider>
    </AssetsListContext.Provider>
  );
};

export interface AssetPickerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What the field holds now; the picker starts with it selected. */
  initialSelection?: File[];
  multiple?: boolean;
  allowedTypes?: MediaAllowedTypes | null;
  /** The confirmed selection, in order. Always an array, even for a single field. */
  onConfirm: (files: File[]) => void;
}

const NO_FILES: File[] = [];

interface ReadAccessGateProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
}

/**
 * Picking only needs read access to the library. Without it the picker says so
 * and mounts nothing that would fetch assets or folders.
 */
const ReadAccessGate = ({ children, title, onClose }: ReadAccessGateProps) => {
  const { formatMessage } = useIntl();
  const { canRead, isLoading } = useMediaLibraryPermissions();

  if (canRead) {
    return children;
  }

  return (
    <>
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Flex flex={1} justifyContent="center" alignItems="center">
        {isLoading ? (
          <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
        ) : (
          <Page.NoPermissions />
        )}
      </Flex>
      <Footer>
        <Button variant="tertiary" onClick={onClose}>
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
      </Footer>
    </>
  );
};

/**
 * Content Manager asset picker, built on the current Media Library list. Its
 * folder, search, filter and sort state lives in memory, so browsing never
 * touches the URL of the entry it is opened from.
 */
export const AssetPickerDialog = ({
  open,
  onClose,
  title,
  initialSelection = NO_FILES,
  multiple = false,
  allowedTypes,
  onConfirm,
}: AssetPickerDialogProps) => (
  <Modal.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <StyledModalContent>
      <ReadAccessGate title={title} onClose={onClose}>
        {/* Inside the content so every opening starts from fresh list and selection state. */}
        <ListQueryStateProvider>
          <ListSettingsProvider {...PICKER_LIST_SETTINGS} showSectionHeadings showGridSelectAll>
            <PickerSelectionRoot
              initialSelection={initialSelection}
              multiple={multiple}
              allowedTypes={allowedTypes}
            >
              <PickerContent
                title={title}
                initialSelection={initialSelection}
                onClose={onClose}
                onConfirm={onConfirm}
              />
            </PickerSelectionRoot>
          </ListSettingsProvider>
        </ListQueryStateProvider>
      </ReadAccessGate>
    </StyledModalContent>
  </Modal.Root>
);
