import { Flex } from '@strapi/design-system';
import { File, FilePdf } from '@strapi/icons';
import { styled } from 'styled-components';

import { AssetCardBase, AssetCardBaseProps } from './AssetCardBase';

const IconWrapper = styled.span`
  svg {
    font-size: 4.8rem;
  }
`;

const CardAsset = styled(Flex)`
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
`;

interface DocAssetCardProps extends Omit<AssetCardBaseProps, 'variant' | 'children'> {
  size?: 'S' | 'M';
  extension: string;
}

export const DocAssetCard = ({
  name,
  extension,
  size = 'M',
  selected = false,
  ...restProps
}: DocAssetCardProps) => {
  return (
    <AssetCardBase
      name={name}
      extension={extension}
      selected={selected}
      {...restProps}
      variant="Doc"
    >
      <CardAsset width="100%" height={size === 'S' ? `8.8rem` : `16.4rem`} justifyContent="center">
        <IconWrapper>
          {extension === 'pdf' ? <FilePdf aria-label={name} /> : <File aria-label={name} />}
        </IconWrapper>
      </CardAsset>
    </AssetCardBase>
  );
};
