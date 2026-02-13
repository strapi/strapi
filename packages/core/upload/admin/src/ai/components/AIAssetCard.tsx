import * as React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import {
  Box,
  Card,
  CardAction,
  CardAsset,
  CardBadge,
  CardBody,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
  CardTimer,
  Field,
  Flex,
  Grid,
  TextInput,
  Typography,
  IconButton,
  Dialog,
  Modal,
} from '@strapi/design-system';
import { Pencil, Sparkle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AudioPreview } from '../../components/AssetCard/AudioPreview';
import { VideoPreview } from '../../components/AssetCard/VideoPreview';
import { type Asset, EditAssetContent } from '../../components/EditAssetDialog/EditAssetContent';
import { AssetType, DocType } from '../../enums';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { useRemoveAsset } from '../../hooks/useRemoveAsset';
import {
  formatBytes,
  formatDuration,
  getFileExtension,
  getTrad,
  prefixFileUrlWithBackendUrl,
} from '../../utils';
import { typeFromMime } from '../../utils/typeFromMime';

import { useAIUploadModalContext } from './AIUploadModal';

import type { File } from '../../../../shared/contracts/files';

const CardActionsContainer = styled(CardAction)`
  opacity: 0;
  z-index: 1;

  &:focus-within {
    opacity: 1;
  }
`;

const CardContainer = styled(Box)`
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};

  &:hover {
    ${CardActionsContainer} {
      opacity: 1;
    }
  }
`;

/* -------------------------------------------------------------------------------------------------
 * AssetCardActions
 * -----------------------------------------------------------------------------------------------*/

const AssetCardActions = ({ asset }: { asset: File }) => {
  const { formatMessage } = useIntl();
  const dispatch = useAIUploadModalContext('AssetCardActions', (s) => s.dispatch);
  const state = useAIUploadModalContext('AssetCardActions', (s) => s.state);
  const onClose = useAIUploadModalContext('AssetCardActions', (s) => s.onClose);
  const { canUpdate, canCopyLink, canDownload } = useMediaLibraryPermissions();

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  const { removeAsset } = useRemoveAsset(() => {});

  const handleConfirmRemove = async (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event?.preventDefault();
    await removeAsset(asset.id);
    dispatch({
      type: 'remove_uploaded_asset',
      payload: { id: asset.id },
    });

    // Close modal if this was the last asset
    if (state.uploadedAssets.length === 1) {
      onClose();
    }
  };

  const handlePropagationClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleEditAsset = (editedAsset?: File | null) => {
    if (editedAsset) {
      dispatch({
        type: 'edit_uploaded_asset',
        payload: { editedAsset },
      });

      setIsEditModalOpen(false);
    }
  };

  return (
    <CardActionsContainer onClick={handlePropagationClick} position="end">
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.remove-selection'),
              defaultMessage: 'Remove from selection',
            })}
          >
            <Trash />
          </IconButton>
        </Dialog.Trigger>
        <ConfirmDialog onConfirm={handleConfirmRemove} />
      </Dialog.Root>

      <Modal.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Modal.Trigger>
          <IconButton
            label={formatMessage({ id: getTrad('control-card.edit'), defaultMessage: 'Edit' })}
          >
            <Pencil />
          </IconButton>
        </Modal.Trigger>
        <Modal.Content>
          <EditAssetContent
            // Is Local must be set to false to trigger the correct branch of logic in the EditAssetContent on submit
            asset={
              {
                ...asset,
                isLocal: false,
                folder: typeof asset.folder === 'number' ? { id: asset.folder } : asset.folder,
              } as Asset
            }
            onClose={(arg) => handleEditAsset(arg as File)}
            canUpdate={canUpdate}
            canCopyLink={canCopyLink}
            canDownload={canDownload}
            omitFields={['caption', 'alternativeText']}
            omitActions={['replace']}
          />
        </Modal.Content>
      </Modal.Root>
    </CardActionsContainer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Asset
 * -----------------------------------------------------------------------------------------------*/

interface AssetProps {
  assetType: AssetType | DocType;
  thumbnailUrl: string;
  assetUrl: string;
  asset: File;
}

interface AssetCardProps {
  asset: File;
  onCaptionChange: (caption: string) => void;
  onAltTextChange: (altText: string) => void;
  wasCaptionChanged: boolean;
  wasAltTextChanged: boolean;
}

const Extension = styled.span`
  text-transform: uppercase;
`;

const VideoPreviewWrapper = styled(Box)`
  position: relative;
  height: 100%;
  overflow: hidden;

  canvas,
  video {
    display: block;
    pointer-events: none;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: ${({ theme }) => theme.borderRadius};
  }
`;

const VideoTimerOverlay = styled(CardTimer)`
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
`;

const AudioPreviewWrapper = styled(Box)`
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  canvas,
  audio {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }
`;

const Asset = ({ assetType, thumbnailUrl, assetUrl, asset }: AssetProps) => {
  const [duration, setDuration] = React.useState<number>();
  const formattedDuration = duration ? formatDuration(duration) : undefined;

  switch (assetType) {
    case AssetType.Image:
      return <CardAsset src={thumbnailUrl} size="S" alt={asset.alternativeText || asset.name} />;
    case AssetType.Video:
      return (
        <CardAsset size="S">
          <VideoPreviewWrapper>
            <VideoPreview
              url={assetUrl}
              mime={asset.mime || 'video/mp4'}
              onLoadDuration={setDuration}
              alt={asset.alternativeText || asset.name}
            />
            {formattedDuration && <VideoTimerOverlay>{formattedDuration}</VideoTimerOverlay>}
          </VideoPreviewWrapper>
        </CardAsset>
      );
    case AssetType.Audio:
      return (
        <CardAsset size="S">
          <AudioPreviewWrapper>
            <AudioPreview url={assetUrl} alt={asset.alternativeText || asset.name} />
          </AudioPreviewWrapper>
        </CardAsset>
      );
    default:
      return <CardAsset src={thumbnailUrl} size="S" alt={asset.alternativeText || asset.name} />;
  }
};

/* -------------------------------------------------------------------------------------------------
 * AssetCard
 * -----------------------------------------------------------------------------------------------*/

const StyledCardBody = styled(CardBody)`
  display: flex;
  padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[1]};
`;

const StyledCard = styled(Card)`
  width: 100%;
  height: 100%;
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
`;

const getAssetBadgeLabel = (assetType: AssetType | DocType) => {
  switch (assetType) {
    case AssetType.Image:
      return { id: getTrad('settings.section.image.label'), defaultMessage: 'IMAGE' };
    case AssetType.Video:
      return { id: getTrad('settings.section.video.label'), defaultMessage: 'VIDEO' };
    case AssetType.Audio:
      return { id: getTrad('settings.section.audio.label'), defaultMessage: 'AUDIO' };
    case DocType.Pdf:
      return { id: getTrad('settings.section.pdf.label'), defaultMessage: 'PDF' };
    case DocType.Csv:
      return { id: getTrad('settings.section.csv.label'), defaultMessage: 'CSV' };
    case DocType.Xls:
      return { id: getTrad('settings.section.xls.label'), defaultMessage: 'XLS' };
    case DocType.Zip:
      return { id: getTrad('settings.section.zip.label'), defaultMessage: 'ZIP' };
    default:
      return { id: getTrad('settings.section.doc.label'), defaultMessage: 'DOC' };
  }
};

export const AIAssetCard = ({
  asset,
  onCaptionChange,
  onAltTextChange,
  wasAltTextChanged,
  wasCaptionChanged,
}: AssetCardProps) => {
  const { formatMessage } = useIntl();

  const assetType = typeFromMime(asset.mime || '');
  const thumbnailUrl =
    prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url) || '';
  const assetUrl = prefixFileUrlWithBackendUrl(asset.url) || '';
  const subtitle = asset.height && asset.width ? ` - ${asset.width}x${asset.height}` : '';
  const formattedSize = asset.size ? formatBytes(asset.size) : '';
  const fullSubtitle = `${subtitle}${subtitle && formattedSize ? ' - ' : ''}${formattedSize}`;

  const [caption, setCaption] = React.useState(asset.caption || '');
  React.useEffect(() => {
    onCaptionChange(caption);
  }, [caption, onCaptionChange]);

  const [altText, setAltText] = React.useState(asset.alternativeText || '');
  React.useEffect(() => {
    onAltTextChange(altText);
  }, [altText, onAltTextChange]);

  return (
    <CardContainer>
      <Grid.Root>
        <Grid.Item m={5} xs={12} alignItems="stretch">
          <StyledCard width="100%" height="100%" shadow="none" borderRadius={0} padding={0}>
            <CardHeader style={{ borderStyle: 'none' }}>
              <AssetCardActions asset={asset} />
              <Asset
                assetType={assetType}
                thumbnailUrl={thumbnailUrl}
                assetUrl={assetUrl}
                asset={asset}
              />
            </CardHeader>
            <StyledCardBody>
              <CardContent width="100%">
                <Flex justifyContent="space-between" alignItems="start">
                  <Typography tag="h2">
                    <CardTitle tag="span">{asset.name}</CardTitle>
                  </Typography>
                  <CardBadge>{formatMessage(getAssetBadgeLabel(assetType))}</CardBadge>
                </Flex>
                <Flex>
                  <CardSubtitle>
                    <Extension>{getFileExtension(asset.ext)}</Extension>
                    {fullSubtitle}
                  </CardSubtitle>
                </Flex>
              </CardContent>
            </StyledCardBody>
          </StyledCard>
        </Grid.Item>

        <Grid.Item m={7} xs={12} flex={1}>
          <Flex direction="column" height="100%" alignItems="stretch" flex={1} padding={4} gap={2}>
            <Field.Root name="caption">
              <Flex alignItems="center" gap={2}>
                <Field.Label>
                  {formatMessage({
                    id: getTrad('form.input.label.file-caption'),
                    defaultMessage: 'Caption',
                  })}
                </Field.Label>
              </Flex>
              <TextInput
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={formatMessage({
                  id: getTrad('form.input.placeholder.file-caption'),
                  defaultMessage: 'Enter caption',
                })}
                endAction={
                  !wasCaptionChanged &&
                  asset.caption && <Sparkle width="16px" height="16px" fill="#AC73E6" />
                }
                type="text"
              />
            </Field.Root>

            <Field.Root
              name="alternativeText"
              hint={formatMessage({
                id: getTrad('form.input.description.file-alt'),
                defaultMessage: "This text will be displayed if the asset can't be shown.",
              })}
            >
              <Flex alignItems="center" gap={2}>
                <Field.Label>
                  {formatMessage({
                    id: getTrad('form.input.label.file-alt'),
                    defaultMessage: 'Alternative text',
                  })}
                </Field.Label>
              </Flex>

              <TextInput
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder={formatMessage({
                  id: getTrad('form.input.placeholder.file-alt'),
                  defaultMessage: 'Enter alternative text',
                })}
                endAction={
                  !wasAltTextChanged &&
                  asset.alternativeText && <Sparkle width="16px" height="16px" fill="#AC73E6" />
                }
                type="text"
              />
              <Field.Hint />
            </Field.Root>
          </Flex>
        </Grid.Item>
      </Grid.Root>
    </CardContainer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetCardSkeletons
 * -----------------------------------------------------------------------------------------------*/

const SkeletonBox = styled(Box)<{ width?: string; height?: string }>`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.neutral100} 25%,
    ${({ theme }) => theme.colors.neutral150} 50%,
    ${({ theme }) => theme.colors.neutral100} 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: ${({ theme }) => theme.borderRadius};
  width: ${({ width }) => width || '100%'};
  height: ${({ height }) => height || '1rem'};

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

export const AIAssetCardSkeletons = ({ count = 1 }: { count?: number }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return skeletons.map((index) => (
    <Box
      key={index}
      background="neutral0"
      borderColor="neutral150"
      borderStyle="solid"
      borderWidth="1px"
      borderRadius="4px"
      marginBottom={4}
    >
      <Grid.Root>
        <Grid.Item col={5} alignItems="stretch">
          <Card
            height="100%"
            width="100%"
            borderStyle="none"
            shadow="none"
            borderRadius={0}
            padding={2}
          >
            <Box height="150px" padding={2}>
              <SkeletonBox height="100%" />
            </Box>
            <CardBody style={{ display: 'flex', padding: '8px 4px' }}>
              <CardContent width="100%">
                <Flex justifyContent="space-between" alignItems="start" marginBottom={1}>
                  <SkeletonBox width="60%" height="18px" />
                  <SkeletonBox width="40px" height="16px" />
                </Flex>
                <SkeletonBox width="80%" height="14px" />
              </CardContent>
            </CardBody>
          </Card>
        </Grid.Item>

        <Grid.Item m={7} xs={12} flex={1}>
          <Flex direction="column" height="100%" alignItems="stretch" flex={1} padding={4} gap={2}>
            <Box>
              <SkeletonBox width="60px" height="16px" marginBottom={1} />
              <SkeletonBox height="32px" />
            </Box>

            <Box>
              <SkeletonBox width="100px" height="16px" marginBottom={1} />
              <SkeletonBox height="32px" />
              <Box marginTop={1}>
                <SkeletonBox width="70%" height="12px" />
              </Box>
            </Box>
          </Flex>
        </Grid.Item>
      </Grid.Root>
    </Box>
  ));
};
