import { Avatar, Box, Flex } from '@strapi/design-system';
import {
  File as FileIcon,
  FileCsv,
  FilePdf,
  FileXls,
  FileZip,
  Folder,
  VolumeUp,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetType } from '../../constants';
import {
  createAssetUrl,
  getFileExtension,
  getTrad,
  prefixFileUrlWithBackendUrl,
} from '../../utils';
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
  const { formatMessage } = useIntl();
  if (type === 'folder') {
    return (
      <Flex
        justifyContent="center"
        background="secondary100"
        width="3.2rem"
        height="3.2rem"
        borderRadius="50%"
      >
        <Folder
          aria-label={formatMessage({
            id: getTrad('header.actions.add-assets.folder'),
            defaultMessage: 'folder',
          })}
          fill="secondary500"
          width="1.6rem"
          height="1.6rem"
        />
      </Flex>
    );
  }

  const { alternativeText, ext, formats, mime, name, url } = content;

  const fileExtension = getFileExtension(ext);

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

  if (mime?.includes(AssetType.Audio)) {
    return (
      <Flex
        background="neutral100"
        borderRadius="100%"
        color="neutral500"
        width="3.2rem"
        height="3.2rem"
        justifyContent="center"
      >
        <VolumeUp width={16} height={16} />
      </Flex>
    );
  }

  let DocIcon;

  switch (fileExtension) {
    case 'pdf':
      DocIcon = FilePdf;
      break;
    case 'csv':
      DocIcon = FileCsv;
      break;
    case 'xls':
      DocIcon = FileXls;
      break;
    case 'zip':
      DocIcon = FileZip;
      break;
    default:
      DocIcon = FileIcon;
      break;
  }

  return (
    <Flex
      justifyContent="center"
      borderRadius="100%"
      background="neutral100"
      color="neutral500"
      width="3.2rem"
      height="3.2rem"
    >
      <DocIcon width={16} height={16} />
    </Flex>
  );
};
