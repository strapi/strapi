import React from 'react';
import {
  BaseCheckbox,
  IconButton,
  Tooltip,
  Typography,
  Th,
  Thead,
  Tr,
  VisuallyHidden,
} from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import SortIcon from '../../../icons/SortIcon';
import useQueryParams from '../../../hooks/useQueryParams';

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
  const sort = query?.sort || '';
  const [sortBy, sortOrder] = sort.split(':');
  const isIndeterminate = !areAllEntriesSelected && entriesToDelete.length > 0;

  return (
    <Thead>
      <Tr>
        {withMainAction && (
          <Th>
            <BaseCheckbox
              aria-label={formatMessage({
                id: 'global.select-all-entries',
                defaultMessage: 'Select all entries',
              })}
              checked={areAllEntriesSelected}
              indeterminate={isIndeterminate}
              onChange={onSelectAll}
            />
          </Th>
        )}
        {headers.map(
          ({ fieldSchema, name, metadatas: { sortable: isSortable, label, mainField } }) => {
            let isSorted = sortBy === name;
            const isUp = sortOrder === 'ASC';

            // relations always have to be sorted by their main field instead of only the
            // attribute name; sortBy e.g. looks like: &sortBy=attributeName[mainField]:ASC
            if (fieldSchema?.type === 'relation' && mainField) {
              isSorted = sortBy === `${name.split('.')[0]}[${mainField.name}]`;
            }

            const sortLabel = formatMessage(
              { id: 'components.TableHeader.sort', defaultMessage: 'Sort on {label}' },
              { label }
            );

            const handleClickSort = (shouldAllowClick = true) => {
              if (isSortable && shouldAllowClick) {
                let nextSort = name;

                // relations always have to be sorted by their main field instead of only the
                // attribute name; nextSort e.g. looks like: &nextSort=attributeName[mainField]:ASC
                if (fieldSchema?.type === 'relation' && mainField) {
                  nextSort = `${name.split('.')[0]}[${mainField.name}]`;
                }

                setQuery({
                  sort: `${nextSort}:${isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC'}`,
                });
              }
            };

            return (
              <Th
                key={name}
                action={
                  isSorted && (
                    <IconButton
                      label={sortLabel}
                      onClick={handleClickSort}
                      icon={isSorted && <SortIcon isUp={isUp} />}
                      noBorder
                    />
                  )
                }
              >
                <Tooltip label={isSortable ? sortLabel : label}>
                  <Typography
                    textColor="neutral600"
                    as={!isSorted && isSortable ? 'button' : 'span'}
                    label={label}
                    onClick={() => handleClickSort(!isSorted)}
                    variant="sigma"
                  >
                    {label}
                  </Typography>
                </Tooltip>
              </Th>
            );
          }
        )}

        {withBulkActions && (
          <Th>
            <VisuallyHidden>
              {formatMessage({
                id: 'global.actions',
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
