import React, { useState, useRef } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { useHistory, useLocation, Link as ReactRouterLink } from 'react-router-dom';
import { stringify } from 'qs';
import { toUpper } from 'lodash';

import {
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  AnErrorOccurred,
  SearchURLQuery,
  useSelectionState,
  useQueryParams,
  useTracking,
  CheckPermissions,
  usePersistentState,
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
import Cog from '@strapi/icons/Cog';
// import List from '@strapi/icons/List';
// import Grid from '@strapi/icons/Grid';

import { UploadAssetDialog } from '../../../components/UploadAssetDialog/UploadAssetDialog';
import { EditFolderDialog } from '../../../components/EditFolderDialog';
import { EditAssetDialog } from '../../../components/EditAssetDialog';
import { AssetList } from '../../../components/AssetList';
import { FolderList } from '../../../components/FolderList';
import SortPicker from '../../../components/SortPicker';
import { useAssets } from '../../../hooks/useAssets';
import { useFolders } from '../../../hooks/useFolders';
import { getTrad, containsAssetFilter, getBreadcrumbDataML, getFolderURL } from '../../../utils';
import { PaginationFooter } from '../../../components/PaginationFooter';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useFolder } from '../../../hooks/useFolder';
import { BulkActions } from './components/BulkActions';
import {
  FolderCard,
  FolderCardBody,
  FolderCardCheckbox,
  FolderCardBodyAction,
} from '../../../components/FolderCard';
import { Filters } from './components/Filters';
import { Header } from './components/Header';
import { EmptyOrNoPermissions } from './components/EmptyOrNoPermissions';
import pluginPermissions from '../../../permissions';
import { viewOptions } from '../../../constants';
import pluginId from '../../../pluginId';

const BoxWithHeight = styled(Box)`
  height: ${32 / 16}rem;
  display: flex;
  align-items: center;
`;

const TypographyMaxWidth = styled(Typography)`
  max-width: 100%;
`;

const ActionButton = styled(Box)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral900};
    }
  }
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
  const [view, setView] = usePersistentState(`${toUpper(pluginId)}_LIBRARY_VIEW`, viewOptions.GRID);
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
    data: folders,
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

  const folderCount = folders?.length || 0;
  const assets = assetsData?.results;
  const assetCount = assets?.length ?? 0;
  const isLoading = isCurrentFolderLoading || foldersLoading || permissionsLoading || assetsLoading;
  const [showUploadAssetDialog, setShowUploadAssetDialog] = useState(false);
  const [showEditFolderDialog, setShowEditFolderDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const [folderToEdit, setFolderToEdit] = useState(undefined);
  const [selected, { selectOne, selectAll }] = useSelectionState(['type', 'id'], []);
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
                    onChange={(e) => {
                      if (e.target.checked) {
                        trackUsage('didSelectAllMediaLibraryElements');
                      }
                      selectAll([
                        ...assets.map((asset) => ({ ...asset, type: 'asset' })),
                        ...folders.map((folder) => ({ ...folder, type: 'folder' })),
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
            <>
              <ActionButton paddingTop={1} paddingBottom={1}>
                <IconButton
                  data-testid={`switch-to-${isGridView ? 'list' : 'grid'}-view`}
                  icon={
                    isGridView ? (
                      // TODO change after DS release
                      <Cog />
                    ) : (
                      <Cog />
                    )
                  }
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
              </ActionButton>
              <CheckPermissions permissions={pluginPermissions.configureView}>
                <ActionButton paddingTop={1} paddingBottom={1}>
                  <IconButton
                    forwardedAs={ReactRouterLink}
                    to={{
                      pathname: `${pathname}/configuration`,
                      search: stringify(query, { encode: false }),
                    }}
                    icon={<Cog />}
                    label={formatMessage({
                      id: 'app.links.configure-view',
                      defaultMessage: 'Configure the view',
                    })}
                  />
                </ActionButton>
              </CheckPermissions>
              <SearchURLQuery
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

          {canRead && (
            <>
              {folderCount > 0 && (
                <FolderList
                  title={
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

                  {assetsData?.pagination && (
                    <PaginationFooter pagination={assetsData.pagination} />
                  )}
                </>
              )}
            </>
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
