import React from 'react';

import {
  Checkbox,
  Box,
  Button,
  Divider,
  Flex,
  IconButton,
  Typography,
  VisuallyHidden,
  Grid,
} from '@strapi/design-system';
import { GridFour as GridIcon, List, Pencil, Plus } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  AssetDefinition,
  FolderDefinition,
  localStorageKeys,
  viewOptions,
} from '../../../constants';
import { useFolder } from '../../../hooks/useFolder';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { getBreadcrumbDataCM, toSingularTypes, getTrad, getAllowedFiles } from '../../../utils';
import { AssetGridList } from '../../AssetGridList';
import { Breadcrumbs } from '../../Breadcrumbs';
import { EmptyAssets } from '../../EmptyAssets';
import { FolderCard, FolderCardBody, FolderCardBodyAction } from '../../FolderCard';
import { FolderGridList } from '../../FolderGridList';
import SortPicker from '../../SortPicker';
import { TableList } from '../../TableList';

import { Filters } from './Filters';
import PageSize from './PageSize';
import PaginationFooter from './PaginationFooter';
import SearchAsset from './SearchAsset';
import { isSelectable } from './utils/isSelectable';

const TypographyMaxWidth = styled(Typography)`
  max-width: 100%;
`;

const ActionContainer = styled(Box)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

export const BrowseStep = ({
  allowedTypes,
  assets: rawAssets,
  canCreate,
  canRead,
  folders,
  multiple,
  onAddAsset,
  onChangeFilters,
  onChangePage,
  onChangePageSize,
  onChangeSearch,
  onChangeSort,
  onChangeFolder,
  onEditAsset,
  onEditFolder,
  onSelectAllAsset,
  onSelectAsset,
  pagination,
  queryObject,
  selectedAssets,
}) => {
  const { formatMessage } = useIntl();
  const [view, setView] = usePersistentState(localStorageKeys.modalView, viewOptions.GRID);
  const isGridView = view === viewOptions.GRID;

  const { data: currentFolder, isLoading: isCurrentFolderLoading } = useFolder(
    queryObject?.folder,
    {
      enabled: canRead && !!queryObject?.folder,
    }
  );

  const singularTypes = toSingularTypes(allowedTypes);
  const assets = rawAssets.map((asset) => ({
    ...asset,
    isSelectable: isSelectable(singularTypes, asset?.mime),
    type: 'asset',
  }));

  const breadcrumbs = !isCurrentFolderLoading && getBreadcrumbDataCM(currentFolder);

  const allAllowedAsset = getAllowedFiles(allowedTypes, assets);
  const areAllAssetSelected =
    allAllowedAsset.length > 0 &&
    selectedAssets.length > 0 &&
    allAllowedAsset.every(
      (asset) => selectedAssets.findIndex((currAsset) => currAsset.id === asset.id) !== -1
    );
  const hasSomeAssetSelected = allAllowedAsset.some(
    (asset) => selectedAssets.findIndex((currAsset) => currAsset.id === asset.id) !== -1
  );
  const isSearching = !!queryObject?._q;
  const isFiltering = queryObject?.filters?.$and?.length > 0;
  const isSearchingOrFiltering = isSearching || isFiltering;
  const assetCount = assets.length;
  const folderCount = folders.length;
  const handleClickFolderCard = (...args) => {
    // Search query will always fetch the same results
    // we remove it here to allow navigating in a folder and see the result of this navigation
    onChangeSearch('');
    onChangeFolder(...args);
  };

  return (
    <Box>
      {onSelectAllAsset && (
        <Box paddingBottom={4}>
          <Flex justifyContent="space-between" alignItems="flex-start">
            {(assetCount > 0 || folderCount > 0 || isFiltering) && (
              <Flex gap={2} wrap="wrap">
                {multiple && isGridView && (
                  <Flex
                    paddingLeft={2}
                    paddingRight={2}
                    background="neutral0"
                    hasRadius
                    borderColor="neutral200"
                    height="3.2rem"
                  >
                    <Checkbox
                      aria-label={formatMessage({
                        id: getTrad('bulk.select.label'),
                        defaultMessage: 'Select all assets',
                      })}
                      checked={
                        !areAllAssetSelected && hasSomeAssetSelected
                          ? 'indeterminate'
                          : areAllAssetSelected
                      }
                      onCheckedChange={onSelectAllAsset}
                    />
                  </Flex>
                )}
                {isGridView && <SortPicker onChangeSort={onChangeSort} value={queryObject?.sort} />}
                <Filters
                  appliedFilters={queryObject?.filters?.$and}
                  onChangeFilters={onChangeFilters}
                />
              </Flex>
            )}

            {(assetCount > 0 || folderCount > 0 || isSearching) && (
              <Flex marginLeft="auto" shrink={0} gap={2}>
                <ActionContainer paddingTop={1} paddingBottom={1}>
                  <IconButton
                    label={
                      isGridView
                        ? formatMessage({
                            id: 'view-switch.list',
                            defaultMessage: 'List View',
                          })
                        : formatMessage({
                            id: 'view-switch.grid',
                            defaultMessage: 'Grid View',
                          })
                    }
                    onClick={() => setView(isGridView ? viewOptions.LIST : viewOptions.GRID)}
                  >
                    {isGridView ? <List /> : <GridIcon />}
                  </IconButton>
                </ActionContainer>
                <SearchAsset onChangeSearch={onChangeSearch} queryValue={queryObject._q || ''} />
              </Flex>
            )}
          </Flex>
        </Box>
      )}

      {canRead && breadcrumbs?.length > 0 && currentFolder && (
        <Box paddingTop={3}>
          <Breadcrumbs
            onChangeFolder={onChangeFolder}
            tag="nav"
            label={formatMessage({
              id: getTrad('header.breadcrumbs.nav.label'),
              defaultMessage: 'Folders navigation',
            })}
            breadcrumbs={breadcrumbs}
            currentFolderId={queryObject?.folder}
          />
        </Box>
      )}

      {assetCount === 0 && folderCount === 0 && (
        <Box paddingBottom={6}>
          <EmptyAssets
            size="S"
            count={6}
            action={
              canCreate &&
              !isFiltering &&
              !isSearching && (
                <Button variant="secondary" startIcon={<Plus />} onClick={onAddAsset}>
                  {formatMessage({
                    id: getTrad('header.actions.add-assets'),
                    defaultMessage: 'Add new assets',
                  })}
                </Button>
              )
            }
            content={
              // eslint-disable-next-line no-nested-ternary
              isSearchingOrFiltering
                ? formatMessage({
                    id: getTrad('list.assets-empty.title-withSearch'),
                    defaultMessage: 'There are no assets with the applied filters',
                  })
                : canCreate && !isSearching
                  ? formatMessage({
                      id: getTrad('list.assets.empty'),
                      defaultMessage: 'Upload your first assets...',
                    })
                  : formatMessage({
                      id: getTrad('list.assets.empty.no-permissions'),
                      defaultMessage: 'The asset list is empty',
                    })
            }
          />
        </Box>
      )}

      {!isGridView && (folderCount > 0 || assetCount > 0) && (
        <TableList
          allowedTypes={allowedTypes}
          assetCount={assetCount}
          folderCount={folderCount}
          indeterminate={!areAllAssetSelected && hasSomeAssetSelected}
          isFolderSelectionAllowed={false}
          onChangeSort={onChangeSort}
          onChangeFolder={handleClickFolderCard}
          onEditAsset={onEditAsset}
          onEditFolder={onEditFolder}
          onSelectOne={onSelectAsset}
          onSelectAll={onSelectAllAsset}
          rows={[...folders.map((folder) => ({ ...folder, type: 'folder' })), ...assets]}
          selected={selectedAssets}
          shouldDisableBulkSelect={!multiple}
          sortQuery={queryObject?.sort ?? ''}
        />
      )}

      {isGridView && (
        <>
          {folderCount > 0 && (
            <FolderGridList
              title={
                (((isSearchingOrFiltering && assetCount > 0) || !isSearchingOrFiltering) &&
                  formatMessage(
                    {
                      id: getTrad('list.folders.title'),
                      defaultMessage: 'Folders ({count})',
                    },
                    { count: folderCount }
                  )) ||
                ''
              }
            >
              {folders.map((folder) => {
                return (
                  <Grid.Item
                    col={3}
                    key={`folder-${folder.id}`}
                    direction="column"
                    alignItems="stretch"
                  >
                    <FolderCard
                      ariaLabel={folder.name}
                      id={`folder-${folder.id}`}
                      onClick={() => handleClickFolderCard(folder.id, folder.path)}
                      cardActions={
                        onEditFolder && (
                          <IconButton
                            withTooltip={false}
                            label={formatMessage({
                              id: getTrad('list.folder.edit'),
                              defaultMessage: 'Edit folder',
                            })}
                            onClick={() => onEditFolder(folder)}
                          >
                            <Pencil />
                          </IconButton>
                        )
                      }
                    >
                      <FolderCardBody>
                        <FolderCardBodyAction
                          onClick={() => handleClickFolderCard(folder.id, folder.path)}
                        >
                          <Flex tag="h2" direction="column" alignItems="start" maxWidth="100%">
                            <TypographyMaxWidth
                              fontWeight="semiBold"
                              ellipsis
                              textColor="neutral800"
                            >
                              {folder.name}
                              {/* VisuallyHidden dash here allows to separate folder title and count informations
                              for voice reading structure purpose */}
                              <VisuallyHidden>-</VisuallyHidden>
                            </TypographyMaxWidth>
                            <TypographyMaxWidth
                              tag="span"
                              textColor="neutral600"
                              variant="pi"
                              ellipsis
                            >
                              {formatMessage(
                                {
                                  id: getTrad('list.folder.subtitle'),
                                  defaultMessage:
                                    '{folderCount, plural, =0 {# folder} one {# folder} other {# folders}}, {filesCount, plural, =0 {# asset} one {# asset} other {# assets}}',
                                },
                                {
                                  folderCount: folder.children.count,
                                  filesCount: folder.files.count,
                                }
                              )}
                            </TypographyMaxWidth>
                          </Flex>
                        </FolderCardBodyAction>
                      </FolderCardBody>
                    </FolderCard>
                  </Grid.Item>
                );
              })}
            </FolderGridList>
          )}

          {assetCount > 0 && folderCount > 0 && (
            <Box paddingTop={6}>
              <Divider />
            </Box>
          )}

          {assetCount > 0 && (
            <Box paddingTop={6}>
              <AssetGridList
                allowedTypes={allowedTypes}
                size="S"
                assets={assets}
                onSelectAsset={onSelectAsset}
                selectedAssets={selectedAssets}
                onEditAsset={onEditAsset}
                title={
                  ((!isSearchingOrFiltering || (isSearchingOrFiltering && folderCount > 0)) &&
                    queryObject.page === 1 &&
                    formatMessage(
                      {
                        id: getTrad('list.assets.title'),
                        defaultMessage: 'Assets ({count})',
                      },
                      { count: assetCount }
                    )) ||
                  ''
                }
              />
            </Box>
          )}
        </>
      )}

      {pagination.pageCount > 0 && (
        <Flex justifyContent="space-between" paddingTop={4}>
          <PageSize pageSize={queryObject.pageSize} onChangePageSize={onChangePageSize} />
          <PaginationFooter
            activePage={queryObject.page}
            onChangePage={onChangePage}
            pagination={pagination}
          />
        </Flex>
      )}
    </Box>
  );
};

BrowseStep.defaultProps = {
  allowedTypes: [],
  folders: [],
  multiple: false,
  onSelectAllAsset: undefined,
};
BrowseStep.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
  canCreate: PropTypes.bool.isRequired,
  canRead: PropTypes.bool.isRequired,
  folders: PropTypes.arrayOf(FolderDefinition),
  multiple: PropTypes.bool,
  onAddAsset: PropTypes.func.isRequired,
  onChangeFilters: PropTypes.func.isRequired,
  onChangeFolder: PropTypes.func.isRequired,
  onChangePage: PropTypes.func.isRequired,
  onChangePageSize: PropTypes.func.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onChangeSearch: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onEditFolder: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func,
  queryObject: PropTypes.shape({
    filters: PropTypes.object,
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    _q: PropTypes.string,
    sort: PropTypes.string,
    folder: PropTypes.number,
  }).isRequired,
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
