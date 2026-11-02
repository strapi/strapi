import { Box, CardAsset, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

import { AssetCardBase, AssetCardBaseProps } from './AssetCardBase';
import { AudioPreview } from './AudioPreview';

const AudioPreviewWrapper = styled(Box)`
  canvas,
  audio {
    display: block;
    max-width: 100%;
    max-height: ${({ size }) => (size === 'M' ? 16.4 : 8.8)}rem;
  }
`;

interface AudioAssetCardProps extends Omit<AssetCardBaseProps, 'variant' | 'children'> {
  size?: 'S' | 'M';
  url: string;
}

export const AudioAssetCard = ({
  name,
  url,
  size = 'M',
  selected = false,
  ...restProps
}: AudioAssetCardProps) => {
  return (
    <AssetCardBase name={name} selected={selected} {...restProps} variant="Audio">
      <CardAsset size={size}>
        <Flex alignItems="center">
          <AudioPreviewWrapper size={size}>
            <AudioPreview url={url} alt={name} />
          </AudioPreviewWrapper>
        </Flex>
      </CardAsset>
    </AssetCardBase>
  );
};
