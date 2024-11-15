import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { Button, Flex, Grid, KeyboardNavigable, Modal, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { AssetType } from '../../../constants';
import { getTrad } from '../../../utils';
import { AssetCard } from '../../AssetCard/AssetCard';
import { UploadingAssetCard } from '../../AssetCard/UploadingAssetCard';

import type { File, RawFile } from '../../../../../shared/contracts/files';

const Status = {
  Idle: 'IDLE',
  Uploading: 'UPLOADING',
  Intermediate: 'INTERMEDIATE',
};

interface Asset extends File {
  rawFile?: RawFile;
  type?: AssetType;
}

interface PendingAssetStepProps {
  addUploadedFiles?: (files: File[]) => void;
  folderId?: string | number | null;
  onClose: () => void;
  onEditAsset: (asset: File) => void;
  onRemoveAsset: (asset: File) => void;
  onAddAsset?: (asset: File) => void;
  assets: Asset[];
  onClickAddAsset: () => void;
  onCancelUpload: (rawFile: RawFile) => void;
  onUploadSucceed: (file: RawFile) => void;
  trackedLocation?: string;
  initialAssetsToAdd?: File[];
}

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
}: PendingAssetStepProps) => {
  const assetCountRef = React.useRef(0);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [uploadStatus, setUploadStatus] = React.useState(Status.Idle);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const assetsCountByType = assets.reduce(
      (acc: Record<AssetType, string | number>, asset) => {
        const { type } = asset;

        if (type !== undefined && !acc[type]) {
          acc[type] = 0;
        }

        if (type !== undefined) {
          const accType = acc[type];
          const currentCount = typeof accType === 'string' ? accType : accType.toString();
          acc[type] = `${parseInt(currentCount, 10) + 1}`;
        }

        return acc;
      },
      {} as Record<AssetType, string | number>
    );

    trackUsage('willAddMediaLibraryAssets', {
      location: trackedLocation!,
      ...assetsCountByType,
    });

    setUploadStatus(Status.Uploading);
  };

  const handleStatusChange = (status: string, file: RawFile) => {
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
                        addUploadedFiles={addUploadedFiles!}
                        asset={asset}
                        id={assetKey}
                        onCancel={onCancelUpload}
                        onStatusChange={(status) => handleStatusChange(status, asset.rawFile!)}
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
