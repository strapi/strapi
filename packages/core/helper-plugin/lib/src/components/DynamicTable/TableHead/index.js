import React from 'react';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { IconButton } from '@strapi/design-system/IconButton';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Typography } from '@strapi/design-system/Typography';
import { Th, Thead, Tr } from '@strapi/design-system/Table';
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
        {headers.map(({ name, metadatas: { sortable: isSortable, label } }) => {
          const isSorted = sortBy === name;
          const isUp = sortOrder === 'ASC';

          const intlLabel = formatMessage({
            id: `global.table.header.${name}`,
            defaultMessage: label,
          });

          const sortLabel = formatMessage(
            { id: 'components.TableHeader.sort', defaultMessage: 'Sort on {label}' },
            { label: intlLabel }
          );

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
              <Tooltip label={isSortable ? sortLabel : intlLabel}>
                <Typography
                  textColor="neutral600"
                  as={!isSorted && isSortable ? 'button' : 'span'}
                  label={intlLabel}
                  onClick={() => handleClickSort(!isSorted)}
                  variant="sigma"
                >
                  {intlLabel}
                </Typography>
              </Tooltip>
            </Th>
          );
        })}

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
