import React, { useState } from 'react';
import PropTypes from 'prop-types';
import AddIcon from '@strapi/icons/AddIcon';
import { ModalLayout, ModalBody } from '@strapi/parts/ModalLayout';
import { Flex } from '@strapi/parts/Flex';
import { Button } from '@strapi/parts/Button';
import { Divider } from '@strapi/parts/Divider';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/parts/Tabs';
import { Badge } from '@strapi/parts/Badge';
import { Loader } from '@strapi/parts/Loader';
import { NoPermissions, AnErrorOccurred, useSelectionState, NoMedia } from '@strapi/helper-plugin';
import getTrad from '../../../utils/getTrad';
import { SelectedStep } from './SelectedStep';
import { BrowseStep } from './BrowseStep';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useAssets } from '../../../hooks/useAssets';
import { AssetDefinition } from '../../../constants';
import { UploadAssetDialog } from '../../UploadAssetDialog/UploadAssetDialog';
import { DialogTitle } from './DialogTitle';
import { DialogFooter } from './DialogFooter';

const Steps = {
  SelectAsset: 'SelectAsset',
  UploadAsset: 'UploadAsset',
};

export const AssetDialog = ({ onClose, onValidate, multiple, initiallySelectedAssets }) => {
  const { formatMessage } = useIntl();
  const [step, setStep] = useState(Steps.SelectAsset);
  const { canRead, canCreate, isLoading: isLoadingPermissions } = useMediaLibraryPermissions();
  const { data, isLoading, error } = useAssets({ skipWhen: !canRead });
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
        <Loader>
          {formatMessage({
            id: getTrad('list.asset.load'),
            defaultMessage: 'How do you want to upload your assets?',
          })}
        </Loader>
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

  if (canRead && assets?.length === 0 && step === Steps.SelectAsset) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title">
        <DialogTitle />
        <NoMedia
          action={
            canCreate ? (
              <Button
                variant="secondary"
                startIcon={<AddIcon />}
                onClick={() => {
                  setStep(Steps.UploadAsset);
                }}
              >
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

  if (canCreate && step === Steps.UploadAsset) {
    return <UploadAssetDialog onClose={() => setStep(Steps.SelectAsset)} />;
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

          <Button onClick={() => setStep(Steps.UploadAsset)}>
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
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
};
