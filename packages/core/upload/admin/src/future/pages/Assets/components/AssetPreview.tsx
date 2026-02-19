import * as React from 'react';

import { Box, Flex, Loader } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetType } from '../../../enums';
import { prefixFileUrlWithBackendUrl } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';

import type { File } from '../../../../../../shared/contracts/files';

/* -------------------------------------------------------------------------------------------------
 * Styled components
 * -----------------------------------------------------------------------------------------------*/

const PreviewContainer = styled(Box)`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 200px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: repeating-conic-gradient(
      ${({ theme }) => theme.colors.neutral100} 0% 25%,
      transparent 0% 50%
    )
    50% / 20px 20px;
`;

const AssetContainer = styled(Flex)`
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
`;

const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const StyledAudio = styled.audio`
  width: 100%;
  max-width: 100%;
`;

const StyledPdfIframe = styled.iframe`
  width: 100%;
  height: 100%;
  min-height: 200px;
  border: none;
`;

const IconFallback = styled(Flex)`
  width: 100%;
  height: 100%;
  color: ${({ theme }) => theme.colors.neutral500};
  background: ${({ theme }) => theme.colors.neutral100};
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

interface AssetPreviewContentProps {
  asset: File;
}

export const AssetPreviewContent = ({ asset }: AssetPreviewContentProps) => {
  const { formatMessage } = useIntl();
  const { alternativeText, ext, mime, url } = asset;
  const mediaUrl = prefixFileUrlWithBackendUrl(url);

  const [isMediaLoaded, setIsMediaLoaded] = React.useState(false);
  React.useEffect(() => {
    setIsMediaLoaded(false);
  }, [mediaUrl]);

  if (mime?.includes(AssetType.Image)) {
    const imageUrl = prefixFileUrlWithBackendUrl(url);

    if (imageUrl) {
      return (
        <PreviewContainer>
          {!isMediaLoaded && <AssetLoader />}
          <AssetContainer>
            <StyledImage
              src={imageUrl}
              alt={alternativeText || asset.name || ''}
              onError={() => setIsMediaLoaded(true)}
            />
          </AssetContainer>
        </PreviewContainer>
      );
    }
  }

  if (mime?.includes(AssetType.Video) && mediaUrl) {
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

  if (mime?.includes(AssetType.Audio) && mediaUrl) {
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
      <IconFallback justifyContent="center" alignItems="center">
        <DocIcon width={48} height={48} />
      </IconFallback>
    </PreviewContainer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetPreview
 * -----------------------------------------------------------------------------------------------*/

interface AssetPreviewProps {
  asset: File | undefined;
  error: unknown;
}

export const AssetPreview = ({ asset, error }: AssetPreviewProps) => {
  if (error || !asset) {
    return null;
  }

  return <AssetPreviewContent asset={asset} />;
};
