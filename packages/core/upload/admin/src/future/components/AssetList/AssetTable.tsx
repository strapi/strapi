import {
  Flex,
  IconButton,
  RawTable,
  RawTbody,
  RawTd,
  RawTh,
  RawThead,
  RawTr,
  Tooltip,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { CaretDown, CaretUp } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../../../utils';

const StyledTable = styled(RawTable)`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 4px 4px 0 0;
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
  padding: ${({ theme }) => theme.spaces[4]};
`;

import { AssetTableRow } from './AssetTableRow';
import { TABLE_HEADERS } from './constants';

import type { File } from '../../../../../shared/contracts/files';

interface AssetTableProps {
  assets: File[];
  isLoading?: boolean;
  sort?: string;
  onSortChange?: (sort: string) => void;
  onAssetClick?: (asset: File) => void;
}

export const AssetTable = ({
  assets,
  isLoading = false,
  sort,
  onSortChange,
  onAssetClick,
}: AssetTableProps) => {
  const { formatMessage } = useIntl();

  const [sortField, sortOrder] = sort?.split(':') ?? [];

  const handleSort = (fieldName: string) => {
    if (!onSortChange) {
      return;
    }

    const newOrder = sortField === fieldName && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    onSortChange(`${fieldName}:${newOrder}`);
  };

  return (
    <StyledTable colCount={TABLE_HEADERS.length} rowCount={assets.length + 1}>
      <StyledThead>
        <RawTr>
          {TABLE_HEADERS.map((header) => {
            const isSorted = sortField === header.name;
            const tableHeaderLabel = formatMessage(header.label);
            const sortLabel = formatMessage(
              { id: 'list.table.header.sort', defaultMessage: 'Sort on {label}' },
              { label: tableHeaderLabel }
            );
            const isVisuallyHidden = 'isVisuallyHidden' in header && header.isVisuallyHidden;

            if (isVisuallyHidden) {
              return (
                <StyledTh key={header.name}>
                  <VisuallyHidden>
                    {formatMessage({
                      id: getTrad('list.table.header.actions'),
                      defaultMessage: 'actions',
                    })}
                  </VisuallyHidden>
                </StyledTh>
              );
            }

            return (
              <StyledTh key={header.name}>
                <Flex gap={1} alignItems="center">
                  <Tooltip label={header.isSortable ? sortLabel : tableHeaderLabel}>
                    {header.isSortable ? (
                      <Typography
                        onClick={() => handleSort(header.name)}
                        tag={isSorted ? 'span' : 'button'}
                        textColor="neutral600"
                        variant="sigma"
                      >
                        {tableHeaderLabel}
                      </Typography>
                    ) : (
                      <Typography textColor="neutral600" variant="sigma">
                        {tableHeaderLabel}
                      </Typography>
                    )}
                  </Tooltip>
                  {isSorted && (
                    <IconButton
                      label={sortLabel}
                      onClick={() => handleSort(header.name)}
                      variant="ghost"
                    >
                      {sortOrder === 'ASC' ? <CaretUp /> : <CaretDown />}
                    </IconButton>
                  )}
                </Flex>
              </StyledTh>
            );
          })}
        </RawTr>
      </StyledThead>
      <RawTbody>
        {isLoading ? (
          <RawTr>
            <StyledTd colSpan={TABLE_HEADERS.length}>
              <Typography textColor="neutral600">
                {formatMessage({ id: 'app.loading', defaultMessage: 'Loading...' })}
              </Typography>
            </StyledTd>
          </RawTr>
        ) : assets.length === 0 ? (
          <RawTr>
            <StyledTd colSpan={TABLE_HEADERS.length}>
              <Typography textColor="neutral600">
                {formatMessage({
                  id: 'app.components.EmptyStateLayout.content-document',
                  defaultMessage: 'No content found',
                })}
              </Typography>
            </StyledTd>
          </RawTr>
        ) : (
          assets.map((asset) => (
            <AssetTableRow key={asset.id} asset={asset} onClick={onAssetClick} />
          ))
        )}
      </RawTbody>
    </StyledTable>
  );
};
