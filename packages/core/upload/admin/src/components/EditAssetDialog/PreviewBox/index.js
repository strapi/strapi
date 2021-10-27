import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/design-system/Stack';
import { IconButton } from '@strapi/design-system/IconButton';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import DownloadIcon from '@strapi/icons/DownloadIcon';
import Resize from '@strapi/icons/Resize';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import getTrad from '../../../utils/getTrad';
import { downloadFile } from '../../../utils/downloadFile';
import { RemoveAssetDialog } from '../RemoveAssetDialog';
import { useCropImg } from '../../../hooks/useCropImg';
import { useEditAsset } from '../../../hooks/useEditAsset';
import { useUpload } from '../../../hooks/useUpload';
import {
  RelativeBox,
  ActionRow,
  Wrapper,
  BadgeOverride,
  UploadProgressWrapper,
} from './components';
import { CroppingActions } from './CroppingActions';
import { CopyLinkButton } from './CopyLinkButton';
import { UploadProgress } from '../../UploadProgress';
import { AssetType } from '../../../constants';
import { AssetPreview } from './AssetPreview';

const createAssetUrl = url => prefixFileUrlWithBackendUrl(`${url}?id=${Date.now()}`);

export const PreviewBox = ({
  asset,
  canUpdate,
  canCopyLink,
  canDownload,
  onDelete,
  onCropFinish,
  onCropStart,
  onCropCancel,
  replacementFile,
}) => {
  const previewRef = useRef(null);
  const [assetUrl, setAssetUrl] = useState(createAssetUrl(asset.url));
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const {
    crop,
    produceFile,
    stopCropping,
    isCropping,
    isCropperReady,
    width,
    height,
  } = useCropImg();
  const { editAsset, error, isLoading, progress, cancel } = useEditAsset();

  const {
    upload,
    isLoading: isLoadingUpload,
    cancel: cancelUpload,
    error: uploadError,
    progress: progressUpload,
  } = useUpload();

  useEffect(() => {
    // Whenever a replacementUrl is set, make sure to permutate the real asset.url by
    // the locally generated one
    if (replacementFile) {
      const fileLocalUrl = URL.createObjectURL(replacementFile);
      setAssetUrl(fileLocalUrl);
    }
  }, [replacementFile]);

  const handleCropping = async () => {
    const nextAsset = { ...asset, width, height };
    const file = await produceFile(nextAsset.name, nextAsset.mime, nextAsset.updatedAt);

    await editAsset(nextAsset, file);

    // Making sure that when persisting the new asset, the URL changes with width and height
    // So that the browser makes a request and handle the image caching correctly at the good size
    const optimizedCachingImage = createAssetUrl(asset.url);
    setAssetUrl(optimizedCachingImage);

    stopCropping();
    onCropCancel();
  };

  const isInCroppingMode = isCropping && !isLoading;

  const handleDuplication = async () => {
    const nextAsset = { ...asset, width, height };
    const file = await produceFile(nextAsset.name, nextAsset.mime, nextAsset.updatedAt);

    await upload(file);

    stopCropping();
    onCropFinish();
  };

  const handleCropCancel = () => {
    stopCropping();
    onCropCancel();
  };

  const handleCropStart = () => {
    crop(previewRef.current);
    onCropStart();
  };

  return (
    <>
      <RelativeBox hasRadius background="neutral150" borderColor="neutral200">
        {isCropperReady && isInCroppingMode && (
          <CroppingActions
            onValidate={handleCropping}
            onDuplicate={handleDuplication}
            onCancel={handleCropCancel}
          />
        )}

        <ActionRow paddingLeft={3} paddingRight={3} justifyContent="flex-end">
          <Stack size={1} horizontal>
            {canUpdate && (
              <IconButton
                label={formatMessage({
                  id: getTrad('app.utils.delete'),
                  defaultMessage: 'Delete',
                })}
                icon={<DeleteIcon />}
                onClick={() => setShowConfirmDialog(true)}
              />
            )}

            {canDownload && (
              <IconButton
                label={formatMessage({
                  id: getTrad('control-card.download'),
                  defaultMessage: 'Download',
                })}
                icon={<DownloadIcon />}
                onClick={() => downloadFile(assetUrl, asset.name)}
              />
            )}

            {canCopyLink && <CopyLinkButton url={assetUrl} />}

            {canUpdate && asset.mime.includes(AssetType.Image) && (
              <IconButton
                label={formatMessage({ id: getTrad('control-card.crop'), defaultMessage: 'Crop' })}
                icon={<Resize />}
                onClick={handleCropStart}
              />
            )}
          </Stack>
        </ActionRow>

        <Wrapper>
          {/* This one is for editting an asset */}
          {isLoading && (
            <UploadProgressWrapper>
              <UploadProgress error={error} onCancel={cancel} progress={progress} />
            </UploadProgressWrapper>
          )}

          {/* This one is for duplicating an asset after cropping */}
          {isLoadingUpload && (
            <UploadProgressWrapper>
              <UploadProgress
                error={uploadError}
                onCancel={cancelUpload}
                progress={progressUpload}
              />
            </UploadProgressWrapper>
          )}

          <AssetPreview ref={previewRef} mime={asset.mime} name={asset.name} url={assetUrl} />
        </Wrapper>

        <ActionRow
          paddingLeft={2}
          paddingRight={2}
          justifyContent="flex-end"
          blurry={isInCroppingMode}
        >
          {isInCroppingMode && width && height && (
            <BadgeOverride background="neutral900" color="neutral0">
              {`${height}✕${width}`}
            </BadgeOverride>
          )}
        </ActionRow>
      </RelativeBox>

      {showConfirmDialog && (
        <RemoveAssetDialog
          onClose={() => {
            setShowConfirmDialog(false);
            onDelete();
          }}
          asset={asset}
        />
      )}
    </>
  );
};

PreviewBox.defaultProps = {
  replacementFile: undefined,
};

PreviewBox.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
  canCopyLink: PropTypes.bool.isRequired,
  canDownload: PropTypes.bool.isRequired,
  replacementFile: PropTypes.instanceOf(File),
  asset: PropTypes.shape({
    id: PropTypes.number,
    height: PropTypes.number,
    width: PropTypes.number,
    size: PropTypes.number,
    createdAt: PropTypes.string,
    ext: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    mime: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onCropFinish: PropTypes.func.isRequired,
  onCropStart: PropTypes.func.isRequired,
  onCropCancel: PropTypes.func.isRequired,
};
