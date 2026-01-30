import {
  Box,
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
import {
  CaretDown,
  CaretUp,
  File as FileIcon,
  FileCsv,
  FilePdf,
  FileXls,
  FileZip,
  Monitor,
  More,
  VolumeUp,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { AssetType } from '../../../../enums';
import { formatBytes, getFileExtension, prefixFileUrlWithBackendUrl } from '../../../../utils';
import { getTranslationKey } from '../../../utils/translations';
import { TABLE_HEADERS, type SortOrder, type SortState } from '../constants';

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

const StyledTr = styled(RawTr)<{ $clickable?: boolean }>`
  height: 48px;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  background: ${({ theme }) => theme.colors.neutral0};
`;

const StyledTd = styled(RawTd)`
  padding: 0 ${({ theme }) => theme.spaces[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledBodyTd = styled(RawTd)`
  padding: ${({ theme }) => theme.spaces[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

interface AssetPreviewCellProps {
  asset: File;
}

const AssetPreviewCell = ({ asset }: AssetPreviewCellProps) => {
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

interface AssetRowProps {
  asset: File;
  onClick?: (asset: File) => void;
}

const AssetRow = ({ asset, onClick }: AssetRowProps) => {
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

interface AssetsListProps {
  assets: File[];
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  onAssetClick?: (asset: File) => void;
}

export const AssetsList = ({ assets, sort, onSortChange, onAssetClick }: AssetsListProps) => {
  const { formatMessage } = useIntl();

  const handleSort = (fieldName: string) => {
    if (!onSortChange || !sort) {
      return;
    }

    const newOrder: SortOrder = sort.field === fieldName && sort.order === 'ASC' ? 'DESC' : 'ASC';
    onSortChange({ field: fieldName, order: newOrder });
  };

  return (
    <StyledTable colCount={TABLE_HEADERS.length} rowCount={assets.length + 1}>
      <StyledThead>
        <RawTr>
          {TABLE_HEADERS.map((header) => {
            const isSorted = sort?.field === header.name;
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
                      id: getTranslationKey('list.table.header.actions'),
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
                      {sort?.order === 'ASC' ? <CaretUp /> : <CaretDown />}
                    </IconButton>
                  )}
                </Flex>
              </StyledTh>
            );
          })}
        </RawTr>
      </StyledThead>
      <RawTbody>
        {assets.length === 0 ? (
          <RawTr>
            <StyledBodyTd colSpan={TABLE_HEADERS.length}>
              <Typography textColor="neutral600">
                {formatMessage({
                  id: 'app.components.EmptyStateLayout.content-document',
                  defaultMessage: 'No content found',
                })}
              </Typography>
            </StyledBodyTd>
          </RawTr>
        ) : (
          assets.map((asset) => <AssetRow key={asset.id} asset={asset} onClick={onAssetClick} />)
        )}
      </RawTbody>
    </StyledTable>
  );
};
