import React, { useRef, useState } from 'react';

import {
  Page,
  SearchInput,
  Pagination,
  useTracking,
  useQueryParams,
  Layouts,
} from '@strapi/admin/strapi-admin';
import {
  Checkbox,
  Box,
  Divider,
  Flex,
  IconButton,
  Typography,
  VisuallyHidden,
  Grid,
} from '@strapi/design-system';
import { Cog, GridFour as GridIcon, List, Pencil } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link as ReactRouterLink, useNavigate, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { AssetGridList } from '../../../components/AssetGridList';
import { EditAssetDialog } from '../../../components/EditAssetDialog';
import { EditFolderDialog } from '../../../components/EditFolderDialog';
import {
  FolderCard,
  FolderCardBody,
  FolderCardBodyAction,
  FolderCardCheckbox,
} from '../../../components/FolderCard';
import { FolderGridList } from '../../../components/FolderGridList';
import SortPicker from '../../../components/SortPicker';
import { TableList } from '../../../components/TableList';
import { UploadAssetDialog } from '../../../components/UploadAssetDialog/UploadAssetDialog';
import { localStorageKeys, viewOptions } from '../../../constants';
import { useAssets } from '../../../hooks/useAssets';
import { useFolder } from '../../../hooks/useFolder';
import { useFolders } from '../../../hooks/useFolders';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { useSelectionState } from '../../../hooks/useSelectionState';
import { containsAssetFilter, getBreadcrumbDataML, getFolderURL, getTrad } from '../../../utils';

import { BulkActions } from './components/BulkActions';
import { EmptyOrNoPermissions } from './components/EmptyOrNoPermissions';
import { Filters } from './components/Filters';
import { Header } from './components/Header';

const BoxWithHeight = styled(Box)`
  height: 3.2rem;
  display: flex;
  align-items: center;
`;

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

export const MediaLibrary = () => {
  const navigate = useNavigate();
  const {
    canRead,
    canCreate,
    canUpdate,
    canCopyLink,
    canDownload,
    canConfigureView,
    isLoading: permissionsLoading,
  } = useMediaLibraryPermissions();
  const currentFolderToEditRef = useRef();
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const { trackUsage } = useTracking();
  const [{ query }, setQuery] = useQueryParams();
  const isFiltering = Boolean(query._q || query.filters);
  const [view, setView] = usePersistentState(localStorageKeys.view, viewOptions.GRID);
  const isGridView = view === viewOptions.GRID;

  const {
    data: assetsData,
    isLoading: assetsLoading,
    errors: assetsError,
  } = useAssets({
    skipWhen: !canRead,
    query,
  });

  const {
    data: foldersData,
    isLoading: foldersLoading,
    errors: foldersError,
  } = useFolders({
    enabled: canRead && assetsData?.pagination?.page === 1 && !containsAssetFilter(query),
    query,
  });

  const {
    data: currentFolder,
    isLoading: isCurrentFolderLoading,
    error: currentFolderError,
  } = useFolder(query?.folder, {
    enabled: canRead && !!query?.folder,
  });

  // Folder was not found: redirect to the media library root
  if (currentFolderError?.response?.status === 404) {
    navigate(pathname);
  }

  const folders =
    foldersData?.map((folder) => ({
      ...folder,
      type: 'folder',
      folderURL: getFolderURL(pathname, query, folder.id),
      isSelectable: canUpdate,
    })) ?? [];
  const folderCount = folders?.length || 0;
  const assets =
    assetsData?.results?.map((asset) => ({ ...asset, type: 'asset', isSelectable: canUpdate })) ||
    [];
  const assetCount = assets?.length ?? 0;
  const totalAssetCount = assetsData?.pagination?.total;

  const isLoading = isCurrentFolderLoading || foldersLoading || permissionsLoading || assetsLoading;
  const [showUploadAssetDialog, setShowUploadAssetDialog] = useState(false);
  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const [folderToEdit, setFolderToEdit] = useState(undefined);
  const [selected, { selectOne, selectAll }] = useSelectionState(['type', 'id'], []);
  const indeterminateBulkSelect =
    selected?.length > 0 && selected?.length !== assetCount + folderCount;
  const toggleUploadAssetDialog = () => setShowUploadAssetDialog((prev) => !prev);
  const toggleEditFolderDialog = ({ created = false } = {}) => {
    // folders are only displayed on the first page, therefore
    // we have to navigate the user to that page, in case a folder
    // was created successfully in order for them to see it
    if (created && query?.page !== '1') {
      setQuery({
        ...query,
        page: 1,
      });
    }

    setShowEditFolderDialog((prev) => !prev);
  };

  const handleBulkSelect = (checked, elements) => {
    if (checked) {
      trackUsage('didSelectAllMediaLibraryElements');
    }

    selectAll(elements);
  };

  const handleChangeSort = (value) => {
    trackUsage('didSortMediaLibraryElements', {
      location: 'upload',
      sort: value,
    });
    setQuery({ sort: value });
  };

  const handleEditFolder = (folder) => {
    setFolderToEdit(folder);
    setShowEditFolderDialog(true);
  };

  const handleEditFolderClose = (payload) => {
    setFolderToEdit(null);
    toggleEditFolderDialog(payload);

    if (currentFolderToEditRef.current) {
      currentFolderToEditRef.current.focus();
    }
  };

  const handleAssetDeleted = (numberOfAssets) => {
    if (
      numberOfAssets === assetCount &&
      assetsData.pagination.page === assetsData.pagination.pageCount &&
      assetsData.pagination.page > 1
    ) {
      setQuery({
        ...query,
        page: assetsData.pagination.page - 1,
      });
    }
  };

  const handleBulkActionSuccess = () => {
    selectAll();

    handleAssetDeleted(selected.length);
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  if (assetsError || foldersError) {
    return <Page.Error />;
  }

  return (
    <Layouts.Root>
      <Page.Main>
        <Header
          breadcrumbs={
            !isCurrentFolderLoading && getBreadcrumbDataML(currentFolder, { pathname, query })
          }
          canCreate={canCreate}
          onToggleEditFolderDialog={toggleEditFolderDialog}
          onToggleUploadAssetDialog={toggleUploadAssetDialog}
          folder={currentFolder}
        />
        <Layouts.Action
          startActions={
            <>
              {canUpdate && isGridView && (assetCount > 0 || folderCount > 0) && (
                <BoxWithHeight
                  paddingLeft={2}
                  paddingRight={2}
                  background="neutral0"
                  hasRadius
                  borderColor="neutral200"
                >
                  <Checkbox
                    aria-label={formatMessage({
                      id: getTrad('bulk.select.label'),
                      defaultMessage: 'Select all folders & assets',
                    })}
                    checked={
                      indeterminateBulkSelect
                        ? 'indeterminate'
                        : (assetCount > 0 || folderCount > 0) &&
                          selected.length === assetCount + folderCount
                    }
                    onCheckedChange={(e) => handleBulkSelect(e, [...assets, ...folders])}
                  />
                </BoxWithHeight>
              )}
              {canRead && isGridView && (
                <SortPicker value={query?.sort} onChangeSort={handleChangeSort} />
              )}
              {canRead && <Filters />}
            </>
          }
          endActions={
            <>
              {canConfigureView ? (
                <ActionContainer paddingTop={1} paddingBottom={1}>
                  <IconButton
                    tag={ReactRouterLink}
                    to={{
                      pathname: `${pathname}/configuration`,
                      search: stringify(query, { encode: false }),
                    }}
                    label={formatMessage({
                      id: 'app.links.configure-view',
                      defaultMessage: 'Configure the view',
                    })}
                  >
                    <Cog />
                  </IconButton>
                </ActionContainer>
              ) : null}
              <ActionContainer paddingTop={1} paddingBottom={1}>
                <IconButton
                  label={
                    isGridView
                      ? formatMessage({
                          id: getTrad('view-switch.list'),
                          defaultMessage: 'List View',
                        })
                      : formatMessage({
                          id: getTrad('view-switch.grid'),
                          defaultMessage: 'Grid View',
                        })
                  }
                  onClick={() => setView(isGridView ? viewOptions.LIST : viewOptions.GRID)}
                >
                  {isGridView ? <List /> : <GridIcon />}
                </IconButton>
              </ActionContainer>
              <SearchInput
                label={formatMessage({
                  id: getTrad('search.label'),
                  defaultMessage: 'Search for an asset',
                })}
                trackedEvent="didSearchMediaLibraryElements"
                trackedEventDetails={{ location: 'upload' }}
              />
            </>
          }
        />

        <Layouts.Content>
          {selected.length > 0 && (
            <BulkActions
              currentFolder={currentFolder}
              selected={selected}
              onSuccess={handleBulkActionSuccess}
            />
          )}

          {folderCount === 0 && assetCount === 0 && (
            <EmptyOrNoPermissions
              canCreate={canCreate}
              canRead={canRead}
              isFiltering={isFiltering}
              onActionClick={toggleUploadAssetDialog}
            />
          )}

          {/* TODO: fix AssetListTable should handle no assets views (loading) */}
          {canRead && !isGridView && (assetCount > 0 || folderCount > 0) && (
            <TableList
              assetCount={assetCount}
              folderCount={folderCount}
              indeterminate={indeterminateBulkSelect}
              onChangeSort={handleChangeSort}
              onChangeFolder={(folderID, folderPath) =>
                navigate(getFolderURL(pathname, query, { folder: folderID, folderPath }))
              }
              onEditAsset={setAssetToEdit}
              onEditFolder={handleEditFolder}
              onSelectOne={selectOne}
              onSelectAll={handleBulkSelect}
              rows={[...folders, ...assets]}
              selected={selected}
              shouldDisableBulkSelect={!canUpdate}
              sortQuery={query?.sort ?? ''}
            />
          )}

          {canRead && isGridView && (
            <>
              {folderCount > 0 && (
                <FolderGridList
                  title={
                    // Folders title should only appear if:
                    // user is filtering and there are assets to display, to divide both type of elements
                    // user is not filtering
                    (((isFiltering && assetCount > 0) || !isFiltering) &&
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
                    const selectedFolders = selected.filter(({ type }) => type === 'folder');
                    const isSelected = !!selectedFolders.find(
                      (currentFolder) => currentFolder.id === folder.id
                    );

                    const url = getFolderURL(pathname, query, {
                      folder: folder?.id,
                      folderPath: folder?.path,
                    });

                    return (
                      <Grid.Item
                        col={3}
                        key={`folder-${folder.id}`}
                        direction="column"
                        alignItems="stretch"
                      >
                        <FolderCard
                          ref={
                            folderToEdit && folder.id === folderToEdit.id
                              ? currentFolderToEditRef
                              : undefined
                          }
                          ariaLabel={folder.name}
                          id={`folder-${folder.id}`}
                          to={url}
                          startAction={
                            selectOne && folder.isSelectable ? (
                              <FolderCardCheckbox
                                data-testid={`folder-checkbox-${folder.id}`}
                                checked={isSelected}
                                onCheckedChange={() => selectOne(folder)}
                              />
                            ) : null
                          }
                          cardActions={
                            <IconButton
                              aria-label={formatMessage({
                                id: getTrad('list.folder.edit'),
                                defaultMessage: 'Edit folder',
                              })}
                              onClick={() => handleEditFolder(folder)}
                            >
                              <Pencil />
                            </IconButton>
                          }
                        >
                          <FolderCardBody>
                            <FolderCardBodyAction to={url}>
                              <Flex tag="h2" direction="column" alignItems="start" maxWidth="100%">
                                <TypographyMaxWidth
                                  fontWeight="semiBold"
                                  textColor="neutral800"
                                  ellipsis
                                >
                                  {folder.name}
                                  <VisuallyHidden>:</VisuallyHidden>
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
                <Box paddingTop={6} paddingBottom={4}>
                  <Divider />
                </Box>
              )}

              {assetCount > 0 && (
                <AssetGridList
                  assets={assets}
                  onEditAsset={setAssetToEdit}
                  onSelectAsset={selectOne}
                  selectedAssets={selected.filter(({ type }) => type === 'asset')}
                  title={
                    // Assets title should only appear if:
                    // - user is not filtering
                    // - user is filtering and there are folders to display, to separate them
                    // - user is on page 1 since folders won't appear on any other page than the first one (no need to visually separate them)
                    ((!isFiltering || (isFiltering && folderCount > 0)) &&
                      assetsData?.pagination?.page === 1 &&
                      formatMessage(
                        {
                          id: getTrad('list.assets.title'),
                          defaultMessage: 'Assets ({count})',
                        },
                        { count: totalAssetCount }
                      )) ||
                    ''
                  }
                />
              )}
            </>
          )}
          <Pagination.Root {...assetsData.pagination}>
            <Pagination.PageSize />
            <Pagination.Links />
          </Pagination.Root>
        </Layouts.Content>
      </Page.Main>
      {showUploadAssetDialog && (
        <UploadAssetDialog
          open={showUploadAssetDialog}
          onClose={toggleUploadAssetDialog}
          trackedLocation="upload"
          folderId={query?.folder}
        />
      )}
      {showEditFolderDialog && (
        <EditFolderDialog
          open={showEditFolderDialog}
          onClose={handleEditFolderClose}
          folder={folderToEdit}
          parentFolderId={query?.folder}
          location="upload"
        />
      )}
      {assetToEdit && (
        <EditAssetDialog
          onClose={(editedAsset) => {
            // The asset has been deleted
            if (editedAsset === null) {
              handleAssetDeleted(1);
            }

            setAssetToEdit(undefined);
          }}
          open={!!assetToEdit}
          asset={assetToEdit}
          canUpdate={canUpdate}
          canCopyLink={canCopyLink}
          canDownload={canDownload}
          trackedLocation="upload"
        />
      )}
    </Layouts.Root>
  );
};
