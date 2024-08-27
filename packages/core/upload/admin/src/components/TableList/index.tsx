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
import type { Data } from '@strapi/types';

import type { AssetEnriched } from '../../../../shared/contracts/files';
import type { FolderEnriched } from '../../../../shared/contracts/folders';
// TODO: replace with the import from the constants file when it will be migrated to TypeScript
import { tableHeaders } from '../../newConstants';
import { getTrad } from '../../utils';

import { TableRows } from './TableRows';

export interface TableListProps {
  assetCount?: number;
  folderCount?: number;
  indeterminate?: boolean;
  onChangeSort?: (sort: string) => void;
  onChangeFolder?: (folderId: Data.ID, folderPath?: string) => void;
  onEditAsset?: (element: AssetEnriched) => void;
  onEditFolder?: (element: FolderEnriched) => void;
  onSelectAll: (checked: boolean, rows: AssetEnriched[] | FolderEnriched[]) => void;
  onSelectOne: (element: AssetEnriched | FolderEnriched) => void;
  rows: AssetEnriched[] | FolderEnriched[];
  selected: AssetEnriched[] | FolderEnriched[];
  shouldDisableBulkSelect?: boolean;
  sortQuery: string;
};

export const TableList = ({
  assetCount = 0,
  folderCount = 0,
  indeterminate = false,
  onChangeSort,
  onChangeFolder,
  onEditAsset,
  onEditFolder,
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
              onCheckedChange={(checked: boolean) => onSelectAll(checked, rows)}
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
