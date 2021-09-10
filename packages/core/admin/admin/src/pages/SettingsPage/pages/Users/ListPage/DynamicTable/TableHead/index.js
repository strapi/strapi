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

  const isIndeterminate = !areAllEntriesSelected && entriesToDelete.length > 0;

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
          const sortLabel = formatMessage(
            { id: 'components.TableHeader.sort', defaultMessage: 'Sort on {label}' },
            { label }
          );
          const intlLabel = formatMessage({ id: label, defaultMessage: label });

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
                    label={sortLabel}
                    onClick={handleClickSort}
                    icon={isSorted ? <SortIcon isUp={isUp} /> : undefined}
                    noBorder
                  />
                ) : (
                  undefined
                )
              }
            >
              <Tooltip label={isSortable ? sortLabel : intlLabel}>
                <TableLabel
                  as={!isSorted && isSortable ? 'button' : 'span'}
                  label={intlLabel}
                  onClick={() => handleClickSort(!isSorted)}
                >
                  {intlLabel}
                </TableLabel>
              </Tooltip>
            </Th>
          );
        })}

        {withBulkActions && (
          <Th>
            <VisuallyHidden>
              {formatMessage({
                id: 'components.TableHeader.actions-label',
                defaultMessage: 'Actions',
              })}
            </VisuallyHidden>
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
