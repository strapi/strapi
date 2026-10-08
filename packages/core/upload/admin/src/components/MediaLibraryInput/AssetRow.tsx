import { Box, Button, Flex, IconButton, Typography } from '@strapi/design-system';
import { ArrowClockwise, Cross, Link, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../utils/translations';

import { AssetPreview, UploadPreview } from './AssetPreview';
import { UploadProgressBar } from './UploadProgressBar';

import type { FieldUpload } from './useFieldUploads';
import type { File } from '../../../../shared/contracts/files';

type RowTone = 'neutral' | 'primary' | 'danger';

const ROW_COLORS = {
  neutral: { background: 'neutral100', border: 'neutral200' },
  primary: { background: 'primary100', border: 'primary200' },
  danger: { background: 'danger100', border: 'danger200' },
} as const;

const Row = styled(Flex)<{ $tone: RowTone }>`
  min-height: 7.2rem;
  background: ${({ theme, $tone }) => theme.colors[ROW_COLORS[$tone].background]};
  border: 1px solid ${({ theme, $tone }) => theme.colors[ROW_COLORS[$tone].border]};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const Name = styled(Typography)`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface RowFrameProps {
  tone: RowTone;
  children: React.ReactNode;
}

const RowFrame = ({ tone, children }: RowFrameProps) => (
  <Row $tone={tone} alignItems="center" gap={4} padding={4}>
    {children}
  </Row>
);

interface AssetRowProps {
  asset: File;
  disabled?: boolean;
  onCopyLink: (asset: File) => void;
  onRemove: (asset: File) => void;
}

/**
 * The asset a single-value field holds.
 */
export const AssetRow = ({ asset, disabled = false, onCopyLink, onRemove }: AssetRowProps) => {
  const { formatMessage } = useIntl();

  return (
    <RowFrame tone="neutral">
      <AssetPreview asset={asset} size="S" />
      <Name textColor="neutral800" flex={1}>
        {asset.name}
      </Name>
      <Flex gap={2} shrink={0}>
        <IconButton
          variant="ghost"
          onClick={() => onCopyLink(asset)}
          label={formatMessage({
            id: getTranslationKey('list.assets.actions.copy-link'),
            defaultMessage: 'Copy link to media',
          })}
        >
          <Link />
        </IconButton>
        <IconButton
          variant="ghost"
          disabled={disabled}
          onClick={() => onRemove(asset)}
          label={formatMessage(
            {
              id: getTranslationKey('content-manager.input.actions.remove'),
              defaultMessage: 'Remove {name}',
            },
            { name: asset.name }
          )}
        >
          <Trash />
        </IconButton>
      </Flex>
    </RowFrame>
  );
};

interface UploadRowProps {
  upload: FieldUpload;
  disabled?: boolean;
  onCancel: (upload: FieldUpload) => void;
  onRetry: (upload: FieldUpload) => void;
  onRemove: (upload: FieldUpload) => void;
}

/**
 * A file a single-value field is uploading, or failed to upload.
 */
export const UploadRow = ({
  upload,
  disabled = false,
  onCancel,
  onRetry,
  onRemove,
}: UploadRowProps) => {
  const { formatMessage } = useIntl();
  const canRetry = upload.isInStore || upload.sourceFile !== undefined;

  if (upload.status === 'failed') {
    return (
      <RowFrame tone="danger">
        <UploadPreview file={upload.sourceFile} size="S" />
        <Name textColor="danger600" flex={1}>
          {upload.name}
        </Name>
        <Flex gap={2} shrink={0}>
          {canRetry && (
            <Button
              variant="ghost"
              startIcon={<ArrowClockwise />}
              disabled={disabled}
              onClick={() => onRetry(upload)}
            >
              {formatMessage({
                id: getTranslationKey('upload.progress.retry'),
                defaultMessage: 'Retry',
              })}
            </Button>
          )}
          <Button
            variant="danger-light"
            startIcon={<Trash />}
            disabled={disabled}
            onClick={() => onRemove(upload)}
          >
            {formatMessage({
              id: getTranslationKey('content-manager.input.actions.remove-failed'),
              defaultMessage: 'Remove',
            })}
          </Button>
        </Flex>
      </RowFrame>
    );
  }

  const uploadingLabel = formatMessage({
    id: getTranslationKey('upload.progress.file.uploading'),
    defaultMessage: 'Uploading...',
  });

  return (
    <RowFrame tone="primary">
      <UploadPreview file={upload.sourceFile} size="S" />
      <Flex direction="column" alignItems="stretch" gap={2} flex={1} minWidth={0}>
        <Flex justifyContent="space-between" gap={4}>
          <Name textColor="neutral800">{upload.name}</Name>
          <Box shrink={0}>
            <Typography variant="pi" textColor="neutral600">
              {uploadingLabel}
            </Typography>
          </Box>
        </Flex>
        <UploadProgressBar progress={upload.progress} label={uploadingLabel} />
      </Flex>
      <Box shrink={0}>
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
      </Box>
    </RowFrame>
  );
};
