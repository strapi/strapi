import React, { useRef, useState } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { Button, Flex, Grid, KeyboardNavigable, Modal, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition } from '../../../constants';
import { getTrad } from '../../../utils';
import { AssetCard } from '../../AssetCard/AssetCard';
import { UploadingAssetCard } from '../../AssetCard/UploadingAssetCard';

const Status = {
  Idle: 'IDLE',
  Uploading: 'UPLOADING',
  Intermediate: 'INTERMEDIATE',
};

export const PendingAssetStep = ({
  addUploadedFiles,
  folderId,
  onClose,
  onEditAsset,
  onRemoveAsset,
  assets,
  onClickAddAsset,
  onCancelUpload,
  onUploadSucceed,
  trackedLocation,
}) => {
  const assetCountRef = useRef(0);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [uploadStatus, setUploadStatus] = useState(Status.Idle);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const assetsCountByType = assets.reduce((acc, asset) => {
      const { type } = asset;

      if (!acc[type]) {
        acc[type] = 0;
      }

      // values need to be stringified because Amplitude ignores number values
      acc[type] = `${parseInt(acc[type], 10) + 1}`;

      return acc;
    }, {});

    trackUsage('willAddMediaLibraryAssets', {
      location: trackedLocation,
      ...assetsCountByType,
    });

    setUploadStatus(Status.Uploading);
  };

  const handleStatusChange = (status, file) => {
    if (status === 'success' || status === 'error') {
      assetCountRef.current++;

      // There's no "terminated" status. When all the files have called their
      // onUploadSucceed callback, the parent component filters the asset list
      // and closes the modal when the asset list is empty
      if (assetCountRef.current === assets.length) {
        assetCountRef.current = 0;
        setUploadStatus(Status.Intermediate);
      }
    }

    if (status === 'success') {
      onUploadSucceed(file);
    }
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

      <Modal.Body>
        <Flex direction="column" alignItems="stretch" gap={7}>
          <Flex justifyContent="space-between">
            <Flex direction="column" alignItems="stretch" gap={0}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                {formatMessage(
                  {
                    id: getTrad('list.assets.to-upload'),
                    defaultMessage:
                      '{number, plural, =0 {No asset} one {1 asset} other {# assets}} ready to upload',
                  },
                  { number: assets.length }
                )}
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                {formatMessage({
                  id: getTrad('modal.upload-list.sub-header-subtitle'),
                  defaultMessage: 'Manage the assets before adding them to the Media Library',
                })}
              </Typography>
            </Flex>
            <Button size="S" onClick={onClickAddAsset}>
              {formatMessage({
                id: getTrad('header.actions.add-assets'),
                defaultMessage: 'Add new assets',
              })}
            </Button>
          </Flex>
          <KeyboardNavigable tagName="article">
            <Grid.Root gap={4}>
              {assets.map((asset) => {
                const assetKey = asset.url;

                if (uploadStatus === Status.Uploading || uploadStatus === Status.Intermediate) {
                  return (
                    <Grid.Item col={4} key={assetKey} direction="column" alignItems="stretch">
                      <UploadingAssetCard
                        // Props used to store the newly uploaded files
                        addUploadedFiles={addUploadedFiles}
                        asset={asset}
                        id={assetKey}
                        onCancel={onCancelUpload}
                        onStatusChange={(status) => handleStatusChange(status, asset.rawFile)}
                        size="S"
                        folderId={folderId}
                      />
                    </Grid.Item>
                  );
                }

                return (
                  <Grid.Item col={4} key={assetKey} direction="column" alignItems="stretch">
                    <AssetCard
                      asset={asset}
                      size="S"
                      key={assetKey}
                      local
                      alt={asset.name}
                      onEdit={onEditAsset}
                      onRemove={onRemoveAsset}
                    />
                  </Grid.Item>
                );
              })}
            </Grid.Root>
          </KeyboardNavigable>
        </Flex>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} variant="tertiary">
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'cancel' })}
        </Button>
        <Button onClick={handleSubmit} loading={uploadStatus === Status.Uploading}>
          {formatMessage(
            {
              id: getTrad('modal.upload-list.footer.button'),
              defaultMessage:
                'Upload {number, plural, one {# asset} other {# assets}} to the library',
            },
            { number: assets.length }
          )}
        </Button>
      </Modal.Footer>
    </>
  );
};

PendingAssetStep.defaultProps = {
  addUploadedFiles: undefined,
  folderId: null,
  trackedLocation: undefined,
};

PendingAssetStep.propTypes = {
  addUploadedFiles: PropTypes.func,
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
  folderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onClose: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onRemoveAsset: PropTypes.func.isRequired,
  onClickAddAsset: PropTypes.func.isRequired,
  onUploadSucceed: PropTypes.func.isRequired,
  onCancelUpload: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};
