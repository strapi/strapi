import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ASSET_TYPES } from '../../enums';
import { prefixFileUrlWithBackendUrl } from '../../utils/files';
import { getAssetIcon } from '../../utils/getAssetIcon';
import { getTranslationKey } from '../../utils/translations';

import type { File } from '../../../../shared/contracts/files';

const Row = styled(Flex)`
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const Thumbnail = styled(Flex)`
  width: 3.2rem;
  height: 3.2rem;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.neutral500};
  background: ${({ theme }) => theme.colors.neutral100};
`;

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Name = styled(Typography)`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface AssetThumbnailProps {
  asset: File;
}

const AssetThumbnail = ({ asset }: AssetThumbnailProps) => {
  const { alternativeText, ext, formats, mime, url, updatedAt, isLocal, isUrlSigned } = asset;

  if (mime?.includes(ASSET_TYPES.Image)) {
    // Same two rules the grid preview applies: a `updatedAt` cache-buster so a
    // replaced asset stops serving its old thumbnail, skipped on signed URLs
    // because an extra param invalidates the signature (#26581).
    const rawUrl =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);
    const cacheKey = updatedAt && !isUrlSigned ? new Date(updatedAt).getTime() : undefined;
    const src =
      rawUrl && cacheKey !== undefined
        ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}v=${cacheKey}`
        : rawUrl;

    if (src) {
      return (
        <Thumbnail>
          <ThumbnailImage
            src={src}
            alt={alternativeText || ''}
            crossOrigin={!isLocal && isUrlSigned ? 'anonymous' : undefined}
            draggable={false}
          />
        </Thumbnail>
      );
    }
  }

  const DocIcon = getAssetIcon(mime, ext);

  return (
    <Thumbnail justifyContent="center" alignItems="center">
      <DocIcon width={20} height={20} />
    </Thumbnail>
  );
};

interface AssetRowProps {
  asset: File;
  disabled?: boolean;
  onRemove: (asset: File) => void;
}

/**
 * One asset already held by the field. The uploading and failed variants the
 * design also specifies are not here yet — while an upload runs, the global
 * progress dialog is what reports it.
 */
export const AssetRow = ({ asset, disabled = false, onRemove }: AssetRowProps) => {
  const { formatMessage } = useIntl();

  return (
    <Row
      alignItems="center"
      justifyContent="space-between"
      gap={3}
      paddingLeft={3}
      paddingRight={3}
      paddingTop={2}
      paddingBottom={2}
    >
      <Flex alignItems="center" gap={3} minWidth={0}>
        <AssetThumbnail asset={asset} />
        <Name textColor="neutral800">{asset.name}</Name>
      </Flex>
      <Box tag="span" shrink={0}>
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
      </Box>
    </Row>
  );
};
