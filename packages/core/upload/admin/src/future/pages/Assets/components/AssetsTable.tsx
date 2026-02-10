import { useIsMobile } from '@strapi/admin/strapi-admin';
import {
  Flex,
  IconButton,
  RawTable,
  RawTbody,
  RawTd,
  RawTh,
  RawThead,
  RawTr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { formatBytes } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';
import { TABLE_HEADERS } from '../constants';

import type { File } from '../../../../../../shared/contracts/files';

const StyledTable = styled(RawTable)`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 4px;
  overflow: hidden;
`;

const StyledThead = styled(RawThead)`
  background: ${({ theme }) => theme.colors.neutral100};

  tr {
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
`;

const StyledTh = styled(RawTh)`
  height: 40px;
  padding: 0 ${({ theme }) => theme.spaces[4]};
  text-align: left;
`;

const StyledTd = styled(RawTd)`
  padding: 0 ${({ theme }) => theme.spaces[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledTr = styled(RawTr)`
  height: 48px;
  background: ${({ theme }) => theme.colors.neutral0};

  &:last-child {
    ${StyledTd} {
      border-bottom: 0;
    }
  }
`;

const StyledBodyTd = styled(RawTd)`
  padding: ${({ theme }) => theme.spaces[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

interface AssetPreviewCellProps {
  asset: File;
}

const AssetPreviewCell = ({ asset }: AssetPreviewCellProps) => {
  const { ext, mime } = asset;

  const DocIcon = getAssetIcon(mime, ext);

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

interface AssetRowProps {
  asset: File;
}

const AssetRow = ({ asset }: AssetRowProps) => {
  const isMobile = useIsMobile();
  const { formatDate, formatMessage } = useIntl();

  return (
    <StyledTr>
      <StyledTd>
        <Flex gap={3} alignItems="center">
          <AssetPreviewCell asset={asset} />
          <Flex direction="column" alignItems="flex-start">
            <Typography textColor="neutral800" fontWeight="semiBold" ellipsis>
              {asset.name}
            </Typography>
            {isMobile && (
              <Typography textColor="neutral600" variant="pi">
                {asset.size ? formatBytes(asset.size, 1) : '-'}
              </Typography>
            )}
          </Flex>
        </Flex>
      </StyledTd>
      {!isMobile && (
        <>
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
        </>
      )}
      <StyledTd>
        <Flex justifyContent="flex-end">
          <IconButton
            label={formatMessage({
              id: getTranslationKey('control-card.more-actions'),
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

interface AssetsTableProps {
  assets: File[];
}

export const AssetsTable = ({ assets }: AssetsTableProps) => {
  const isMobile = useIsMobile();
  const { formatMessage } = useIntl();

  const visibleHeaders = isMobile
    ? TABLE_HEADERS.filter((h) => h.name === 'name' || h.name === 'actions')
    : TABLE_HEADERS;

  return (
    <StyledTable colCount={visibleHeaders.length} rowCount={assets.length + 1}>
      <StyledThead>
        <RawTr>
          {visibleHeaders.map((header) => {
            const tableHeaderLabel = formatMessage(header.label);
            const isVisuallyHidden = 'isVisuallyHidden' in header && header.isVisuallyHidden;

            if (isVisuallyHidden) {
              return (
                <StyledTh key={header.name}>
                  <VisuallyHidden>
                    {formatMessage({
                      id: getTranslationKey('table.header.actions'),
                      defaultMessage: 'actions',
                    })}
                  </VisuallyHidden>
                </StyledTh>
              );
            }

            return (
              <StyledTh key={header.name}>
                <Typography textColor="neutral600" variant="sigma">
                  {tableHeaderLabel}
                </Typography>
              </StyledTh>
            );
          })}
        </RawTr>
      </StyledThead>
      <RawTbody>
        {assets.length === 0 ? (
          <RawTr>
            <StyledBodyTd colSpan={visibleHeaders.length}>
              <Typography textColor="neutral600">
                {formatMessage({
                  id: 'app.components.EmptyStateLayout.content-document',
                  defaultMessage: 'No content found',
                })}
              </Typography>
            </StyledBodyTd>
          </RawTr>
        ) : (
          assets.map((asset) => <AssetRow key={asset.id} asset={asset} />)
        )}
      </RawTbody>
    </StyledTable>
  );
};
