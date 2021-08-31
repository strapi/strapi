import React from 'react';
import {
  BaseCheckbox,
  IconButton,
  TableLabel,
  Th,
  Thead,
  Tr,
  Tooltip,
  VisuallyHidden,
} from '@strapi/parts';
import { SortIcon, useQueryParams } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

const TableHead = ({ headers, withMainAction, withBulkActions }) => {
  const [{ query }, setQuery] = useQueryParams();
  const sort = query.sort;
  const [sortBy, sortOrder] = sort.split(':');

  return (
    <Thead>
      <Tr>
        {withMainAction && (
          <Th>
            <BaseCheckbox aria-label="Select all entries" />
          </Th>
        )}
        {headers.map(({ name, metadatas: { sortable: isSortable, label } }) => {
          const isSorted = sortBy === name;
          const isUp = sortOrder === 'ASC';

          const handleClickSort = (shouldAllowClick = true) => {
            if (isSortable && shouldAllowClick) {
              const nextSortOrder = isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC';
              const nextSort = `${name}:${nextSortOrder}`;

              setQuery({
                sort: nextSort,
              });
            }
          };

          return (
            <Th
              key={name}
              action={
                isSorted ? (
                  <IconButton
                    label={`Sort on ${label}`}
                    onClick={handleClickSort}
                    icon={isSorted ? <SortIcon isUp={isUp} /> : undefined}
                    noBorder
                  />
                ) : (
                  undefined
                )
              }
            >
              <Tooltip label={`Sort on ${label}`}>
                <TableLabel
                  as={!isSorted && isSortable ? 'button' : 'span'}
                  label={`Sort on ${label}`}
                  onClick={() => handleClickSort(!isSorted)}
                >
                  {label}
                </TableLabel>
              </Tooltip>
            </Th>
          );
        })}

        {withBulkActions && (
          <Th>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        )}
      </Tr>
    </Thead>
  );
};

TableHead.defaultProps = {
  headers: [],
  withBulkActions: false,
  withMainAction: false,
};

TableHead.propTypes = {
  headers: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default TableHead;
