import * as React from 'react';

import { Box, Flex, Loader, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ASSET_TYPES } from '../../../../../enums';
import { prefixFileUrlWithBackendUrl } from '../../../../utils/files';
import { getAssetIcon } from '../../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../../utils/translations';

import type {
  File,
  AssetWithPopulatedCreatedBy,
} from '../../../../../../../shared/contracts/files';

/* -------------------------------------------------------------------------------------------------
 * Styled components
 * -----------------------------------------------------------------------------------------------*/

const PreviewContainer = styled(Box)`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 24rem;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spaces[3]};
  background: repeating-conic-gradient(
      ${({ theme }) => theme.colors.neutral100} 0% 25%,
      transparent 0% 50%
    )
    50% / 20px 20px;
`;

const AssetContainer = styled(Flex)`
  justify-content: center;
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
`;

const StyledImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

/**
 * Top-right overlay slot for image actions (crop). Sits above the
 * image (z-index 3 > AssetContainer 2) so the buttons stay clickable.
 */
const ActionsOverlay = styled(Flex)`
  position: absolute;
  top: ${({ theme }) => theme.spaces[3]};
  right: ${({ theme }) => theme.spaces[3]};
  z-index: 3;
`;

const StyledVideo = styled.video`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const StyledAudio = styled.audio`
  width: 100%;
`;

const StyledPdfIframe = styled.iframe`
  width: 100%;
  height: 100%;
  min-height: 200px;
  border: none;
`;

const IconFallback = styled(Flex)`
  height: 100%;
  aspect-ratio: 1;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.neutral500};
  background: ${({ theme }) => theme.colors.neutral150};
`;

const LoaderOverlay = styled(Flex)`
  position: absolute;
  inset: 0;
  z-index: 1;
`;

/* -------------------------------------------------------------------------------------------------
 * AssetLoader
 * -----------------------------------------------------------------------------------------------*/

const AssetLoader = () => {
  const { formatMessage } = useIntl();
  return (
    <LoaderOverlay justifyContent="center" alignItems="center">
      <Loader>{formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}</Loader>
    </LoaderOverlay>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetPreviewContent
 * -----------------------------------------------------------------------------------------------*/

interface AssetPreviewProps {
  asset: File | AssetWithPopulatedCreatedBy;
  actions?: React.ReactNode;
  isLoading?: boolean;
}

export const AssetPreview = ({ asset, actions, isLoading = false }: AssetPreviewProps) => {
  const { formatMessage } = useIntl();
  const { alternativeText, ext, mime, url, updatedAt, isUrlSigned, isLocal } = asset;
  // Append the asset's `updatedAt` as a cache-buster so a freshly replaced
  // file (often served at the same URL) shows the new content instead of the
  // browser-cached old version. Signed URLs are excluded: their query string
  // is part of the SigV4 signature, so appending a param invalidates the
  // signature and the request fails with 403. See #26581.
  const cacheKey = updatedAt && !isUrlSigned ? new Date(updatedAt).getTime() : undefined;
  const appendCacheBuster = (raw: string | undefined) => {
    if (!raw || cacheKey === undefined) return raw;
    return raw.includes('?') ? `${raw}&v=${cacheKey}` : `${raw}?v=${cacheKey}`;
  };
  const mediaUrl = appendCacheBuster(prefixFileUrlWithBackendUrl(url));

  const [isMediaLoaded, setIsMediaLoaded] = React.useState(false);
  React.useEffect(() => {
    setIsMediaLoaded(false);
  }, [mediaUrl]);

  const imageRef = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const recompute = () => {
      const parent = image.parentElement;
      if (!parent) return;
      const c = parent.getBoundingClientRect();
      // offsetWidth/Height = pre-transform layout box (transforms ignored).
      const w = image.offsetWidth;
      const h = image.offsetHeight;
      if (!w || !h || !c.width || !c.height) return;
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(image);
    if (image.parentElement) ro.observe(image.parentElement);
    return () => ro.disconnect();
  }, [isMediaLoaded]);

  if (mime?.includes(ASSET_TYPES.Image)) {
    const imageUrl = appendCacheBuster(prefixFileUrlWithBackendUrl(url));

    if (imageUrl) {
      return (
        <PreviewContainer>
          {(!isMediaLoaded || isLoading) && <AssetLoader />}
          {actions ? <ActionsOverlay>{actions}</ActionsOverlay> : null}
          <AssetContainer>
            <StyledImage
              ref={imageRef}
              src={imageUrl}
              alt={alternativeText || asset.name || ''}
              crossOrigin={isLocal ? undefined : 'anonymous'}
              onLoad={() => setIsMediaLoaded(true)}
              onError={() => setIsMediaLoaded(true)}
            />
          </AssetContainer>
        </PreviewContainer>
      );
    }
  }

  if (mime?.includes(ASSET_TYPES.Video) && mediaUrl) {
    return (
      <PreviewContainer>
        {!isMediaLoaded && <AssetLoader />}
        <AssetContainer>
          <StyledVideo
            src={mediaUrl}
            controls
            title={asset.name}
            onLoadedData={() => setIsMediaLoaded(true)}
            onError={() => setIsMediaLoaded(true)}
          >
            {formatMessage({
              id: getTranslationKey('asset-details.videoNotSupported'),
              defaultMessage: 'Your browser does not support the video tag.',
            })}
          </StyledVideo>
        </AssetContainer>
      </PreviewContainer>
    );
  }

  if (mime?.includes(ASSET_TYPES.Audio) && mediaUrl) {
    return (
      <PreviewContainer>
        {!isMediaLoaded && <AssetLoader />}
        <AssetContainer>
          <Flex
            width="100%"
            padding={4}
            justifyContent="center"
            alignItems="center"
            height="100%"
            minHeight="12rem"
          >
            <StyledAudio
              src={mediaUrl}
              controls
              onLoadedData={() => setIsMediaLoaded(true)}
              onError={() => setIsMediaLoaded(true)}
            />
          </Flex>
        </AssetContainer>
      </PreviewContainer>
    );
  }

  const isPdf =
    ext?.toLowerCase() === 'pdf' || ext?.toLowerCase() === '.pdf' || mime === 'application/pdf';
  if (isPdf && mediaUrl) {
    return (
      <PreviewContainer>
        {!isMediaLoaded && <AssetLoader />}
        <AssetContainer>
          <StyledPdfIframe
            src={`${mediaUrl}#toolbar=0`}
            title={asset.name}
            onLoad={() => setIsMediaLoaded(true)}
          />
        </AssetContainer>
      </PreviewContainer>
    );
  }

  const DocIcon = getAssetIcon(mime, ext);
  return (
    <PreviewContainer>
      <IconFallback
        justifyContent="center"
        alignItems="center"
        gap={1}
        direction="column"
        hasRadius
      >
        <DocIcon width={24} height={24} />
        <Typography variant="pi">
          {formatMessage({
            id: getTranslationKey('asset-details.noPreview'),
            defaultMessage: 'No preview available',
          })}
        </Typography>
      </IconFallback>
    </PreviewContainer>
  );
};
