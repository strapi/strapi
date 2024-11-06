// TODO: find a better naming convention for the file that was an index file before
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
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { localStorageKeys, viewOptions } from '../../../constants';
import { useFolder } from '../../../hooks/useFolder';
import { usePersistentState } from '../../../hooks/usePersistentState';
import {
  getBreadcrumbDataCM,
  toSingularTypes,
  getTrad,
  getAllowedFiles,
  BreadcrumbDataFolder,
  AllowedFiles,
} from '../../../utils';
import { AssetGridList } from '../../AssetGridList/AssetGridList';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';
import { EmptyAssets } from '../../EmptyAssets/EmptyAssets';
import { FolderCard } from '../../FolderCard/FolderCard/FolderCard';
import { FolderCardBody } from '../../FolderCard/FolderCardBody/FolderCardBody';
import { FolderCardBodyAction } from '../../FolderCard/FolderCardBodyAction/FolderCardBodyAction';
import { FolderGridList } from '../../FolderGridList/FolderGridList';
import { SortPicker } from '../../SortPicker/SortPicker';
import { TableList, FolderRow, FileRow } from '../../TableList/TableList';

import { Filters, FilterStructure as ImportedFilterStructure } from './Filters';
import { PageSize } from './PageSize';
import { PaginationFooter } from './PaginationFooter/PaginationFooter';
import { SearchAsset } from './SearchAsset/SearchAsset';
import { isSelectable } from './utils/isSelectable';

import type { File, Query, FilterCondition } from '../../../../../shared/contracts/files';
import type { Folder } from '../../../../../shared/contracts/folders';
import type { AllowedTypes } from '../../AssetCard/AssetCard';

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

type NumberKeyedObject = Record<number, string>;

type StringFilter = {
  [key: string]: string;
};

type MimeFilter = {
  [key: string]:
    | string
    | NumberKeyedObject
    | Record<string, string | NumberKeyedObject>
    | undefined;
};

export type FilterStructure = {
  [key: string]: MimeFilter | StringFilter | undefined;
};

export type Filter = {
  [key in 'mime' | 'createdAt' | 'updatedAt']?:
    | {
        [key in '$contains' | '$notContains' | '$eq' | '$not']?:
          | string[]
          | string
          | { $contains: string[] };
      }
    | undefined;
};

export interface FolderWithType extends Omit<Folder, 'children' | 'files'> {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
  children?: Folder['children'] & {
    count: number;
  };
  files?: Folder['files'] & {
    count: number;
  };
}

export interface FileWithType extends File {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
}

export interface BrowseStepProps {
  allowedTypes?: AllowedTypes[];
  assets: File[];
  canCreate: boolean;
  canRead: boolean;
  folders?: FolderWithType[];
  multiple?: boolean;
  onAddAsset: () => void;
  onChangeFilters: (filters: FilterCondition<string>[] | Filter[]) => void;
  onChangeFolder: (id: number, path?: string) => void;
  onChangePage: (page: number) => void;
  onChangePageSize: (value: number) => void;
  onChangeSort: (value: Query['sort'] | string) => void;
  onChangeSearch: (_q?: Query['_q'] | null) => void;
  onEditAsset: ((asset: FileWithType) => void) | null;
  onEditFolder: ((folder: FolderRow) => void) | null;
  onSelectAsset: (element: FileRow | FolderRow) => void;
  onSelectAllAsset?: (checked: boolean | string, rows?: FolderRow[] | FileRow[]) => void;
  queryObject: Query;
  pagination: { pageCount: number };
  selectedAssets: FileWithType[] | FolderWithType[];
}

export const BrowseStep = ({
  allowedTypes = [],
  assets: rawAssets,
  canCreate,
  canRead,
  folders = [],
  multiple = false,
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
}: BrowseStepProps) => {
  const { formatMessage } = useIntl();
  const [view, setView] = usePersistentState(localStorageKeys.modalView, viewOptions.GRID);
  const isGridView = view === viewOptions.GRID;

  const { data: currentFolder, isLoading: isCurrentFolderLoading } = useFolder(
    queryObject?.folder as number | null | undefined,
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

  const breadcrumbs = !isCurrentFolderLoading
    ? getBreadcrumbDataCM(currentFolder as BreadcrumbDataFolder)
    : undefined;

  const allAllowedAsset = getAllowedFiles(allowedTypes, assets as AllowedFiles[]);
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
  const isFiltering = !!queryObject?.filters?.$and?.length && queryObject.filters.$and.length > 0;
  const isSearchingOrFiltering = isSearching || isFiltering;
  const assetCount = assets.length;
  const folderCount = folders.length;
  const handleClickFolderCard = (...args: Parameters<typeof onChangeFolder>) => {
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
                  appliedFilters={queryObject?.filters?.$and as ImportedFilterStructure[]}
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

      {canRead && breadcrumbs?.length && breadcrumbs.length > 0 && currentFolder && (
        <Box paddingTop={3}>
          <Breadcrumbs
            onChangeFolder={onChangeFolder}
            label={formatMessage({
              id: getTrad('header.breadcrumbs.nav.label'),
              defaultMessage: 'Folders navigation',
            })}
            breadcrumbs={breadcrumbs as BreadcrumbDataFolder[]}
            currentFolderId={queryObject?.folder as number | undefined}
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
          onSelectAll={onSelectAllAsset!}
          rows={
            [...folders.map((folder) => ({ ...folder, type: 'folder' })), ...assets] as
              | FolderRow[]
              | FileRow[]
          }
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
                                  folderCount: folder.children?.count,
                                  filesCount: folder.files?.count,
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
                selectedAssets={selectedAssets as FileWithType[]}
                onEditAsset={onEditAsset!}
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
          <PageSize
            pageSize={queryObject.pageSize! as number}
            onChangePageSize={onChangePageSize}
          />
          <PaginationFooter
            activePage={queryObject.page as number}
            onChangePage={onChangePage}
            pagination={pagination}
          />
        </Flex>
      )}
    </Box>
  );
};
