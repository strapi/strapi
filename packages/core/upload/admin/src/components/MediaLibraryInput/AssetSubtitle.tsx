import { Fragment } from 'react';

import { Typography } from '@strapi/design-system';
import { styled } from 'styled-components';

import { getAssetSubtitleParts } from '../../utils/files';

import type { File } from '../../../../shared/contracts/files';

const Line = styled(Typography)`
  display: block;
  min-width: 0;
`;

// Each part stays whole: the line wraps between parts, so a narrow card moves
// the size to a second line instead of cutting it off. Only a part too long
// for the card on its own (an unusual extension) is truncated.
const Part = styled.span`
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
`;

interface AssetSubtitleProps {
  asset: Pick<File, 'ext' | 'width' | 'height' | 'size'>;
}

/**
 * The file type, dimensions and size shown under an asset's name in a media
 * field (e.g. "PNG - 2500×3209 - 2.3MB"). Renders nothing when none is known.
 */
export const AssetSubtitle = ({ asset }: AssetSubtitleProps) => {
  const parts = getAssetSubtitleParts(asset);

  if (parts.length === 0) {
    return null;
  }

  return (
    <Line variant="pi" textColor="neutral600">
      {parts.map((part, index) => (
        <Fragment key={part}>
          {index > 0 && ' '}
          <Part>{index < parts.length - 1 ? `${part} -` : part}</Part>
        </Fragment>
      ))}
    </Line>
  );
};
