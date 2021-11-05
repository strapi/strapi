import React from 'react';
import PropTypes from 'prop-types';
import PlusIcon from '@strapi/icons/Plus';
import { ModalLayout, ModalBody } from '@strapi/design-system/ModalLayout';
import { Flex } from '@strapi/design-system/Flex';
import { Button } from '@strapi/design-system/Button';
import { Divider } from '@strapi/design-system/Divider';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { Badge } from '@strapi/design-system/Badge';
import { Loader } from '@strapi/design-system/Loader';
import { NoPermissions, AnErrorOccurred, useSelectionState, NoMedia } from '@strapi/helper-plugin';
import getTrad from '../../../utils/getTrad';
import { SelectedStep } from './SelectedStep';
import { BrowseStep } from './BrowseStep';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useModalAssets } from '../../../hooks/useModalAssets';
import useModalQueryParams from '../../../hooks/useModalAssets/useModalQueryParams';
import { AssetDefinition } from '../../../constants';
import { DialogTitle } from './DialogTitle';
import { DialogFooter } from './DialogFooter';

export const AssetDialog = ({
  onClose,
  onAddAsset,
  onValidate,
  multiple,
  initiallySelectedAssets,
}) => {
  const { formatMessage } = useIntl();
  const { canRead, canCreate, isLoading: isLoadingPermissions } = useMediaLibraryPermissions();
  const [
    { rawQuery, queryObject },
    { onChangePage, onChangePageSize, onChangeSort },
  ] = useModalQueryParams();
  const { data, isLoading, error } = useModalAssets({ skipWhen: !canRead, rawQuery });

  const [selectedAssets, { selectOne, selectAll, selectOnly }] = useSelectionState(
    'id',
    initiallySelectedAssets
  );

  const handleSelectAsset = asset => (multiple ? selectOne(asset) : selectOnly(asset));
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

  if (canRead && assets?.length === 0) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title">
        <DialogTitle />
        <NoMedia
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
        <DialogFooter onClose={onClose} />
      </ModalLayout>
    );
  }

  return (
    <ModalLayout onClose={onClose} labelledBy="asset-dialog-title" aria-busy={loading}>
      <DialogTitle />

      <TabGroup
        label={formatMessage({
          id: getTrad('tabs.title'),
          defaultMessage: 'How do you want to upload your assets?',
        })}
        variant="simple"
        initialSelectedTabIndex={selectedAssets.length > 0 ? 1 : 0}
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
                assets={assets}
                onSelectAsset={handleSelectAsset}
                selectedAssets={selectedAssets}
                onSelectAllAsset={multiple ? () => selectAll(assets) : undefined}
                onEditAsset={() => {}}
                pagination={data?.pagination}
                queryObject={queryObject}
                onChangePage={onChangePage}
                onChangePageSize={onChangePageSize}
                onChangeSort={onChangeSort}
              />
            </ModalBody>
          </TabPanel>
          <TabPanel>
            <ModalBody>
              <SelectedStep selectedAssets={selectedAssets} onSelectAsset={handleSelectAsset} />
            </ModalBody>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <DialogFooter onClose={onClose} onValidate={() => onValidate(selectedAssets)} />
    </ModalLayout>
  );
};

AssetDialog.defaultProps = {
  multiple: false,
};

AssetDialog.propTypes = {
  initiallySelectedAssets: PropTypes.arrayOf(AssetDefinition).isRequired,
  multiple: PropTypes.bool,
  onAddAsset: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
};
