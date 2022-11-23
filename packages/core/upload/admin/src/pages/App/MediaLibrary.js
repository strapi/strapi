import React, { useState, useRef } from 'react'; // useState
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { useLocation, useHistory } from 'react-router-dom';
import {
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  AnErrorOccurred,
  SearchURLQuery,
  useSelectionState,
  useQueryParams,
  useTracking,
} from '@strapi/helper-plugin';
import { Layout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { IconButton } from '@strapi/design-system/IconButton';
import { Typography } from '@strapi/design-system/Typography';
import { GridItem } from '@strapi/design-system/Grid';
import { Flex } from '@strapi/design-system/Flex';
import Pencil from '@strapi/icons/Pencil';
import { UploadAssetDialog } from '../../components/UploadAssetDialog/UploadAssetDialog';
import { EditFolderDialog } from '../../components/EditFolderDialog';
import { EditAssetDialog } from '../../components/EditAssetDialog';
import { AssetGridList } from '../../components/AssetGridList';
import { TableList } from '../../components/TableList';
import { FolderList } from '../../components/FolderList';
import SortPicker from '../../components/SortPicker';
import { useAssets } from '../../hooks/useAssets';
import { useFolders } from '../../hooks/useFolders';
import { getTrad, containsAssetFilter, getBreadcrumbDataML, getFolderURL } from '../../utils';
import { PaginationFooter } from '../../components/PaginationFooter';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useFolder } from '../../hooks/useFolder';
import { BulkActions } from './components/BulkActions';
import {
  FolderCard,
  FolderCardBody,
  FolderCardCheckbox,
  FolderCardBodyAction,
} from '../../components/FolderCard';
import { Filters } from './components/Filters';
import { Header } from './components/Header';
import { EmptyOrNoPermissions } from './components/EmptyOrNoPermissions';

const BoxWithHeight = styled(Box)`
  height: ${32 / 16}rem;
  display: flex;
  align-items: center;
`;

const TypographyMaxWidth = styled(Typography)`
  max-width: 100%;
`;

export const MediaLibrary = () => {
  const { push } = useHistory();
  const {
    canRead,
    canCreate,
    canUpdate,
    canCopyLink,
    canDownload,
    isLoading: permissionsLoading,
  } = useMediaLibraryPermissions();
  const currentFolderToEditRef = useRef();
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const { trackUsage } = useTracking();
  const [{ query }, setQuery] = useQueryParams();
  const isFiltering = Boolean(query._q || query.filters);

  // TODO: remove and replace with data when available stored
  const isGridView = true;

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
    push(pathname);
  }

  const folders = foldersData?.map((folder) => ({ ...folder, type: 'folder' })) ?? [];
  const folderCount = folders?.length || 0;
  const assets = assetsData?.results?.map((asset) => ({ ...asset, type: 'asset' })) || [];
  const assetCount = assets?.length ?? 0;

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

  const handleBulkSelect = (event, elements) => {
    if (event.target.checked) {
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

  useFocusWhenNavigate();

  return (
    <Layout>
      <Main aria-busy={isLoading}>
        <Header
          breadcrumbs={
            !isCurrentFolderLoading && getBreadcrumbDataML(currentFolder, { pathname, query })
          }
          canCreate={canCreate}
          onToggleEditFolderDialog={toggleEditFolderDialog}
          onToggleUploadAssetDialog={toggleUploadAssetDialog}
          folder={currentFolder}
        />
        <ActionLayout
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
                  <BaseCheckbox
                    aria-label={formatMessage({
                      id: getTrad('bulk.select.label'),
                      defaultMessage: 'Select all folders & assets',
                    })}
                    indeterminate={indeterminateBulkSelect}
                    value={
                      (assetCount > 0 || folderCount > 0) &&
                      selected.length === assetCount + folderCount
                    }
                    onChange={(e) => handleBulkSelect(e, [...assets, ...folders])}
                  />
                </BoxWithHeight>
              )}
              {canRead && isGridView && <SortPicker onChangeSort={handleChangeSort} />}
              {canRead && <Filters />}
            </>
          }
          endActions={
            <SearchURLQuery
              label={formatMessage({
                id: getTrad('search.label'),
                defaultMessage: 'Search for an asset',
              })}
              trackedEvent="didSearchMediaLibraryElements"
              trackedEventDetails={{ location: 'upload' }}
            />
          }
        />

        <ContentLayout>
          {selected.length > 0 && (
            <BulkActions currentFolder={currentFolder} selected={selected} onSuccess={selectAll} />
          )}

          {isLoading && <LoadingIndicatorPage />}

          {(assetsError || foldersError) && <AnErrorOccurred />}

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
              onEditAsset={setAssetToEdit}
              onEditFolder={handleEditFolder}
              onSelectOne={selectOne}
              onSelectAll={handleBulkSelect}
              rows={
                // TODO: remove when fixed on DS side
                // when number of rows in Table changes, the keyboard tab from a row to another
                // is not working for 1st and last column
                !assetsLoading && !foldersLoading ? [...folders, ...assets] : []
              }
              selected={selected}
              sortQuery={query?.sort ?? ''}
            />
          )}

          {canRead && isGridView && (
            <>
              {folderCount > 0 && (
                <FolderList
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

                    const url = getFolderURL(pathname, query, folder);

                    return (
                      <GridItem col={3} key={`folder-${folder.id}`}>
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
                            selectOne && (
                              <FolderCardCheckbox
                                data-testid={`folder-checkbox-${folder.id}`}
                                value={isSelected}
                                onChange={() => selectOne(folder)}
                              />
                            )
                          }
                          cardActions={
                            <IconButton
                              icon={<Pencil />}
                              aria-label={formatMessage({
                                id: getTrad('list.folder.edit'),
                                defaultMessage: 'Edit folder',
                              })}
                              onClick={() => handleEditFolder(folder)}
                            />
                          }
                        >
                          <FolderCardBody>
                            <FolderCardBodyAction to={url}>
                              <Flex as="h2" direction="column" alignItems="start" maxWidth="100%">
                                <TypographyMaxWidth fontWeight="semiBold" ellipsis>
                                  {folder.name}
                                  <VisuallyHidden>:</VisuallyHidden>
                                </TypographyMaxWidth>

                                <TypographyMaxWidth
                                  as="span"
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
                      </GridItem>
                    );
                  })}
                </FolderList>
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
                        { count: assetCount }
                      )) ||
                    ''
                  }
                />
              )}
            </>
          )}

          {assetsData?.pagination && <PaginationFooter pagination={assetsData.pagination} />}
        </ContentLayout>
      </Main>

      {showUploadAssetDialog && (
        <UploadAssetDialog
          onClose={toggleUploadAssetDialog}
          trackedLocation="upload"
          folderId={query?.folder}
        />
      )}

      {showEditFolderDialog && (
        <EditFolderDialog
          onClose={handleEditFolderClose}
          folder={folderToEdit}
          parentFolderId={query?.folder}
          location="upload"
        />
      )}

      {assetToEdit && (
        <EditAssetDialog
          onClose={() => setAssetToEdit(undefined)}
          asset={assetToEdit}
          canUpdate={canUpdate}
          canCopyLink={canCopyLink}
          canDownload={canDownload}
          trackedLocation="upload"
        />
      )}
    </Layout>
  );
};
