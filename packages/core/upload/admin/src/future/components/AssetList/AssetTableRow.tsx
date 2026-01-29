import { Flex, IconButton, RawTd, RawTr, Typography } from '@strapi/design-system';
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { formatBytes, getTrad } from '../../../utils';

const StyledTr = styled(RawTr)<{ $clickable?: boolean }>`
  height: 48px;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  background: ${({ theme }) => theme.colors.neutral0};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledTd = styled(RawTd)`
  padding: 0 ${({ theme }) => theme.spaces[4]};
`;

import { AssetPreviewCell } from './AssetPreviewCell';

import type { File } from '../../../../../shared/contracts/files';

interface AssetTableRowProps {
  asset: File;
  onClick?: (asset: File) => void;
}

export const AssetTableRow = ({ asset, onClick }: AssetTableRowProps) => {
  const { formatDate, formatMessage } = useIntl();

  const handleRowClick = () => {
    if (!onClick) {
      return;
    }

    onClick(asset);
  };

  return (
    <StyledTr onClick={handleRowClick} $clickable={!!onClick}>
      <StyledTd>
        <Flex gap={3} alignItems="center">
          <AssetPreviewCell asset={asset} />
          <Typography textColor="neutral800" fontWeight="semiBold" ellipsis>
            {asset.name}
          </Typography>
        </Flex>
      </StyledTd>
      <StyledTd>
        <Typography textColor="neutral600">
          {asset.createdAt ? formatDate(new Date(asset.createdAt), { dateStyle: 'long' }) : '-'}
        </Typography>
      </StyledTd>
      <StyledTd>
        <Typography textColor="neutral600">
          {asset.updatedAt ? formatDate(new Date(asset.updatedAt), { dateStyle: 'long' }) : '-'}
        </Typography>
      </StyledTd>
      <StyledTd>
        <Typography textColor="neutral600">
          {asset.size ? formatBytes(asset.size, 1) : '-'}
        </Typography>
      </StyledTd>
      <StyledTd>
        <Flex justifyContent="flex-end">
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.more-actions'),
              defaultMessage: 'More actions',
            })}
            variant="ghost"
          >
            <More />
          </IconButton>
        </Flex>
      </StyledTd>
    </StyledTr>
  );
};
