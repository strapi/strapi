import { useMemo, useState } from 'react';

import { usePersistentState } from '@strapi/admin/strapi-admin';
import { Badge, Box, Button, Flex, Modal, Tabs, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetsSearchInput } from '../../pages/Assets/components/AssetsSearchInput';
import { AssetsView } from '../../pages/Assets/components/AssetsView';
import { FilterBadges } from '../../pages/Assets/components/FilterBadges';
import { FilterMenu } from '../../pages/Assets/components/FilterMenu';
import { SortMenu } from '../../pages/Assets/components/SortMenu';
import { ViewToggle } from '../../pages/Assets/components/ViewToggle';
import { localStorageKeys, viewOptions } from '../../pages/Assets/constants';
import { AssetSelectionProvider } from '../../pages/Assets/hooks/useAssetSelection';
import { useAssetsList } from '../../pages/Assets/hooks/useAssetsList';
import { ListQueryStateProvider } from '../../pages/Assets/hooks/useListQueryParams';
import { ListSettingsProvider } from '../../pages/Assets/hooks/useListSettings';
import { buildItemLocations } from '../../utils/itemLocations';
import { getTranslationKey } from '../../utils/translations';

import { FolderBreadcrumbs } from './FolderBreadcrumbs';

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
 * BrowseTab
 * -----------------------------------------------------------------------------------------------*/

const BrowseTab = () => {
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
  } = useAssetsList();

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
            <AssetsSearchInput />
          </Flex>
          <Flex gap={2}>
            <SortMenu sort={listSort} showFoldersGroup={!isGridView} />
            <ViewToggle view={view} onChange={setView} iconsOnly />
          </Flex>
        </Flex>
        <FilterBadges listFilters={listFilters} />
      </Box>
      <ScrollingBody>
        {/* Renders nothing — keeps every loaded page's query subscribed. */}
        {subscribers}
        {/* Search results are global, so a folder trail would be misleading. */}
        {currentFolderId !== null && !isSearching && (
          <Box paddingBottom={6}>
            <FolderBreadcrumbs
              currentFolderId={currentFolderId}
              onSelectFolder={navigateToFolderId}
            />
          </Box>
        )}
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
          // Selecting comes with the picker selection model.
          onAssetItemClick={() => {}}
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
 * AssetPickerDialog
 * -----------------------------------------------------------------------------------------------*/

type PickerTab = 'browse' | 'selected';

export interface AssetPickerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
}

/**
 * Content Manager asset picker, built on the current Media Library list. Its
 * folder, search, filter and sort state lives in memory, so browsing never
 * touches the URL of the entry it is opened from.
 */
export const AssetPickerDialog = ({ open, onClose, title }: AssetPickerDialogProps) => {
  const { formatMessage } = useIntl();
  const [activeTab, setActiveTab] = useState<PickerTab>('browse');

  return (
    <Modal.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <StyledModalContent>
        {/* Inside the content so every opening starts from a fresh list state. */}
        <ListQueryStateProvider>
          <ListSettingsProvider
            showItemActions={false}
            showSectionHeadings
            // Three tiles per row in the 672px content width.
            gridMinTileWidth="200px"
          >
            <AssetSelectionProvider disabled>
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
                      <Badge marginLeft={2}>0</Badge>
                    </Tabs.Trigger>
                  </TabsList>
                </Box>
                <TabPanel value="browse">
                  <BrowseTab />
                </TabPanel>
                <TabPanel value="selected">
                  <ScrollingBody>
                    {/* No toolbar above this tab, so the gap under the tabs lives here. */}
                    <Box paddingTop={6}>
                      <Typography textColor="neutral600">
                        {formatMessage({
                          id: getTranslationKey('asset-picker.selected.empty'),
                          defaultMessage: 'No asset selected yet.',
                        })}
                      </Typography>
                    </Box>
                  </ScrollingBody>
                </TabPanel>
              </TabsRoot>
              <Footer>
                <Button variant="tertiary" onClick={onClose}>
                  {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
                </Button>
                <Button disabled>
                  {formatMessage({
                    id: getTranslationKey('asset-picker.confirm'),
                    defaultMessage: 'Add',
                  })}
                </Button>
              </Footer>
            </AssetSelectionProvider>
          </ListSettingsProvider>
        </ListQueryStateProvider>
      </StyledModalContent>
    </Modal.Root>
  );
};
