// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { Flex, IconButton } from '@strapi/design-system';
import { Crop as Resize, Download as DownloadIcon, Trash, PinMap } from '@strapi/icons';
import cropperjscss from 'cropperjs/dist/cropper.css?raw';
import { useIntl } from 'react-intl';
import { createGlobalStyle } from 'styled-components';

import { AssetType } from '../../../enums';
import { useCropImg } from '../../../hooks/useCropImg';
import { useEditAsset } from '../../../hooks/useEditAsset';
import { useTracking } from '../../../hooks/useTracking';
import { useUpload } from '../../../hooks/useUpload';
import { createAssetUrl, getTrad, downloadFile } from '../../../utils';
import { CopyLinkButton } from '../../CopyLinkButton/CopyLinkButton';
import { UploadProgress } from '../../UploadProgress/UploadProgress';
import { RemoveAssetDialog } from '../RemoveAssetDialog';

import { AssetPreview } from './AssetPreview';
import { CroppingActions } from './CroppingActions';
import { FocalPointActions } from './FocalPointActions';
import {
  ActionRow,
  BadgeOverride,
  RelativeBox,
  UploadProgressWrapper,
  Wrapper,
  FocalPointImageWrapper,
  FocalPointAim,
  FocalPointHalo,
} from './PreviewComponents';

import type {
  File as FileDefinition,
  RawFile,
  FocalPoint,
} from '../../../../../shared/contracts/files';

interface Asset extends Omit<FileDefinition, 'folder'> {
  isLocal?: boolean;
  rawFile?: RawFile;
  folder?: FileDefinition['folder'] & { id: number };
}

interface PreviewBoxProps {
  asset: Asset;
  canUpdate: boolean;
  canCopyLink: boolean;
  canDownload: boolean;
  replacementFile?: File;
  onDelete: (asset?: Asset | null) => void;
  onCropFinish: () => void;
  onCropStart: () => void;
  onCropCancel: () => void;
  trackedLocation?: string;
  formFocalPoint?: FocalPoint | null;
  onFocalPointStart: () => void;
  onFocalPointFinish: (focalPoint: FocalPoint) => void;
  onFocalPointCancel: () => void;
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
  formFocalPoint,
  onFocalPointStart,
  onFocalPointFinish,
  onFocalPointCancel,
}: PreviewBoxProps) => {
  const CropperjsStyle = createGlobalStyle`${cropperjscss}`;
  const { trackUsage } = useTracking();
  const previewRef = React.useRef(null);
  const [isCropImageReady, setIsCropImageReady] = React.useState(false);
  const [hasCropIntent, setHasCropIntent] = React.useState<boolean | null>(null);
  const [assetUrl, setAssetUrl] = React.useState(createAssetUrl(asset, false));
  const [thumbnailUrl, setThumbnailUrl] = React.useState(createAssetUrl(asset, true));
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const { crop, produceFile, stopCropping, isCropping, isCropperReady, width, height } =
    useCropImg();
  const { editAsset, error, isLoading, progress, cancel } = useEditAsset();
  const [isInFocalPointMode, setIsInFocalPointMode] = React.useState<boolean>(false);
  const [focalPoint, setFocalPoint] = React.useState<FocalPoint>(
    formFocalPoint ?? { x: 50, y: 50 }
  );

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
    if (hasCropIntent && isCropImageReady) {
      crop(previewRef.current!);
      onCropStart();
    }
  }, [isCropImageReady, hasCropIntent, onCropStart, crop]);

  const handleCropping = async () => {
    const nextAsset = { ...asset, width, height, folder: asset.folder?.id };
    const file = (await produceFile(nextAsset.name, nextAsset.mime!, nextAsset.updatedAt!)) as File;

    // Making sure that when persisting the new asset, the URL changes with width and height
    // So that the browser makes a request and handle the image caching correctly at the good size
    let optimizedCachingImage;
    let optimizedCachingThumbnailImage;

    if (asset.isLocal) {
      optimizedCachingImage = URL.createObjectURL(file);
      optimizedCachingThumbnailImage = optimizedCachingImage;
      asset.url = optimizedCachingImage;
      asset.rawFile = file;

      trackUsage('didCropFile', { duplicatedFile: null, location: trackedLocation! });
    } else {
      const updatedAsset = await editAsset(nextAsset, file);
      optimizedCachingImage = createAssetUrl(updatedAsset, false);
      optimizedCachingThumbnailImage = createAssetUrl(updatedAsset, true);

      trackUsage('didCropFile', { duplicatedFile: false, location: trackedLocation! });
    }

    setAssetUrl(optimizedCachingImage);
    setThumbnailUrl(optimizedCachingThumbnailImage);
    setHasCropIntent(false);
  };

  const isInCroppingMode = isCropping && !isLoading;

  const handleDuplication = async () => {
    const nextAsset = { ...asset, width, height };
    const file = (await produceFile(
      nextAsset.name,
      nextAsset.mime!,
      nextAsset.updatedAt!
    )) as RawFile;

    await upload({ name: file.name, rawFile: file }, asset.folder?.id ? asset.folder.id : null);

    trackUsage('didCropFile', { duplicatedFile: true, location: trackedLocation! });

    setHasCropIntent(false);
    onCropFinish();
  };

  const handleCropCancel = () => {
    setHasCropIntent(false);
  };

  const handleCropStart = () => {
    setHasCropIntent(true);
  };

  const calculateFocalPointFromEvent = (e: React.MouseEvent<HTMLElement>): FocalPoint => {
    const { clientX, clientY } = e;
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = clientX - rect.left;
    const posY = clientY - rect.top;

    return {
      x: Number(((posX / rect.width) * 100).toFixed(2)),
      y: Number(((posY / rect.height) * 100).toFixed(2)),
    };
  };

  const handleFocalPointClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isInFocalPointMode) return;
    setFocalPoint(calculateFocalPointFromEvent(e));
  };

  const handleFocalPointCancel = () => {
    setIsInFocalPointMode(false);
    setFocalPoint(formFocalPoint ?? { x: 50, y: 50 });
    onFocalPointCancel();
  };

  const handleFocalPointStart = () => {
    onFocalPointStart();
    setIsInFocalPointMode(true);
  };

  const handleFocalPointValidate = () => {
    setIsInFocalPointMode(false);
    onFocalPointFinish(focalPoint);
  };

  const handleFocalPointReset = () => {
    setFocalPoint({ x: 50, y: 50 });
  };

  return (
    <>
      <CropperjsStyle />
      <RelativeBox hasRadius background="neutral150" borderColor="neutral200">
        {isCropperReady && isInCroppingMode && (
          <CroppingActions
            onValidate={handleCropping}
            onDuplicate={asset.isLocal ? undefined : handleDuplication}
            onCancel={handleCropCancel}
          />
        )}

        {isInFocalPointMode && (
          <FocalPointActions
            onValidate={handleFocalPointValidate}
            onCancel={handleFocalPointCancel}
            onReset={handleFocalPointReset}
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
                onClick={() => downloadFile(assetUrl!, asset.name)}
              >
                <DownloadIcon />
              </IconButton>
            )}

            {canCopyLink && <CopyLinkButton url={assetUrl!} />}

            {canUpdate && asset.mime?.includes(AssetType.Image) && (
              <IconButton
                label={formatMessage({ id: getTrad('control-card.crop'), defaultMessage: 'Crop' })}
                onClick={handleCropStart}
              >
                <Resize />
              </IconButton>
            )}

            {canUpdate && asset.mime?.includes(AssetType.Image) && (
              <IconButton
                label={formatMessage({
                  id: getTrad('control-card.set-focal-point'),
                  defaultMessage: 'Set focal point',
                })}
                onClick={handleFocalPointStart}
              >
                <PinMap />
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
                error={uploadError}
                onCancel={cancelUpload}
                progress={progressUpload}
              />
            </UploadProgressWrapper>
          )}

          <FocalPointImageWrapper>
            <AssetPreview
              ref={previewRef}
              mime={asset.mime!}
              name={asset.name}
              url={hasCropIntent ? assetUrl! : thumbnailUrl!}
              onLoad={() => {
                if (asset.isLocal || hasCropIntent) {
                  setIsCropImageReady(true);
                }
              }}
              onClick={handleFocalPointClick}
              style={{ cursor: isInFocalPointMode ? 'crosshair' : undefined }}
            />

            {/* Show the set focal point marker */}
            {isInFocalPointMode && (
              <FocalPointAim $focalPoint={focalPoint}>
                <FocalPointHalo />
              </FocalPointAim>
            )}
          </FocalPointImageWrapper>
        </Wrapper>

        <ActionRow
          paddingLeft={2}
          paddingRight={2}
          justifyContent="flex-end"
          $blurry={isInCroppingMode || isInFocalPointMode}
        >
          {isInCroppingMode && width && height && (
            <BadgeOverride background="neutral900" color="neutral0">
              {width && height ? `${height}✕${width}` : 'N/A'}
            </BadgeOverride>
          )}
          {isInFocalPointMode && (
            <BadgeOverride background="neutral900" color="neutral0">
              {`x: ${focalPoint.x}% | y: ${focalPoint.y}%`}
            </BadgeOverride>
          )}
        </ActionRow>
      </RelativeBox>

      <RemoveAssetDialog
        open={showConfirmDialog}
        onClose={(value) => {
          setShowConfirmDialog(false);
          if (value === null) {
            onDelete(null);
          }
        }}
        asset={asset}
      />
    </>
  );
};
