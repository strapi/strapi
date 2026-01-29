import { Box, Flex } from '@strapi/design-system';
import {
  File as FileIcon,
  FileCsv,
  FilePdf,
  FileXls,
  FileZip,
  Monitor,
  VolumeUp,
} from '@strapi/icons';

import { AssetType } from '../../../enums';
import { getFileExtension, prefixFileUrlWithBackendUrl } from '../../../utils';

import type { File } from '../../../../../shared/contracts/files';

interface AssetPreviewCellProps {
  asset: File;
}

export const AssetPreviewCell = ({ asset }: AssetPreviewCellProps) => {
  const { alternativeText, ext, formats, mime, url } = asset;

  const fileExtension = getFileExtension(ext);

  if (mime?.includes(AssetType.Image)) {
    const mediaURL =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);

    return (
      <Box width="3.2rem" height="3.2rem" borderRadius="4px" overflow="hidden" shrink={0}>
        <img
          src={mediaURL ?? undefined}
          alt={alternativeText || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
    );
  }

  if (mime?.includes(AssetType.Video) || mime?.includes(AssetType.Audio)) {
    const Icon = mime?.includes(AssetType.Video) ? Monitor : VolumeUp;
    return (
      <Flex
        borderRadius="4px"
        color="neutral500"
        width="3.2rem"
        height="3.2rem"
        justifyContent="center"
        alignItems="center"
        shrink={0}
      >
        <Icon width={16} height={16} />
      </Flex>
    );
  }

  type IconComponent = typeof FileIcon;
  const DOC_ICON_MAP: Record<string, IconComponent> = {
    pdf: FilePdf,
    csv: FileCsv,
    xls: FileXls,
    zip: FileZip,
  };

  const DocIcon = fileExtension ? DOC_ICON_MAP[fileExtension] || FileIcon : FileIcon;

  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      borderRadius="4px"
      color="neutral500"
      width="3.2rem"
      height="3.2rem"
      shrink={0}
    >
      <DocIcon width={16} height={16} />
    </Flex>
  );
};
