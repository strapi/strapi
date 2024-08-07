import React, { useState } from 'react';

import { Page } from '@strapi/admin/strapi-admin';
import { Badge, Button, Divider, Flex, Loader, Modal, Tabs } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetDefinition } from '../../constants';
import { useAssets } from '../../hooks/useAssets';
import { useFolders } from '../../hooks/useFolders';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import useModalQueryParams from '../../hooks/useModalQueryParams';
import { useSelectionState } from '../../hooks/useSelectionState';
import { containsAssetFilter, getTrad } from '../../utils';
import getAllowedFiles from '../../utils/getAllowedFiles';
import { moveElement } from '../../utils/moveElement';
import { EditAssetContent } from '../EditAssetDialog';
import { EditFolderContent } from '../EditFolderDialog';

import { BrowseStep } from './BrowseStep';
import { DialogFooter } from './DialogFooter';
import { SelectedStep } from './SelectedStep';

const LoadingBody = styled(Flex)`
  /* 80px are coming from the Tabs component that is not included in the ModalBody */
  min-height: ${() => `calc(60vh + 8rem)`};
`;

export const AssetContent = ({
  allowedTypes,
  folderId,
  onClose,
  onAddAsset,
  onAddFolder,
  onChangeFolder,
  onValidate,
  multiple,
  initiallySelectedAssets,
  trackedLocation,
}) => {
  const [assetToEdit, setAssetToEdit] = useState(undefined);
  const [folderToEdit, setFolderToEdit] = useState(undefined);
  const { formatMessage } = useIntl();
  const {
    canRead,
    canCreate,
    isLoading: isLoadingPermissions,
    canUpdate,
    canCopyLink,
    canDownload,
  } = useMediaLibraryPermissions();

  const [
    { queryObject },
    {
      onChangeFilters,
      onChangePage,
      onChangePageSize,
      onChangeSort,
      onChangeSearch,
      onChangeFolder: onChangeFolderParam,
    },
  ] = useModalQueryParams({ folder: folderId });

  const {
    data: { pagination, results: assets } = {},
    isLoading: isLoadingAssets,
    error: errorAssets,
  } = useAssets({ skipWhen: !canRead, query: queryObject });

  const {
    data: folders,
    isLoading: isLoadingFolders,
    error: errorFolders,
  } = useFolders({
    enabled: canRead && !containsAssetFilter(queryObject) && pagination?.page === 1,
    query: queryObject,
  });

  const [
    selectedAssets,
    { selectOne, selectOnly, setSelections, selectMultiple, deselectMultiple },
  ] = useSelectionState(['id'], initiallySelectedAssets);

  const handleSelectAllAssets = () => {
    const allowedAssets = getAllowedFiles(allowedTypes, assets);

    if (!multiple) {
      return undefined;
    }

    // selected files in current folder
    const alreadySelected = allowedAssets.filter(
      (asset) => selectedAssets.findIndex((selectedAsset) => selectedAsset.id === asset.id) !== -1
    );

    if (alreadySelected.length > 0) {
      deselectMultiple(alreadySelected);
    } else {
      selectMultiple(allowedAssets);
    }
  };

  const handleSelectAsset = (asset) => {
    return multiple ? selectOne(asset) : selectOnly(asset);
  };

  const isLoading = isLoadingPermissions || isLoadingAssets || isLoadingFolders;
  const hasError = errorAssets || errorFolders;

  if (isLoading) {
    return (
      <>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Modal.Title>
        </Modal.Header>
        <LoadingBody justifyContent="center" paddingTop={4} paddingBottom={4}>
          <Loader>
            {formatMessage({
              id: getTrad('content.isLoading'),
              defaultMessage: 'Content is loading.',
            })}
          </Loader>
        </LoadingBody>
        <DialogFooter onClose={onClose} />
      </>
    );
  }

  if (hasError) {
    return (
      <>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Modal.Title>
        </Modal.Header>
        <Page.Error />
        <DialogFooter onClose={onClose} />
      </>
    );
  }

  if (!canRead) {
    return (
      <>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Modal.Title>
        </Modal.Header>
        <Page.NoPermissions />
        <DialogFooter onClose={onClose} />
      </>
    );
  }

  if (assetToEdit) {
    return (
      <EditAssetContent
        onClose={() => setAssetToEdit(undefined)}
        asset={assetToEdit}
        canUpdate={canUpdate}
        canCopyLink={canCopyLink}
        canDownload={canDownload}
        trackedLocation={trackedLocation}
      />
    );
  }

  if (folderToEdit) {
    return (
      <EditFolderContent
        folder={folderToEdit}
        onClose={() => setFolderToEdit(undefined)}
        location="content-manager"
        parentFolderId={queryObject?.folder}
      />
    );
  }

  const handleMoveItem = (hoverIndex, destIndex) => {
    const offset = destIndex - hoverIndex;
    const orderedAssetsClone = selectedAssets.slice();
    const nextAssets = moveElement(orderedAssetsClone, hoverIndex, offset);
    setSelections(nextAssets);
  };

  const handleFolderChange = (folderId, folderPath) => {
    onChangeFolder(folderId);
    onChangeFolderParam(folderId, folderPath);
  };

  return (
    <>
      <Modal.Header>
        <Modal.Title>
          {formatMessage({
            id: getTrad('header.actions.add-assets'),
            defaultMessage: 'Add new assets',
          })}
        </Modal.Title>
      </Modal.Header>

      <TabsRoot variant="simple" defaultValue={selectedAssets.length > 0 ? 'selected' : 'browse'}>
        <Flex paddingLeft={8} paddingRight={8} paddingTop={6} justifyContent="space-between">
          <Tabs.List>
            <Tabs.Trigger value="browse">
              {formatMessage({
                id: getTrad('modal.nav.browse'),
                defaultMessage: 'Browse',
              })}
            </Tabs.Trigger>
            <Tabs.Trigger value="selected">
              {formatMessage({
                id: getTrad('modal.header.select-files'),
                defaultMessage: 'Selected files',
              })}
              <Badge marginLeft={2}>{selectedAssets.length}</Badge>
            </Tabs.Trigger>
          </Tabs.List>
          <Flex gap={2}>
            <Button
              variant="secondary"
              onClick={() => onAddFolder({ folderId: queryObject?.folder })}
            >
              {formatMessage({
                id: getTrad('modal.upload-list.sub-header.add-folder'),
                defaultMessage: 'Add folder',
              })}
            </Button>
            <Button onClick={() => onAddAsset({ folderId: queryObject?.folder })}>
              {formatMessage({
                id: getTrad('modal.upload-list.sub-header.button'),
                defaultMessage: 'Add more assets',
              })}
            </Button>
          </Flex>
        </Flex>
        <Divider />
        <Modal.Body>
          <Tabs.Content value="browse">
            <BrowseStep
              allowedTypes={allowedTypes}
              assets={assets}
              canCreate={canCreate}
              canRead={canRead}
              folders={folders}
              onSelectAsset={handleSelectAsset}
              selectedAssets={selectedAssets}
              multiple={multiple}
              onSelectAllAsset={handleSelectAllAssets}
              onEditAsset={setAssetToEdit}
              onEditFolder={setFolderToEdit}
              pagination={pagination}
              queryObject={queryObject}
              onAddAsset={onAddAsset}
              onChangeFilters={onChangeFilters}
              onChangeFolder={handleFolderChange}
              onChangePage={onChangePage}
              onChangePageSize={onChangePageSize}
              onChangeSort={onChangeSort}
              onChangeSearch={onChangeSearch}
            />
          </Tabs.Content>
          <Tabs.Content value="selected">
            <SelectedStep
              selectedAssets={selectedAssets}
              onSelectAsset={handleSelectAsset}
              onReorderAsset={handleMoveItem}
            />
          </Tabs.Content>
        </Modal.Body>
      </TabsRoot>
      <DialogFooter onClose={onClose} onValidate={() => onValidate(selectedAssets)} />
    </>
  );
};

AssetContent.defaultProps = {
  allowedTypes: [],
  folderId: null,
  initiallySelectedAssets: [],
  multiple: false,
  trackedLocation: undefined,
};

AssetContent.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  folderId: PropTypes.number,
  initiallySelectedAssets: PropTypes.arrayOf(AssetDefinition),
  multiple: PropTypes.bool,
  onAddAsset: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onChangeFolder: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};

export const AssetDialog = ({ open, onClose, ...restProps }) => {
  return (
    <Modal.Root open={open} onOpenChange={onClose}>
      <Modal.Content>
        <AssetContent onClose={onClose} {...restProps} />
      </Modal.Content>
    </Modal.Root>
  );
};

AssetDialog.defaultProps = {
  allowedTypes: [],
  folderId: null,
  initiallySelectedAssets: [],
  multiple: false,
  open: false,
  trackedLocation: undefined,
};

AssetDialog.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  folderId: PropTypes.number,
  initiallySelectedAssets: PropTypes.arrayOf(AssetDefinition),
  multiple: PropTypes.bool,
  onAddAsset: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onChangeFolder: PropTypes.func.isRequired,
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};

const TabsRoot = styled(Tabs.Root)`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;
