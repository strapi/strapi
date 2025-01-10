import { Flex, Typography } from '@strapi/design-system';
import { File, FilePdf } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetCardBase, AssetCardBaseProps } from './AssetCardBase';

const CardAsset = styled(Flex)`
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.neutral0} 0%,
    ${({ theme }) => theme.colors.neutral100} 121.48%
  );
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
  const { formatMessage } = useIntl();
  return (
    <AssetCardBase
      name={name}
      extension={extension}
      selected={selected}
      {...restProps}
      variant="Doc"
    >
      <CardAsset width="100%" height={size === 'S' ? `8.8rem` : `16.4rem`} justifyContent="center">
        <Flex gap={2} direction="column" alignItems="center">
          {extension === 'pdf' ? (
            <FilePdf aria-label={name} fill="neutral500" width={24} height={24} />
          ) : (
            <File aria-label={name} fill="neutral500" width={24} height={24} />
          )}

          <Typography textColor="neutral500" variant="pi">
            {formatMessage({
              id: 'noPreview',
              defaultMessage: 'No preview available',
            })}
          </Typography>
        </Flex>
      </CardAsset>
    </AssetCardBase>
  );
};
