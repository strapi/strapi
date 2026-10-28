import { useEffect, useState } from 'react';

import { Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

import { ASSET_TYPES } from '../../enums';
import { prefixFileUrlWithBackendUrl } from '../../utils/files';
import { getAssetIcon } from '../../utils/getAssetIcon';

import type { File } from '../../../../shared/contracts/files';

type PreviewSize = 'S' | 'L';

const Frame = styled(Flex)<{ $size: PreviewSize }>`
  flex-shrink: 0;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.neutral500};
  background: ${({ theme }) => theme.colors.neutral150};

  ${({ $size, theme }) =>
    $size === 'S'
      ? `
    width: 4rem;
    height: 4rem;
    border-radius: ${theme.borderRadius};
  `
      : `
    width: 100%;
    height: 16rem;
  `}
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

interface PreviewFrameProps {
  size: PreviewSize;
  src?: string;
  alt?: string;
  crossOrigin?: 'anonymous';
  mime?: string;
  ext?: string;
}

const PreviewFrame = ({ size, src, alt = '', crossOrigin, mime, ext }: PreviewFrameProps) => {
  if (src) {
    return (
      <Frame $size={size}>
        <PreviewImage src={src} alt={alt} crossOrigin={crossOrigin} draggable={false} />
      </Frame>
    );
  }

  const Icon = getAssetIcon(mime, ext);
  const iconSize = size === 'S' ? 20 : 32;

  return (
    <Frame $size={size} justifyContent="center" alignItems="center">
      <Icon width={iconSize} height={iconSize} />
    </Frame>
  );
};

interface AssetPreviewProps {
  asset: File;
  size: PreviewSize;
}

export const AssetPreview = ({ asset, size }: AssetPreviewProps) => {
  const { alternativeText, ext, formats, mime, url, updatedAt, isLocal, isUrlSigned } = asset;

  if (!mime?.includes(ASSET_TYPES.Image)) {
    return <PreviewFrame size={size} mime={mime} ext={ext} />;
  }

  // Same two rules the grid preview applies: a `updatedAt` cache-buster so a
  // replaced asset stops serving its old thumbnail, skipped on signed URLs
  // because an extra param invalidates the signature (#26581).
  // Cards are wider than a thumbnail, so they take the `small` format when there is one.
  const sizedFormats = formats as Record<string, { url?: string } | undefined> | undefined;
  const preferredUrl = size === 'S' ? formats?.thumbnail?.url : (sizedFormats?.small?.url ?? url);
  const rawUrl = prefixFileUrlWithBackendUrl(preferredUrl) ?? prefixFileUrlWithBackendUrl(url);
  const cacheKey = updatedAt && !isUrlSigned ? new Date(updatedAt).getTime() : undefined;
  const src =
    rawUrl && cacheKey !== undefined
      ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}v=${cacheKey}`
      : rawUrl;

  return (
    <PreviewFrame
      size={size}
      src={src}
      alt={alternativeText || ''}
      crossOrigin={!isLocal && isUrlSigned ? 'anonymous' : undefined}
      mime={mime}
      ext={ext}
    />
  );
};

interface UploadPreviewProps {
  file?: globalThis.File;
  size: PreviewSize;
}

/**
 * Previews a file that has not reached the server yet, straight from the
 * user's disk.
 */
export const UploadPreview = ({ file, size }: UploadPreviewProps) => {
  const isImage = file?.type.startsWith(ASSET_TYPES.Image) ?? false;
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    if (!file || !isImage) {
      setSrc(undefined);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  return <PreviewFrame size={size} src={src} mime={file?.type} />;
};
