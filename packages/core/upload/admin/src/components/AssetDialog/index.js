import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ModalLayout, ModalBody } from '@strapi/design-system/ModalLayout';
import { Flex } from '@strapi/design-system/Flex';
import { Button } from '@strapi/design-system/Button';
import { Divider } from '@strapi/design-system/Divider';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { Badge } from '@strapi/design-system/Badge';
import { Loader } from '@strapi/design-system/Loader';
import { Stack } from '@strapi/design-system/Stack';
import { NoPermissions, AnErrorOccurred, useSelectionState } from '@strapi/helper-plugin';

import getTrad from '../../utils/getTrad';
import { SelectedStep } from './SelectedStep';
import { BrowseStep } from './BrowseStep';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useAssets } from '../../hooks/useAssets';
import { useFolders } from '../../hooks/useFolders';
import useModalQueryParams from '../../hooks/useModalQueryParams';
import { AssetDefinition } from '../../constants';
import getAllowedFiles from '../../utils/getAllowedFiles';
import { DialogTitle } from './DialogTitle';
import { DialogFooter } from './DialogFooter';
import { EditAssetDialog } from '../EditAssetDialog';
import { moveElement } from '../../utils/moveElement';

export const AssetDialog = ({
  allowedTypes,
  onClose,
  onAddAsset,
  onAddFolder,
  onValidate,
  multiple,
  initiallySelectedAssets,
  trackedLocation,
}) => {
  const [assetToEdit, setAssetToEdit] = useState(undefined);
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
      onChangeFolder,
    },
  ] = useModalQueryParams();
  const {
    data: { pagination, results: assets } = {},
    isLoading: isLoadingAssets,
    error: errorAssets,
  } = useAssets({ skipWhen: !canRead, query: queryObject });
  const {
    data: { results: folders } = {},
    isLoading: isLoadingFolders,
    error: errorFolders,
  } = useFolders({ query: queryObject });

  const [selectedAssets, { selectOne, selectAll, selectOnly, setSelections }] = useSelectionState(
    ['id'],
    initiallySelectedAssets
  );

  const [initialSelectedTabIndex, setInitialSelectedTabIndex] = useState(
    selectedAssets.length > 0 ? 1 : 0
  );
  const handleSelectAllAssets = () => {
    const hasAllAssets = assets.every(
      asset => selectedAssets.findIndex(curr => curr.id === asset.id) !== -1
    );

    if (hasAllAssets) {
      return multiple ? selectAll(assets) : undefined;
    }

    const allowedAssets = getAllowedFiles(allowedTypes, assets);

    return multiple ? selectAll(allowedAssets) : undefined;
  };
  const handleSelectAsset = asset => {
    return multiple ? selectOne(asset) : selectOnly(asset);
  };

  const isLoading = isLoadingPermissions || isLoadingAssets || isLoadingFolders;
  const hasError = errorAssets || errorFolders;

  if (isLoading) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title" aria-busy>
        <DialogTitle />
        <Flex justifyContent="center" paddingTop={4} paddingBottom={4}>
          <Loader>
            {formatMessage({
              id: getTrad('list.asset.load'),
              defaultMessage: 'How do you want to upload your assets?',
            })}
          </Loader>
        </Flex>
        <DialogFooter onClose={onClose} />
      </ModalLayout>
    );
  }

  if (hasError) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title">
        <DialogTitle />
        <AnErrorOccurred />
        <DialogFooter onClose={onClose} />
      </ModalLayout>
    );
  }

  if (!canRead) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title">
        <DialogTitle />
        <NoPermissions />
        <DialogFooter onClose={onClose} />
      </ModalLayout>
    );
  }

  if (assetToEdit) {
    return (
      <EditAssetDialog
        onClose={() => setAssetToEdit(undefined)}
        asset={assetToEdit}
        canUpdate={canUpdate}
        canCopyLink={canCopyLink}
        canDownload={canDownload}
        trackedLocation={trackedLocation}
      />
    );
  }

  const handleMoveItem = (hoverIndex, destIndex) => {
    const offset = destIndex - hoverIndex;
    const orderedAssetsClone = selectedAssets.slice();
    const nextAssets = moveElement(orderedAssetsClone, hoverIndex, offset);

    setSelections(nextAssets);
  };

  return (
    <ModalLayout onClose={onClose} labelledBy="asset-dialog-title" aria-busy={isLoading}>
      <DialogTitle />

      <TabGroup
        label={formatMessage({
          id: getTrad('tabs.title'),
          defaultMessage: 'How do you want to upload your assets?',
        })}
        variant="simple"
        initialSelectedTabIndex={initialSelectedTabIndex}
        onTabChange={() => setInitialSelectedTabIndex(0)}
      >
        <Flex paddingLeft={8} paddingRight={8} paddingTop={6} justifyContent="space-between">
          <Tabs>
            <Tab>
              {formatMessage({
                id: getTrad('modal.nav.browse'),
                defaultMessage: 'Browse',
              })}
            </Tab>
            <Tab>
              {formatMessage({
                id: getTrad('modal.header.select-files'),
                defaultMessage: 'Selected files',
              })}
              <Badge marginLeft={2}>{selectedAssets.length}</Badge>
            </Tab>
          </Tabs>

          <Stack horizontal spacing={2}>
            <Button variant="secondary" onClick={onAddFolder}>
              {formatMessage({
                id: getTrad('modal.upload-list.sub-header.add-folder'),
                defaultMessage: 'Add folder',
              })}
            </Button>

            <Button onClick={onAddAsset}>
              {formatMessage({
                id: getTrad('modal.upload-list.sub-header.button'),
                defaultMessage: 'Add more assets',
              })}
            </Button>
          </Stack>
        </Flex>
        <Divider />
        <TabPanels>
          <TabPanel>
            <ModalBody>
              <BrowseStep
                allowedTypes={allowedTypes}
                assets={assets}
                canCreate={canCreate}
                folders={folders}
                onSelectAsset={handleSelectAsset}
                selectedAssets={selectedAssets}
                multiple={multiple}
                onSelectAllAsset={handleSelectAllAssets}
                onEditAsset={canUpdate ? setAssetToEdit : undefined}
                pagination={pagination}
                queryObject={queryObject}
                onAddAsset={onAddAsset}
                onChangeFilters={onChangeFilters}
                onChangeFolder={onChangeFolder}
                onChangePage={onChangePage}
                onChangePageSize={onChangePageSize}
                onChangeSort={onChangeSort}
                onChangeSearch={onChangeSearch}
              />
            </ModalBody>
          </TabPanel>
          <TabPanel>
            <ModalBody>
              <SelectedStep
                selectedAssets={selectedAssets}
                onSelectAsset={handleSelectAsset}
                onReorderAsset={handleMoveItem}
              />
            </ModalBody>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <DialogFooter onClose={onClose} onValidate={() => onValidate(selectedAssets)} />
    </ModalLayout>
  );
};

AssetDialog.defaultProps = {
  allowedTypes: [],
  initiallySelectedAssets: [],
  multiple: false,
  trackedLocation: undefined,
};

AssetDialog.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  initiallySelectedAssets: PropTypes.arrayOf(AssetDefinition),
  multiple: PropTypes.bool,
  onAddAsset: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};
