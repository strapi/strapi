import { Avatar, Box, Flex } from '@strapi/design-system';
import { Folder } from '@strapi/icons';
import { styled } from 'styled-components';

// TODO: replace this import with the import from constants file when it will be migrated to TS
import { AssetType } from '../../newConstants';
import { createAssetUrl, getFileExtension, prefixFileUrlWithBackendUrl } from '../../utils';
import { VideoPreview } from '../AssetCard/VideoPreview';
import type { File } from '../../../../shared/contracts/files';

const VideoPreviewWrapper = styled(Box)`
  figure {
    width: ${({ theme }) => theme.spaces[7]};
    height: ${({ theme }) => theme.spaces[7]};
  }

  canvas,
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

interface PreviewCellProps {
  content: File;
  type?: string;
}

export const PreviewCell = ({ type, content }: PreviewCellProps) => {
  if (type === 'folder') {
    return (
      <Flex
        justifyContent="center"
        background="secondary100"
        width="3.2rem"
        height="3.2rem"
        borderRadius="50%"
      >
        <Folder fill="secondary500" width="1.6rem" height="1.6rem" />
      </Flex>
    );
  }

  const { alternativeText, ext, formats, mime, name, url } = content;

  if (mime?.includes(AssetType.Image)) {
    const mediaURL =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);

    return (
      <Avatar.Item
        src={mediaURL}
        alt={alternativeText || undefined}
        preview
        fallback={alternativeText}
      />
    );
  }

  if (mime?.includes(AssetType.Video)) {
    return (
      <VideoPreviewWrapper>
        <VideoPreview
          url={createAssetUrl(content, true) || ''}
          mime={mime}
          alt={alternativeText ?? name}
        />
      </VideoPreviewWrapper>
    );
  }

  return (
    <Box background="secondary100" color="secondary600" width="3.2rem" height="3.2rem">
      {getFileExtension(ext)}
    </Box>
  );
};
