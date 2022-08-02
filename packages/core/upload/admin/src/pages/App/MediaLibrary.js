import React, { useState, useRef } from 'react'; // useState
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { useLocation, useHistory } from 'react-router-dom';
import { stringify } from 'qs';
import {
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  NoPermissions,
  AnErrorOccurred,
  SearchURLQuery,
  useSelectionState,
  useQueryParams,
  useTracking,
} from '@strapi/helper-plugin';
import { Layout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Button } from '@strapi/design-system/Button';
import Plus from '@strapi/icons/Plus';
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
import { AssetList } from '../../components/AssetList';
import { FolderList } from '../../components/FolderList';
import SortPicker from '../../components/SortPicker';
import { useAssets } from '../../hooks/useAssets';
import { useFolders } from '../../hooks/useFolders';
import { getTrad, containsAssetFilter } from '../../utils';
import { PaginationFooter } from '../../components/PaginationFooter';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useFolder } from '../../hooks/useFolder';
import { EmptyAssets } from '../../components/EmptyAssets';
import { BulkActions } from './components/BulkActions';
import {
  FolderCard,
  FolderCardBody,
  FolderCardCheckbox,
  FolderCardBodyAction,
} from '../../components/FolderCard';
import { Filters } from './components/Filters';
import { Header } from './components/Header';

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

  const { data: assetsData, isLoading: assetsLoading, errors: assetsError } = useAssets({
    skipWhen: !canRead,
    query,
  });

  const { data: folders, isLoading: foldersLoading, errors: foldersError } = useFolders({
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

  const folderCount = folders?.length || 0;
  const assets = assetsData?.results;
  const assetCount = assets?.length ?? 0;
  const isLoading = isCurrentFolderLoading || foldersLoading || permissionsLoading || assetsLoading;
  const [showUploadAssetDialog, setShowUploadAssetDialog] = useState(false);
  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const [folderToEdit, setFolderToEdit] = useState(undefined);
  const [selected, { selectOne, selectAll }] = useSelectionState(['type', 'id'], []);
  const toggleUploadAssetDialog = () => setShowUploadAssetDialog(prev => !prev);
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

    setShowEditFolderDialog(prev => !prev);
  };

  const handleChangeSort = value => {
    trackUsage('didSortMediaLibraryElements', {
      location: 'upload',
      sort: value,
    });
    setQuery({ sort: value });
  };

  const handleEditFolder = folder => {
    setFolderToEdit(folder);
    setShowEditFolderDialog(true);
  };

  const handleEditFolderClose = payload => {
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
          assetCount={assetCount}
          folderCount={folderCount}
          canCreate={canCreate}
          onToggleEditFolderDialog={toggleEditFolderDialog}
          onToggleUploadAssetDialog={toggleUploadAssetDialog}
          folder={currentFolder}
        />
        <ActionLayout
          startActions={
            <>
              {canUpdate && (assetCount > 0 || folderCount > 0) && (
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
                    indeterminate={
                      selected?.length > 0 && selected?.length !== assetCount + folderCount
                    }
                    value={
                      (assetCount > 0 || folderCount > 0) &&
                      selected.length === assetCount + folderCount
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        trackUsage('didSelectAllMediaLibraryElements');
                      }
                      selectAll([
                        ...assets.map(asset => ({ ...asset, type: 'asset' })),
                        ...folders.map(folder => ({ ...folder, type: 'folder' })),
                      ]);
                    }}
                  />
                </BoxWithHeight>
              )}
              {canRead && <SortPicker onChangeSort={handleChangeSort} />}
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
            <EmptyAssets
              action={
                canCreate &&
                !isFiltering && (
                  <Button
                    variant="secondary"
                    startIcon={<Plus />}
                    onClick={toggleUploadAssetDialog}
                  >
                    {formatMessage({
                      id: getTrad('header.actions.add-assets'),
                      defaultMessage: 'Add new assets',
                    })}
                  </Button>
                )
              }
              content={
                // eslint-disable-next-line no-nested-ternary
                isFiltering
                  ? formatMessage({
                      id: getTrad('list.assets-empty.title-withSearch'),
                      defaultMessage: 'There are no elements with the applied filters',
                    })
                  : canCreate
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
          )}

          {canRead ? (
            <>
              {folderCount > 0 && (
                <FolderList
                  title={
                    (((isFiltering && assetCount > 0) || !isFiltering) &&
                      formatMessage({
                        id: getTrad('list.folders.title'),
                        defaultMessage: 'Folders',
                      })) ||
                    ''
                  }
                >
                  {folders.map(folder => {
                    const selectedFolders = selected.filter(({ type }) => type === 'folder');
                    const isSelected = !!selectedFolders.find(
                      currentFolder => currentFolder.id === folder.id
                    );

                    // Search query will always fetch the same results
                    // we remove it here to allow navigating in a folder and see the result of this navigation
                    const { _q, ...queryParamsWithoutQ } = query;
                    const url = `${pathname}?${stringify({
                      ...queryParamsWithoutQ,
                      folder: folder.id,
                    })}`;

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
                                onChange={() => selectOne({ ...folder, type: 'folder' })}
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
                <>
                  <AssetList
                    assets={assets}
                    onEditAsset={setAssetToEdit}
                    onSelectAsset={selectOne}
                    selectedAssets={selected.filter(({ type }) => type === 'asset')}
                    title={
                      ((!isFiltering || (isFiltering && folderCount > 0)) &&
                        assetsData?.pagination?.page === 1 &&
                        formatMessage({
                          id: getTrad('list.assets.title'),
                          defaultMessage: 'Assets',
                        })) ||
                      ''
                    }
                  />

                  {assetsData?.pagination && (
                    <PaginationFooter pagination={assetsData.pagination} />
                  )}
                </>
              )}
            </>
          ) : (
            <NoPermissions />
          )}
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
