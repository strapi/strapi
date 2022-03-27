import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/design-system/Stack';
import { IconButton } from '@strapi/design-system/IconButton';
import Trash from '@strapi/icons/Trash';
import DownloadIcon from '@strapi/icons/Download';
import Resize from '@strapi/icons/Crop';
import { useTracking } from '@strapi/helper-plugin';
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
import { CopyLinkButton } from '../../CopyLinkButton';
import { UploadProgress } from '../../UploadProgress';
import { AssetType, AssetDefinition } from '../../../constants';
import { AssetPreview } from './AssetPreview';
import { createAssetUrl } from '../../../utils/createAssetUrl';

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
  trackedLocation,
}) => {
  const { trackUsage } = useTracking();
  const previewRef = useRef(null);
  const [isCropImageReady, setIsCropImageReady] = useState(false);
  const [hasCropIntent, setHasCropIntent] = useState(null);
  const [assetUrl, setAssetUrl] = useState(createAssetUrl(asset, false));
  const [thumbnailUrl, setThumbnailUrl] = useState(createAssetUrl(asset, true));
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

      if (asset.isLocal) {
        asset.url = fileLocalUrl;
      }

      setAssetUrl(fileLocalUrl);
      setThumbnailUrl(fileLocalUrl);
    }
  }, [replacementFile, asset]);

  useEffect(() => {
    if (hasCropIntent === false) {
      stopCropping();
      onCropCancel();
    }
  }, [hasCropIntent, stopCropping, onCropCancel, onCropFinish]);

  useEffect(() => {
    if (hasCropIntent && isCropImageReady) {
      crop(previewRef.current);
      onCropStart();
    }
  }, [isCropImageReady, hasCropIntent, onCropStart, crop]);

  const handleCropping = async () => {
    const nextAsset = { ...asset, width, height };
    const file = await produceFile(nextAsset.name, nextAsset.mime, nextAsset.updatedAt);

    // Making sure that when persisting the new asset, the URL changes with width and height
    // So that the browser makes a request and handle the image caching correctly at the good size
    let optimizedCachingImage;
    let optimizedCachingThumbnailImage;

    if (asset.isLocal) {
      optimizedCachingImage = URL.createObjectURL(file);
      optimizedCachingThumbnailImage = optimizedCachingImage;
      asset.url = optimizedCachingImage;
      asset.rawFile = file;

      trackUsage('didCropFile', { duplicatedFile: null, location: trackedLocation });
    } else {
      const updatedAsset = await editAsset(nextAsset, file);
      optimizedCachingImage = createAssetUrl(updatedAsset, false);
      optimizedCachingThumbnailImage = createAssetUrl(updatedAsset, true);

      trackUsage('didCropFile', { duplicatedFile: false, location: trackedLocation });
    }

    setAssetUrl(optimizedCachingImage);
    setThumbnailUrl(optimizedCachingThumbnailImage);
    setHasCropIntent(false);
  };

  const isInCroppingMode = isCropping && !isLoading;

  const handleDuplication = async () => {
    const nextAsset = { ...asset, width, height };
    const file = await produceFile(nextAsset.name, nextAsset.mime, nextAsset.updatedAt);

    await upload({ name: file.name, rawFile: file });

    trackUsage('didCropFile', { duplicatedFile: true, location: trackedLocation });

    setHasCropIntent(false);
    onCropFinish();
  };

  const handleCropCancel = () => {
    setHasCropIntent(false);
  };

  const handleCropStart = () => {
    setHasCropIntent(true);
  };

  return (
    <>
      <RelativeBox hasRadius background="neutral150" borderColor="neutral200">
        {isCropperReady && isInCroppingMode && (
          <CroppingActions
            onValidate={handleCropping}
            onDuplicate={asset.isLocal ? undefined : handleDuplication}
            onCancel={handleCropCancel}
          />
        )}

        <ActionRow paddingLeft={3} paddingRight={3} justifyContent="flex-end">
          <Stack spacing={1} horizontal>
            {canUpdate && !asset.isLocal && (
              <IconButton
                label={formatMessage({
                  id: 'global.delete',
                  defaultMessage: 'Delete',
                })}
                icon={<Trash />}
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
          {/* This one is for editing an asset */}
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

          <AssetPreview
            ref={previewRef}
            mime={asset.mime}
            name={asset.name}
            url={hasCropIntent ? assetUrl : thumbnailUrl}
            onLoad={() => {
              if (asset.isLocal || hasCropIntent) {
                setIsCropImageReady(true);
              }
            }}
          />
        </Wrapper>

        <ActionRow
          paddingLeft={2}
          paddingRight={2}
          justifyContent="flex-end"
          blurry={isInCroppingMode}
        >
          {isInCroppingMode && width && height && (
            <BadgeOverride background="neutral900" color="neutral0">
              {width && height ? `${height}✕${width}` : 'N/A'}
            </BadgeOverride>
          )}
        </ActionRow>
      </RelativeBox>

      {showConfirmDialog && (
        <RemoveAssetDialog
          onClose={() => {
            setShowConfirmDialog(false);
            onDelete(null);
          }}
          asset={asset}
        />
      )}
    </>
  );
};

PreviewBox.defaultProps = {
  replacementFile: undefined,
  trackedLocation: undefined,
};

PreviewBox.propTypes = {
  canUpdate: PropTypes.bool.isRequired,
  canCopyLink: PropTypes.bool.isRequired,
  canDownload: PropTypes.bool.isRequired,
  replacementFile: PropTypes.instanceOf(File),
  asset: AssetDefinition.isRequired,
  onDelete: PropTypes.func.isRequired,
  onCropFinish: PropTypes.func.isRequired,
  onCropStart: PropTypes.func.isRequired,
  onCropCancel: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};
