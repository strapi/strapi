import React from 'react';

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
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition, FolderDefinition, tableHeaders } from '../../constants';
import { getTrad } from '../../utils';

import { TableRows } from './TableRows';

export const TableList = ({
  assetCount,
  folderCount,
  indeterminate,
  onChangeSort,
  onChangeFolder,
  onEditAsset,
  onEditFolder,
  onSelectAll,
  onSelectOne,
  rows,
  selected,
  shouldDisableBulkSelect,
  sortQuery,
}) => {
  const { formatMessage } = useIntl();
  const [sortBy, sortOrder] = sortQuery.split(':');

  const handleClickSort = (isSorted, name) => {
    const nextSortOrder = isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    const nextSort = `${name}:${nextSortOrder}`;

    onChangeSort(nextSort);
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
                      label={!isSorted ? sortLabel : ''}
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
        onEditAsset={onEditAsset}
        onEditFolder={onEditFolder}
        rows={rows}
        onSelectOne={onSelectOne}
        selected={selected}
      />
    </Table>
  );
};

TableList.defaultProps = {
  assetCount: 0,
  folderCount: 0,
  indeterminate: false,
  onChangeSort: null,
  onChangeFolder: null,
  onEditAsset: null,
  onEditFolder: null,
  rows: [],
  selected: [],
  shouldDisableBulkSelect: false,
  sortQuery: '',
};

TableList.propTypes = {
  assetCount: PropTypes.number,
  folderCount: PropTypes.number,
  indeterminate: PropTypes.bool,
  onChangeSort: PropTypes.func,
  onChangeFolder: PropTypes.func,
  onEditAsset: PropTypes.func,
  onEditFolder: PropTypes.func,
  onSelectAll: PropTypes.func.isRequired,
  onSelectOne: PropTypes.func.isRequired,
  rows: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  shouldDisableBulkSelect: PropTypes.bool,
  sortQuery: PropTypes.string,
};
