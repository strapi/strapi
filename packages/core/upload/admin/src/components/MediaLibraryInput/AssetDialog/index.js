import React from 'react';
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
import { AnErrorOccurred, useSelectionState, NoMedia } from '@strapi/helper-plugin';
import getTrad from '../../../utils/getTrad';
import { SelectedStep } from './SelectedStep';
import { BrowseStep } from './BrowseStep';
import { useAssets } from '../../../hooks/useAssets';
import { AssetDefinition } from '../../../constants';
import { DialogTitle } from './DialogTitle';
import { DialogFooter } from './DialogFooter';

// When opening the AssetDialog in the MediaLibraryInput,
// creation permissions has already been checked.
// However, we need to make sure that the user has read permissions since
// ML and CM permissions are not the same
export const AssetDialog = ({
  onClose,
  onAddAsset,
  onValidate,
  multiple,
  initiallySelectedAssets,
  canRead,
  canCreate,
}) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useAssets({ skipWhen: !canRead });
  const [selectedAssets, { selectOne, selectAll, selectOnly }] = useSelectionState(
    'id',
    initiallySelectedAssets
  );

  const handleSelectAsset = asset => (multiple ? selectOne(asset) : selectOnly(asset));
  const assets = data?.results;

  if (isLoading) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title" aria-busy>
        <DialogTitle />
        <Flex justifyContent="center" paddingTop={4} paddingBottom={4}>
          <Loader>
            {formatMessage({
              id: getTrad('list.asset.load'),
              defaultMessage: 'Loading the asset list.',
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

  if ((canCreate && !canRead) || (canRead && assets?.length === 0)) {
    return (
      <ModalLayout onClose={onClose} labelledBy="asset-dialog-title">
        <DialogTitle />
        <NoMedia
          action={
            canCreate && (
              <Button variant="secondary" startIcon={<AddIcon />} onClick={onAddAsset}>
                {formatMessage({
                  id: getTrad('modal.header.browse'),
                  defaultMessage: 'Upload assets',
                })}
              </Button>
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
                  defaultMessage: 'The asset list is empty.',
                })
          }
        />
        <DialogFooter onClose={onClose} />
      </ModalLayout>
    );
  }

  return (
    <ModalLayout onClose={onClose} labelledBy="asset-dialog-title" aria-busy={isLoading}>
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
            {canRead && (
              <Tab>
                {formatMessage({
                  id: getTrad('modal.nav.browse'),
                  defaultMessage: 'Browse',
                })}
              </Tab>
            )}
            <Tab>
              {formatMessage({
                id: getTrad('modal.header.select-files'),
                defaultMessage: 'Selected files',
              })}
              <Badge marginLeft={2}>{selectedAssets.length}</Badge>
            </Tab>
          </Tabs>

          {canCreate && (
            <Button onClick={onAddAsset}>
              {formatMessage({
                id: getTrad('modal.upload-list.sub-header.button'),
                defaultMessage: 'Add more assets',
              })}
            </Button>
          )}
        </Flex>
        <Divider />
        <TabPanels>
          {canRead && (
            <TabPanel>
              <ModalBody>
                <BrowseStep
                  assets={assets}
                  onSelectAsset={handleSelectAsset}
                  selectedAssets={selectedAssets}
                  onSelectAllAsset={multiple ? () => selectAll(assets) : undefined}
                />
              </ModalBody>
            </TabPanel>
          )}
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
  canCreate: false,
  canRead: false,
  multiple: false,
};

AssetDialog.propTypes = {
  canCreate: PropTypes.bool,
  canRead: PropTypes.bool,
  initiallySelectedAssets: PropTypes.arrayOf(AssetDefinition).isRequired,
  multiple: PropTypes.bool,
  onAddAsset: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
};
