import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { IconButton } from '@strapi/design-system/IconButton';
import { Table, Th, Thead, Tr } from '@strapi/design-system/Table';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import CarretDown from '@strapi/icons/CarretDown';
import CarretUp from '@strapi/icons/CarretUp';

import { getTrad } from '../../utils';
import { AssetDefinition, tableHeaders, FolderDefinition } from '../../constants';
import { TableRows } from './TableRows';

export const TableList = ({
  assetCount,
  folderCount,
  indeterminate,
  onChangeSort,
  onEditAsset,
  onEditFolder,
  onSelectAll,
  onSelectOne,
  rows,
  selected,
  sortQuery,
}) => {
  const { formatMessage } = useIntl();
  const [sortBy, sortOrder] = sortQuery.split(':');

  return (
    <Table colCount={tableHeaders.length + 2} rowCount={assetCount + folderCount + 1}>
      <Thead>
        <Tr>
          <Th>
            <BaseCheckbox
              aria-label={formatMessage({
                id: getTrad('bulk.select.label'),
                defaultMessage: 'Select all folders & assets',
              })}
              indeterminate={indeterminate}
              onChange={(e) => onSelectAll(e, rows)}
              value={
                (assetCount > 0 || folderCount > 0) && selected.length === assetCount + folderCount
              }
            />
          </Th>
          {tableHeaders.map(({ metadatas: { label, isSortable }, name, key }) => {
            const isSorted = sortBy === name;
            const isUp = sortOrder === 'ASC';
            const tableHeaderLabel = formatMessage(label);
            const sortLabel = formatMessage(
              { id: 'list-table-header-sort', defaultMessage: 'Sort on {label}' },
              { label: tableHeaderLabel }
            );

            const handleClickSort = () => {
              if (isSortable) {
                const nextSortOrder = isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC';
                const nextSort = `${name}:${nextSortOrder}`;

                onChangeSort(nextSort);
              }
            };

            return (
              <Th
                action={
                  isSorted && (
                    <IconButton
                      label={sortLabel}
                      onClick={handleClickSort}
                      icon={isUp ? <CarretUp /> : <CarretDown />}
                      noBorder
                    />
                  )
                }
                key={key}
              >
                {isSortable ? (
                  <Tooltip label={sortLabel}>
                    <Typography
                      onClick={() => handleClickSort(!isSorted)}
                      as={isSorted ? 'span' : 'button'}
                      label={!isSorted ? sortLabel : ''}
                      textColor="neutral600"
                      variant="sigma"
                    >
                      {tableHeaderLabel}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography textColor="neutral600" variant="sigma">
                    {tableHeaderLabel}
                  </Typography>
                )}
              </Th>
            );
          })}
          <Th>
            <VisuallyHidden>
              {formatMessage({
                id: getTrad('list-table-header-actions'),
                defaultMessage: 'actions',
              })}
            </VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <TableRows
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
  onEditAsset: null,
  onEditFolder: null,
  rows: [],
  selected: [],
  sortQuery: '',
};

TableList.propTypes = {
  assetCount: PropTypes.number,
  folderCount: PropTypes.number,
  indeterminate: PropTypes.bool,
  onChangeSort: PropTypes.func,
  onEditAsset: PropTypes.func,
  onEditFolder: PropTypes.func,
  onSelectAll: PropTypes.func.isRequired,
  onSelectOne: PropTypes.func.isRequired,
  rows: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  sortQuery: PropTypes.string,
};
