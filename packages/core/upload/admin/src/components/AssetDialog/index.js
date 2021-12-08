import React, { useState } from 'react';
import PropTypes from 'prop-types';
import PlusIcon from '@strapi/icons/Plus';
import { ModalLayout, ModalBody } from '@strapi/design-system/ModalLayout';
import { Flex } from '@strapi/design-system/Flex';
import { Button } from '@strapi/design-system/Button';
import { Divider } from '@strapi/design-system/Divider';
import { Box } from '@strapi/design-system/Box';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { Badge } from '@strapi/design-system/Badge';
import { Loader } from '@strapi/design-system/Loader';
import { NoPermissions, AnErrorOccurred, useSelectionState } from '@strapi/helper-plugin';
import getTrad from '../../utils/getTrad';
import { SelectedStep } from './SelectedStep';
import { BrowseStep } from './BrowseStep';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useModalAssets } from '../../hooks/useModalAssets';
import useModalQueryParams from '../../hooks/useModalAssets/useModalQueryParams';
import { AssetDefinition } from '../../constants';
import getAllowedFiles from '../../utils/getAllowedFiles';
import { DialogTitle } from './DialogTitle';
import { DialogFooter } from './DialogFooter';
import { EditAssetDialog } from '../EditAssetDialog';
import { EmptyAssets } from '../EmptyAssets';
import { moveElement } from '../../utils/moveElement';

export const AssetDialog = ({
  allowedTypes,
  onClose,
  onAddAsset,
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
    { rawQuery, queryObject },
    { onChangeFilters, onChangePage, onChangePageSize, onChangeSort, onChangeSearch },
  ] = useModalQueryParams();
  const { data, isLoading, error } = useModalAssets({ skipWhen: !canRead, rawQuery });

  const [selectedAssets, { selectOne, selectAll, selectOnly, setSelections }] = useSelectionState(
    'id',
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

  const loading = isLoadingPermissions || isLoading;
  const assets = data?.results;

  if (loading) {
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

  if (error) {
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

  if (canRead && assets?.length === 0 && !queryObject._q && queryObject.filters.$and.length === 0) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title">
        <DialogTitle />
        <Box paddingLeft={8} paddingRight={8} paddingBottom={6}>
          <EmptyAssets
            size="S"
            count={6}
            action={
              canCreate ? (
                <Button variant="secondary" startIcon={<PlusIcon />} onClick={onAddAsset}>
                  {formatMessage({
                    id: getTrad('modal.header.browse'),
                    defaultMessage: 'Upload assets',
                  })}
                </Button>
              ) : (
                undefined
              )
            }
            content={
              canCreate
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
    <ModalLayout onClose={onClose} labelledBy="asset-dialog-title" aria-busy={loading}>
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

          <Button onClick={onAddAsset}>
            {formatMessage({
              id: getTrad('modal.upload-list.sub-header.button'),
              defaultMessage: 'Add more assets',
            })}
          </Button>
        </Flex>
        <Divider />
        <TabPanels>
          <TabPanel>
            <ModalBody>
              <BrowseStep
                allowedTypes={allowedTypes}
                assets={assets}
                onSelectAsset={handleSelectAsset}
                selectedAssets={selectedAssets}
                multiple={multiple}
                onSelectAllAsset={handleSelectAllAssets}
                onEditAsset={canUpdate ? setAssetToEdit : undefined}
                pagination={data?.pagination}
                queryObject={queryObject}
                onChangeFilters={onChangeFilters}
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
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};
