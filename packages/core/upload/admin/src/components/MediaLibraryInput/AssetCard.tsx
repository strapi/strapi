import { Badge, Box, Flex, IconButton, Menu, Typography } from '@strapi/design-system';
import { ArrowClockwise, Cross, Link, More, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../utils/translations';

import { AssetPreview, UploadPreview } from './AssetPreview';
import { UploadProgressBar } from './UploadProgressBar';

import type { FieldUpload } from './useFieldUploads';
import type { File } from '../../../../shared/contracts/files';

type CardTone = 'neutral' | 'primary' | 'danger';

const CARD_COLORS = {
  neutral: { background: 'neutral0', border: 'neutral200' },
  primary: { background: 'primary100', border: 'primary200' },
  danger: { background: 'danger100', border: 'danger200' },
} as const;

const Card = styled(Flex)<{ $tone: CardTone }>`
  position: relative;
  min-width: 0;
  overflow: hidden;
  background: ${({ theme, $tone }) => theme.colors[CARD_COLORS[$tone].background]};
  border: 1px solid ${({ theme, $tone }) => theme.colors[CARD_COLORS[$tone].border]};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const Name = styled(Typography)`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PreviewOverlay = styled(Box)`
  position: absolute;
  inset: auto 0 0 0;
`;

const DangerIconButton = styled(IconButton)`
  color: ${({ theme }) => theme.colors.danger600};
  background: ${({ theme }) => theme.colors.danger100};
  border-color: ${({ theme }) => theme.colors.danger200};

  svg path {
    fill: currentColor;
  }
`;

interface CardFrameProps {
  tone: CardTone;
  preview: React.ReactNode;
  overlay?: React.ReactNode;
  name: React.ReactNode;
  actions: React.ReactNode;
}

const CardFrame = ({ tone, preview, overlay, name, actions }: CardFrameProps) => (
  <Card $tone={tone} direction="column" alignItems="stretch">
    <Box position="relative">
      {preview}
      {overlay}
    </Box>
    <Flex
      gap={3}
      paddingLeft={3}
      paddingRight={2}
      paddingTop={2}
      paddingBottom={2}
      minHeight="4.8rem"
    >
      {name}
      <Flex gap={1} shrink={0} marginLeft="auto">
        {actions}
      </Flex>
    </Flex>
  </Card>
);

interface AssetCardProps {
  asset: File;
  disabled?: boolean;
  onCopyLink: (asset: File) => void;
  onRemove: (asset: File) => void;
}

/**
 * An asset a multiple-value field holds.
 */
export const AssetCard = ({ asset, disabled = false, onCopyLink, onRemove }: AssetCardProps) => {
  const { formatMessage } = useIntl();

  return (
    <CardFrame
      tone="neutral"
      preview={<AssetPreview asset={asset} size="L" />}
      name={<Name textColor="neutral800">{asset.name}</Name>}
      actions={
        <Menu.Root modal={false}>
          <Menu.Trigger
            tag={IconButton}
            icon={<More />}
            variant="ghost"
            label={formatMessage(
              {
                id: getTranslationKey('content-manager.input.actions.more'),
                defaultMessage: 'More actions for {name}',
              },
              { name: asset.name }
            )}
          />
          <Menu.Content popoverPlacement="bottom-end">
            <Menu.Item startIcon={<Link />} onSelect={() => onCopyLink(asset)}>
              {formatMessage({
                id: getTranslationKey('asset-details.copy-link.trigger'),
                defaultMessage: 'Copy link',
              })}
            </Menu.Item>
            <Menu.Item
              variant="danger"
              startIcon={<Trash />}
              disabled={disabled}
              onSelect={() => onRemove(asset)}
            >
              {formatMessage({
                id: getTranslationKey('content-manager.input.actions.remove-failed'),
                defaultMessage: 'Remove',
              })}
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
      }
    />
  );
};

interface UploadCardProps {
  upload: FieldUpload;
  disabled?: boolean;
  onCancel: (upload: FieldUpload) => void;
  onRetry: (upload: FieldUpload) => void;
  onRemove: (upload: FieldUpload) => void;
}

/**
 * A file a multiple-value field is uploading, or failed to upload.
 */
export const UploadCard = ({
  upload,
  disabled = false,
  onCancel,
  onRetry,
  onRemove,
}: UploadCardProps) => {
  const { formatMessage } = useIntl();
  const preview = <UploadPreview file={upload.sourceFile} size="L" />;

  if (upload.status === 'failed') {
    const canRetry = upload.isInStore || upload.sourceFile !== undefined;

    return (
      <CardFrame
        tone="danger"
        preview={preview}
        name={<Name textColor="danger600">{upload.name}</Name>}
        actions={
          <>
            {canRetry && (
              <IconButton
                variant="ghost"
                disabled={disabled}
                onClick={() => onRetry(upload)}
                label={formatMessage(
                  {
                    id: getTranslationKey('content-manager.input.actions.retry'),
                    defaultMessage: 'Retry uploading {name}',
                  },
                  { name: upload.name }
                )}
              >
                <ArrowClockwise />
              </IconButton>
            )}
            <DangerIconButton
              disabled={disabled}
              onClick={() => onRemove(upload)}
              label={formatMessage(
                {
                  id: getTranslationKey('content-manager.input.actions.remove'),
                  defaultMessage: 'Remove {name}',
                },
                { name: upload.name }
              )}
            >
              <Trash />
            </DangerIconButton>
          </>
        }
      />
    );
  }

  const uploadingLabel = formatMessage({
    id: getTranslationKey('content-manager.input.status.uploading'),
    defaultMessage: 'Uploading',
  });

  return (
    <CardFrame
      tone="primary"
      preview={preview}
      overlay={
        <>
          <Box position="absolute" top={2} left={2}>
            <Badge backgroundColor="primary100" textColor="primary600">
              {uploadingLabel}
            </Badge>
          </Box>
          <PreviewOverlay>
            <UploadProgressBar progress={upload.progress} label={uploadingLabel} />
          </PreviewOverlay>
        </>
      }
      name={<Name textColor="neutral800">{upload.name}</Name>}
      actions={
        <IconButton
          variant="ghost"
          onClick={() => onCancel(upload)}
          label={formatMessage(
            {
              id: getTranslationKey('content-manager.input.actions.cancel'),
              defaultMessage: 'Cancel upload of {name}',
            },
            { name: upload.name }
          )}
        >
          <Cross />
        </IconButton>
      }
    />
  );
};
