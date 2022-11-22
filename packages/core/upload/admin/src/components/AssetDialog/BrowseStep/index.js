import React from 'react';
import { toUpper } from 'lodash';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';

import { usePersistentState } from '@strapi/helper-plugin';
import { Button } from '@strapi/design-system/Button';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { GridItem } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { IconButton } from '@strapi/design-system/IconButton';
import PencilIcon from '@strapi/icons/Pencil';
import PlusIcon from '@strapi/icons/Plus';
import Grid from '@strapi/icons/Grid';
import List from '@strapi/icons/List';

import { FolderDefinition, AssetDefinition, viewOptions } from '../../../constants';
import getTrad from '../../../utils/getTrad';
import { getBreadcrumbDataCM } from '../../../utils';
import getAllowedFiles from '../../../utils/getAllowedFiles';
import { AssetGridList } from '../../AssetGridList';
import { FolderList } from '../../FolderList';
import { EmptyAssets } from '../../EmptyAssets';
import { Breadcrumbs } from '../../Breadcrumbs';
import SortPicker from '../../SortPicker';
import { useFolder } from '../../../hooks/useFolder';
import { FolderCard, FolderCardBody, FolderCardBodyAction } from '../../FolderCard';
import { Filters } from './Filters';
import PaginationFooter from './PaginationFooter';
import PageSize from './PageSize';
import SearchAsset from './SearchAsset';
import pluginId from '../../../pluginId';

const StartBlockActions = styled(Flex)`
  & > * + * {
    margin-left: ${({ theme }) => theme.spaces[2]};
  }
  margin-left: ${({ pullRight }) => (pullRight ? 'auto' : undefined)};
`;

const EndBlockActions = styled(StartBlockActions)`
  flex-shrink: 0;
`;

const TypographyMaxWidth = styled(Typography)`
  max-width: 100%;
`;

const ActionContainer = styled(Box)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral900};
    }
  }
`;

export const BrowseStep = ({
  allowedTypes,
  assets,
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
  const [view, setView] = usePersistentState(
    `STRAPI_${toUpper(pluginId)}_MODAL_VIEW`,
    viewOptions.GRID
  );
  const isGridView = view === viewOptions.GRID;

  const { data: currentFolder, isLoading: isCurrentFolderLoading } = useFolder(
    queryObject?.folder,
    {
      enabled: canRead && !!queryObject?.folder,
    }
  );

  const breadcrumbs = !isCurrentFolderLoading && getBreadcrumbDataCM(currentFolder);

  const allAllowedAsset = getAllowedFiles(allowedTypes, assets);
  const areAllAssetSelected =
    allAllowedAsset.every(
      (asset) => selectedAssets.findIndex((currAsset) => currAsset.id === asset.id) !== -1
    ) && selectedAssets.length > 0;
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
        <Box>
          <Flex justifyContent="space-between" alignItems="flex-start">
            {(assetCount > 0 || folderCount > 0 || isFiltering) && (
              <StartBlockActions wrap="wrap">
                {multiple && (
                  <Flex
                    paddingLeft={2}
                    paddingRight={2}
                    background="neutral0"
                    hasRadius
                    borderColor="neutral200"
                    height={`${32 / 16}rem`}
                  >
                    <BaseCheckbox
                      aria-label={formatMessage({
                        id: getTrad('bulk.select.label'),
                        defaultMessage: 'Select all assets',
                      })}
                      indeterminate={!areAllAssetSelected && hasSomeAssetSelected}
                      value={areAllAssetSelected}
                      onChange={onSelectAllAsset}
                    />
                  </Flex>
                )}
                <SortPicker onChangeSort={onChangeSort} />
                <Filters
                  appliedFilters={queryObject?.filters?.$and}
                  onChangeFilters={onChangeFilters}
                />
              </StartBlockActions>
            )}

            {(assetCount > 0 || folderCount > 0 || isSearching) && (
              <EndBlockActions pullRight>
                <ActionContainer paddingTop={1} paddingBottom={1}>
                  <IconButton
                    data-testid={`switch-to-${isGridView ? 'list' : 'grid'}-view`}
                    icon={isGridView ? <List /> : <Grid />}
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
                  />
                </ActionContainer>
                <SearchAsset onChangeSearch={onChangeSearch} queryValue={queryObject._q || ''} />
              </EndBlockActions>
            )}
          </Flex>
        </Box>
      )}

      {canRead && breadcrumbs?.length > 0 && currentFolder && (
        <Box paddingTop={3}>
          <Breadcrumbs
            onChangeFolder={onChangeFolder}
            as="nav"
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
                <Button variant="secondary" startIcon={<PlusIcon />} onClick={onAddAsset}>
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

      {folderCount > 0 && (
        <FolderList
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
              <GridItem col={3} key={`folder-${folder.id}`}>
                <FolderCard
                  ariaLabel={folder.name}
                  id={`folder-${folder.id}`}
                  onClick={() => handleClickFolderCard(folder.id)}
                  cardActions={
                    onEditFolder && (
                      <IconButton
                        icon={<PencilIcon />}
                        aria-label={formatMessage({
                          id: getTrad('list.folder.edit'),
                          defaultMessage: 'Edit folder',
                        })}
                        onClick={() => onEditFolder(folder)}
                      />
                    )
                  }
                >
                  <FolderCardBody>
                    <FolderCardBodyAction onClick={() => handleClickFolderCard(folder.id)}>
                      <Flex as="h2" direction="column" alignItems="start" maxWidth="100%">
                        <TypographyMaxWidth fontWeight="semiBold" ellipsis>
                          {folder.name}
                          <VisuallyHidden>:</VisuallyHidden>
                        </TypographyMaxWidth>
                        <TypographyMaxWidth as="span" textColor="neutral600" variant="pi" ellipsis>
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
              </GridItem>
            );
          })}
        </FolderList>
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
  onEditAsset: undefined,
  onEditFolder: undefined,
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
  onEditAsset: PropTypes.func,
  onEditFolder: PropTypes.func,
  onSelectAsset: PropTypes.func.isRequired,
  onSelectAllAsset: PropTypes.func,
  queryObject: PropTypes.shape({
    filters: PropTypes.object,
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    _q: PropTypes.string,
    folder: PropTypes.number,
  }).isRequired,
  pagination: PropTypes.shape({ pageCount: PropTypes.number.isRequired }).isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
