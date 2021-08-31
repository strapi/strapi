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

const TableHead = () => {
  const [{ query }, setQuery] = useQueryParams();
  const sort = query.sort;
  const [sortBy, sortOrder] = sort.split(':');
  const headers = [
    { label: 'Name', value: 'firstname', isSortable: true },
    { label: 'Email', value: 'email', isSortable: true },
    { label: 'Roles', value: 'roles', isSortable: false },
    { label: 'Username', value: 'username', isSortable: true },
    { label: 'Active User', value: 'isActive', isSortable: false },
  ];

  return (
    <Thead>
      <Tr>
        <Th>
          <BaseCheckbox aria-label="Select all entries" />
        </Th>
        {headers.map(({ label, value, isSortable }) => {
          const isSorted = sortBy === value;
          const isUp = sortOrder === 'ASC';

          const handleClickSort = (shouldAllowClick = true) => {
            if (isSortable && shouldAllowClick) {
              const nextSortOrder = isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC';
              const nextSort = `${value}:${nextSortOrder}`;

              setQuery({
                sort: nextSort,
              });
            }
          };

          return (
            <Th
              key={value}
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

        <Th>
          <VisuallyHidden>Actions</VisuallyHidden>
        </Th>
      </Tr>
    </Thead>
  );
};

export default TableHead;
