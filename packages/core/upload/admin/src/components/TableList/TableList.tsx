// TODO: find a better naming convention for the file that was an index file before
import {
  Checkbox,
  IconButton,
  Table,
  Th,
  Thead,
  Tooltip,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { CaretDown, CaretUp } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { tableHeaders } from '../../constants';
import { getTrad } from '../../utils';

import { TableRows } from './TableRows';

import type { File } from '../../../../shared/contracts/files';
import type { Folder } from '../../../../shared/contracts/folders';
import type { AllowedTypes } from '../AssetCard/AssetCard';

export interface FileRow extends File {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
}

export interface FolderRow extends Folder {
  folderURL?: string;
  isSelectable?: boolean;
  type?: string;
}

export interface TableListProps {
  isFolderSelectionAllowed?: boolean;
  allowedTypes?: AllowedTypes[];
  assetCount?: number;
  folderCount?: number;
  indeterminate?: boolean;
  onChangeSort?: ((sortQuery: string) => void) | null;
  onChangeFolder?: ((folderId: number, folderPath?: string) => void) | null;
  onEditAsset?: ((asset: FileRow) => void) | null;
  onEditFolder?: ((folder: FolderRow) => void) | null;
  onSelectAll: (checked: boolean | string, rows?: FolderRow[] | FileRow[]) => void;
  onSelectOne: (element: FileRow | FolderRow) => void;
  rows?: FileRow[] | FolderRow[];
  selected?: FileRow[] | FolderRow[];
  shouldDisableBulkSelect?: boolean;
  sortQuery?: string;
}

export const TableList = ({
  assetCount = 0,
  folderCount = 0,
  indeterminate = false,
  onChangeSort = null,
  onChangeFolder = null,
  onEditAsset = null,
  onEditFolder = null,
  onSelectAll,
  onSelectOne,
  rows = [],
  selected = [],
  shouldDisableBulkSelect = false,
  sortQuery = '',
}: TableListProps) => {
  const { formatMessage } = useIntl();
  const [sortBy, sortOrder] = sortQuery.split(':');

  const handleClickSort = (isSorted: boolean, name: string) => {
    const nextSortOrder = isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    const nextSort = `${name}:${nextSortOrder}`;

    onChangeSort && onChangeSort(nextSort);
  };

  return (
    <Table colCount={tableHeaders.length + 2} rowCount={assetCount + folderCount + 1}>
      <Thead>
        <Tr>
          <Th>
            <Checkbox
              aria-label={formatMessage({
                id: getTrad('bulk.select.label'),
                defaultMessage: 'Select all folders & assets',
              })}
              disabled={shouldDisableBulkSelect}
              onCheckedChange={(checked) => onSelectAll(checked, rows)}
              checked={
                indeterminate && !shouldDisableBulkSelect
                  ? 'indeterminate'
                  : (assetCount > 0 || folderCount > 0) &&
                    selected.length === assetCount + folderCount
              }
            />
          </Th>
          {tableHeaders.map(({ metadatas: { label, isSortable }, name, key }) => {
            const isSorted = sortBy === name;
            const isUp = sortOrder === 'ASC';
            const tableHeaderLabel = formatMessage(label);
            const sortLabel = formatMessage(
              { id: 'list.table.header.sort', defaultMessage: 'Sort on {label}' },
              { label: tableHeaderLabel }
            );

            return (
              <Th
                action={
                  isSorted && (
                    <IconButton
                      label={sortLabel}
                      onClick={() => handleClickSort(isSorted, name)}
                      variant="ghost"
                    >
                      {isUp ? <CaretUp /> : <CaretDown />}
                    </IconButton>
                  )
                }
                key={key}
              >
                <Tooltip label={isSortable ? sortLabel : tableHeaderLabel}>
                  {isSortable ? (
                    <Typography
                      onClick={() => handleClickSort(isSorted, name)}
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
              </Th>
            );
          })}
          <Th>
            <VisuallyHidden>
              {formatMessage({
                id: getTrad('list.table.header.actions'),
                defaultMessage: 'actions',
              })}
            </VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <TableRows
        onChangeFolder={onChangeFolder}
        onEditAsset={onEditAsset!}
        onEditFolder={onEditFolder!}
        rows={rows}
        onSelectOne={onSelectOne}
        selected={selected}
      />
    </Table>
  );
};
