import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { ModalHeader, ModalBody, ModalFooter } from '@strapi/parts/ModalLayout';
import { ButtonText, Text } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import { useIntl } from 'react-intl';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { DocAssetCard } from '../../AssetCard/DocAssetCard';
import { ImageAssetCard } from '../../AssetCard/ImageAssetCard';
import { VideoAssetCard } from '../../AssetCard/VideoAssetCard';
import { UnknownAssetCard } from '../../AssetCard/UnknownAssetCard';
import { UploadingAssetCard } from '../../AssetCard/UploadingAssetCard';
import { getTrad } from '../../../utils';
import { AssetType, AssetSource } from '../../../constants';

const Status = {
  Idle: 'IDLE',
  Uploading: 'UPLOADING',
  Intermediate: 'INTERMEDIATE',
};

export const PendingAssetStep = ({
  onClose,
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
        <ButtonText textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('header.actions.upload-assets'),
            defaultMessage: 'Upload assets',
          })}
        </ButtonText>
      </ModalHeader>

      <ModalBody>
        <Stack size={7}>
          <Row justifyContent="space-between">
            <Stack size={0}>
              <Text small bold textColor="neutral800">
                {formatMessage(
                  {
                    id: getTrad('list.assets.selected.plural'),
                    defaultMessage: '0 asset selected',
                  },
                  { number: assets.length }
                )}
              </Text>
              <Text small textColor="neutral600">
                {formatMessage({
                  id: getTrad('modal.upload-list.sub-header-subtitle'),
                  defaultMessage: 'Manage the assets before adding them to the Media Library',
                })}
              </Text>
            </Stack>
            <Button size="S" onClick={onClickAddAsset}>
              {formatMessage({
                id: getTrad('header.actions.upload-new-asset'),
                defaultMessage: 'Upload new asset',
              })}
            </Button>
          </Row>
          <KeyboardNavigable tagName="article">
            <Grid gap={4}>
              {assets.map(asset => {
                const assetKey = asset.url;

                if (uploadStatus === Status.Uploading || uploadStatus === Status.Intermediate) {
                  return (
                    <GridItem col={4} key={assetKey}>
                      <UploadingAssetCard
                        id={assetKey}
                        name={asset.name}
                        extension={asset.ext}
                        assetType={asset.type}
                        file={asset.rawFile}
                        size="S"
                        onCancel={onCancelUpload}
                        onStatusChange={status => handleStatusChange(status, asset.rawFile)}
                      />
                    </GridItem>
                  );
                }

                if (asset.type === AssetType.Image) {
                  return (
                    <GridItem col={4} key={assetKey}>
                      <ImageAssetCard
                        id={assetKey}
                        name={asset.name}
                        extension={asset.ext}
                        height={asset.height}
                        width={asset.width}
                        thumbnail={asset.url}
                        size="S"
                      />
                    </GridItem>
                  );
                }

                if (asset.type === AssetType.Video) {
                  return (
                    <GridItem col={4} key={assetKey}>
                      <VideoAssetCard
                        id={assetKey}
                        name={asset.name}
                        extension={asset.ext}
                        url={asset.url}
                        mime={asset.mime}
                        size="S"
                      />
                    </GridItem>
                  );
                }

                if (asset.type === AssetType.Unknown) {
                  return (
                    <GridItem col={4} key={assetKey}>
                      <UnknownAssetCard
                        id={assetKey}
                        name={asset.name}
                        extension={asset.ext}
                        size="S"
                      />
                    </GridItem>
                  );
                }

                return (
                  <GridItem col={4} key={assetKey}>
                    <DocAssetCard name={asset.name} extension={asset.ext} size="S" />
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
                id: getTrad('modal.upload-list.footer.button.singular'),
                defaultMessage: 'Upload assets',
              },
              { number: assets.length }
            )}
          </Button>
        }
      />
    </form>
  );
};

PendingAssetStep.propTypes = {
  assets: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.oneOf(Object.values(AssetSource)),
      type: PropTypes.oneOf(Object.values(AssetType)),
      url: PropTypes.string,
      mime: PropTypes.string,
      ext: PropTypes.string,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onClickAddAsset: PropTypes.func.isRequired,
  onUploadSucceed: PropTypes.func.isRequired,
  onCancelUpload: PropTypes.func.isRequired,
};
