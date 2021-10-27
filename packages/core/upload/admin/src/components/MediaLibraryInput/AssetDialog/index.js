import React from 'react';
import PropTypes from 'prop-types';
import { ModalLayout, ModalHeader, ModalFooter, ModalBody } from '@strapi/parts/ModalLayout';
import { ButtonText } from '@strapi/parts/Text';
import { Flex } from '@strapi/parts/Flex';
import { Button } from '@strapi/parts/Button';
import { Divider } from '@strapi/parts/Divider';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/parts/Tabs';
import { Badge } from '@strapi/parts/Badge';
import {
  LoadingIndicatorPage,
  NoPermissions,
  NoMedia,
  AnErrorOccurred,
  useSelectionState,
} from '@strapi/helper-plugin';
import AddIcon from '@strapi/icons/AddIcon';
import getTrad from '../../../utils/getTrad';
import { SelectedStep } from './SelectedStep';
import { BrowseStep } from './BrowseStep';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useAssets } from '../../../hooks/useAssets';

// TODO: this will move when "multiple" will be used for real
// eslint-disable-next-line no-unused-vars
export const AssetDialog = ({ onClose, multiple }) => {
  const { formatMessage } = useIntl();
  const [selectedAssets, { selectOne, selectAll }] = useSelectionState('id', []);

  const { canRead, canCreate, isLoading: isLoadingPermissions } = useMediaLibraryPermissions();
  const { data, isLoading, error } = useAssets({
    skipWhen: !canRead,
  });

  const loading = isLoadingPermissions || isLoading;
  const assets = data?.results;

  return (
    <ModalLayout onClose={onClose} labelledBy="asset-dialog-title" aria-busy={loading}>
      <ModalHeader>
        <ButtonText textColor="neutral800" as="h2" id="asset-dialog-title">
          {formatMessage({
            id: getTrad('header.actions.upload-assets'),
            defaultMessage: 'Upload assets',
          })}
        </ButtonText>
      </ModalHeader>

      {loading && <LoadingIndicatorPage />}
      {error && <AnErrorOccurred />}
      {!canRead && <NoPermissions />}
      {canRead && assets && assets.length === 0 && (
        <NoMedia
          action={
            canCreate ? (
              <Button variant="secondary" startIcon={<AddIcon />} onClick={() => {}}>
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
      )}

      {canRead && assets && assets.length > 0 && (
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

            <Button onClick={() => {}}>
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
                  onSelectAsset={selectOne}
                  selectedAssets={selectedAssets}
                  onSelectAllAsset={() => selectAll(assets)}
                  onEditAsset={() => {}}
                />
              </ModalBody>
            </TabPanel>
            <TabPanel>
              <ModalBody>
                <SelectedStep selectedAssets={selectedAssets} onSelectAsset={selectOne} />
              </ModalBody>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      )}

      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <>
            <Button onClick={() => {}}>
              {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
            </Button>
          </>
        }
      />
    </ModalLayout>
  );
};

AssetDialog.defaultProps = {
  multiple: false,
};

AssetDialog.propTypes = {
  multiple: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};
