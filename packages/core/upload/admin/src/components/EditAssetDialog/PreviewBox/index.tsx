import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { Flex, IconButton } from '@strapi/design-system';
import { Crop as Resize, Download as DownloadIcon, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useCropImg } from '../../../hooks/useCropImg';
import { useEditAsset } from '../../../hooks/useEditAsset';
import { useUpload } from '../../../hooks/useUpload';
// TODO: replace with the import from the constants file when it will be migrated
import { AssetType } from '../../../newConstants';
import { createAssetUrl } from '../../../utils';
import { downloadFile } from '../../../utils/downloadFile';
import { getTrad } from '../../../utils';
import { CopyLinkButton } from '../../CopyLinkButton';
import { UploadProgress } from '../../UploadProgress/UploadProgress';
import { RemoveAssetDialog } from '../RemoveAssetDialog';

import { AssetPreview } from './AssetPreview';
import {
  ActionRow,
  BadgeOverride,
  RelativeBox,
  UploadProgressWrapper,
  Wrapper,
} from './components';
import { CroppingActions } from './CroppingActions';
import type { AssetEnriched } from '../../../../../shared/contracts/files';

import 'cropperjs/dist/cropper.css';

interface PreviewBoxProps {
  canUpdate: boolean;
  canCopyLink: boolean;
  canDownload: boolean;
  asset: AssetEnriched;
  onDelete: (asset: AssetEnriched | null) => void;
  onCropFinish: () => void;
  onCropStart: () => void;
  onCropCancel: () => void;
  replacementFile?: File;
  trackedLocation: string;
}

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
}: PreviewBoxProps) => {
  const { trackUsage } = useTracking();
  const previewRef = React.useRef<HTMLImageElement>(null);
  const [isCropImageReady, setIsCropImageReady] = React.useState(false);
  const [hasCropIntent, setHasCropIntent] = React.useState<boolean | null>(null);
  const [assetUrl, setAssetUrl] = React.useState(createAssetUrl(asset, false));
  const [thumbnailUrl, setThumbnailUrl] = React.useState(createAssetUrl(asset, true));
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const { crop, produceFile, stopCropping, isCropping, isCropperReady, width, height } =
    useCropImg();
  const { editAsset, error, isLoading, progress, cancel } = useEditAsset();

  const {
    upload,
    isLoading: isLoadingUpload,
    cancel: cancelUpload,
    error: uploadError,
    progress: progressUpload,
  } = useUpload();

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (hasCropIntent === false) {
      stopCropping();
      onCropCancel();
    }
  }, [hasCropIntent, stopCropping, onCropCancel, onCropFinish]);

  React.useEffect(() => {
    if (hasCropIntent && isCropImageReady && previewRef.current) {
      crop(previewRef.current);
      onCropStart();
    }
  }, [isCropImageReady, hasCropIntent, onCropStart, crop]);

  const handleCropping = async () => {
    const nextAsset = { ...asset, width, height, folder: asset.folder?.id };
    const file = await produceFile(nextAsset.name, nextAsset.mime || '', nextAsset.updatedAt);

    // Making sure that when persisting the new asset, the URL changes with width and height
    // So that the browser makes a request and handle the image caching correctly at the good size
    let optimizedCachingImage: string;
    let optimizedCachingThumbnailImage: string;

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
    const file = await produceFile(nextAsset.name, nextAsset.mime || '', nextAsset.updatedAt);

    await upload({ ...nextAsset, name: file.name, rawFile: file }, asset.folder?.id || null);

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
          <Flex gap={1}>
            {canUpdate && !asset.isLocal && (
              <IconButton
                label={formatMessage({
                  id: 'global.delete',
                  defaultMessage: 'Delete',
                })}
                onClick={() => setShowConfirmDialog(true)}
              >
                <Trash />
              </IconButton>
            )}

            {canDownload && (
              <IconButton
                label={formatMessage({
                  id: getTrad('control-card.download'),
                  defaultMessage: 'Download',
                })}
                onClick={() => downloadFile(assetUrl, asset.name)}
              >
                <DownloadIcon />
              </IconButton>
            )}

            {canCopyLink && <CopyLinkButton url={assetUrl} />}

            {canUpdate && asset.mime?.includes(AssetType.Image) && (
              <IconButton
                label={formatMessage({ id: getTrad('control-card.crop'), defaultMessage: 'Crop' })}
                onClick={handleCropStart}
              >
                <Resize />
              </IconButton>
            )}
          </Flex>
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
                error={uploadError?.response?.data?.error || null}
                onCancel={cancelUpload}
                progress={progressUpload}
              />
            </UploadProgressWrapper>
          )}

          <AssetPreview
            ref={previewRef}
            mime={asset.mime || ''}
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
          $blurry={isInCroppingMode}
        >
          {isInCroppingMode && width && height && (
            <BadgeOverride background="neutral900" color="neutral0">
              {width && height ? `${height}✕${width}` : 'N/A'}
            </BadgeOverride>
          )}
        </ActionRow>
      </RelativeBox>

      <RemoveAssetDialog
        open={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          onDelete(null);
        }}
        asset={asset}
      />
    </>
  );
};
