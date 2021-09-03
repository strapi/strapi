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
import { useIntl } from 'react-intl';

const TableHead = ({
  areAllEntriesSelected,
  entriesToDelete,
  headers,
  onSelectAll,
  withMainAction,
  withBulkActions,
}) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();
  const sort = query.sort || '';
  const [sortBy, sortOrder] = sort.split(':');

  const isIndeterminate = !areAllEntriesSelected && entriesToDelete.length;

  return (
    <Thead>
      <Tr>
        {withMainAction && (
          <Th>
            <BaseCheckbox
              aria-label={formatMessage({
                id: 'list.all-entries.select',
                defaultMessage: 'Select all entries',
              })}
              checked={areAllEntriesSelected}
              indeterminate={isIndeterminate}
              onChange={onSelectAll}
            />
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
                    label={formatMessage(
                      { id: 'components.TableHeader.sort', defaultMessage: 'Sort on {label}' },
                      { label }
                    )}
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
  areAllEntriesSelected: false,
  entriesToDelete: [],
  headers: [],
  withBulkActions: false,
  withMainAction: false,
};

TableHead.propTypes = {
  areAllEntriesSelected: PropTypes.bool,
  entriesToDelete: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  headers: PropTypes.array,
  onSelectAll: PropTypes.func.isRequired,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default TableHead;
