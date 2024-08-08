import { Avatar, Box, Flex } from '@strapi/design-system';
import { Folder } from '@strapi/icons';
import { styled } from 'styled-components';

// TODO: replace this import with the one from constants when the file is migrated to typescript
import { AssetType } from '../../newConstants';
// TODO: replace this import with the one from utils when the index file is migrated to typescript
import { createAssetUrl } from '../../utils/createAssetUrl';
// TODO: replace this import with the one from utils when the index file is migrated to typescript
import { getFileExtension } from '../../utils/getFileExtension';
// TODO: replace this import with the one from utils when the index file is migrated to typescript
import { prefixFileUrlWithBackendUrl } from '../../utils/prefixFileUrlWithBackendUrl';
import { VideoPreview } from '../AssetCard/VideoPreview';
import type { Asset } from '../../../../shared/contracts/files';

interface AssetProps extends Asset {
  type?: string;
  isSelectable?: boolean;
  isLocal?: boolean;
}

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
  type: string;
  content: AssetProps;
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
    const mediaURL = formats?.thumbnail?.url
      ? prefixFileUrlWithBackendUrl(formats.thumbnail.url)
      : prefixFileUrlWithBackendUrl(url);

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
          url={createAssetUrl(content, true)}
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
