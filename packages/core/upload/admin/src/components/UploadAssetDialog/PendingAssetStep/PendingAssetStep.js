import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { ModalHeader, ModalBody, ModalFooter } from '@strapi/design-system/ModalLayout';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { useIntl } from 'react-intl';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';

import { AssetCard } from '../../AssetCard/AssetCard';
import { UploadingAssetCard } from '../../AssetCard/UploadingAssetCard';
import getTrad from '../../../utils/getTrad';
import { AssetDefinition } from '../../../constants';

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
}) => {
  const assetCountRef = useRef(0);
  const { formatMessage } = useIntl();
  const [uploadStatus, setUploadStatus] = useState(Status.Idle);

  const handleSubmit = async e => {
    e.preventDefault();
    e.stopPropagation();

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
    <form onSubmit={handleSubmit}>
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('header.actions.add-assets'),
            defaultMessage: 'Add new assets',
          })}
        </Typography>
      </ModalHeader>

      <ModalBody>
        <Stack spacing={7}>
          <Flex justifyContent="space-between">
            <Stack spacing={0}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                {formatMessage(
                  {
                    id: getTrad('list.assets.selected'),
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
            </Stack>
            <Button size="S" onClick={onClickAddAsset}>
              {formatMessage({
                id: getTrad('header.actions.add-assets'),
                defaultMessage: 'Add new assets',
              })}
            </Button>
          </Flex>
          <KeyboardNavigable tagName="article">
            <Grid gap={4}>
              {assets.map(asset => {
                const assetKey = asset.url;

                if (uploadStatus === Status.Uploading || uploadStatus === Status.Intermediate) {
                  return (
                    <GridItem col={4} key={assetKey}>
                      <UploadingAssetCard
                        // Props used to store the newly uploaded files
                        addUploadedFiles={addUploadedFiles}
                        asset={asset}
                        id={assetKey}
                        onCancel={onCancelUpload}
                        onStatusChange={status => handleStatusChange(status, asset.rawFile)}
                        size="S"
                        folderId={folderId}
                      />
                    </GridItem>
                  );
                }

                return (
                  <GridItem col={4} key={assetKey}>
                    <AssetCard
                      asset={asset}
                      size="S"
                      key={assetKey}
                      local
                      alt={asset.name}
                      onEdit={onEditAsset}
                      onRemove={onRemoveAsset}
                    />
                  </GridItem>
                );
              })}
            </Grid>
          </KeyboardNavigable>
        </Stack>
      </ModalBody>

      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'cancel' })}
          </Button>
        }
        endActions={
          <Button type="submit" loading={uploadStatus === Status.Uploading}>
            {formatMessage(
              {
                id: getTrad('modal.upload-list.footer.button'),
                defaultMessage:
                  'Upload {number, plural, one {# asset} other {# assets}} to the library',
              },
              { number: assets.length }
            )}
          </Button>
        }
      />
    </form>
  );
};

PendingAssetStep.defaultProps = {
  addUploadedFiles: undefined,
  folderId: null,
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
};
