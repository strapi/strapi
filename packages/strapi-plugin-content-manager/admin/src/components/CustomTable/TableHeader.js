import React, { memo } from 'react';
import PropTypes from 'prop-types';

import { useListView } from '../../contexts/ListView';
import CustomInputCheckbox from '../CustomInputCheckbox';
import { Icon, Thead } from './styledComponents';

function TableHeader({ headers, isBulkable }) {
  const {
    data,
    entriesToDelete,
    firstSortableElement,
    onChangeBulkSelectall,
    onChangeParams,
    searchParams: { _sort },
  } = useListView();
  const [sortBy, sortOrder] = _sort.split(':');

  return (
    <Thead isBulkable={isBulkable}>
      <tr>
        {isBulkable && (
          <th>
            <CustomInputCheckbox
              entriesToDelete={entriesToDelete}
              isAll
              name="all"
              onChange={onChangeBulkSelectall}
              value={
                data.length === entriesToDelete.length &&
                entriesToDelete.length > 0
              }
            />
          </th>
        )}
        {headers.map(header => {
          //
          return (
            <th
              key={header.name}
              onClick={() => {
                if (header.sortable) {
                  const isCurrentSort = header.name === sortBy;
                  const nextOrder =
                    isCurrentSort && sortOrder === 'ASC' ? 'DESC' : 'ASC';
                  let value = `${header.name}:${nextOrder}`;

                  if (isCurrentSort && sortOrder === 'DESC') {
                    value = `${firstSortableElement}:ASC`;
                  }

                  onChangeParams({
                    target: {
                      name: '_sort',
                      value,
                    },
                  });
                }
              }}
            >
              <span>
                {header.label}
                {sortBy === header.name && (
                  <Icon
                    className="fa fa-sort-asc"
                    isAsc={sortOrder === 'ASC'}
                  />
                )}
              </span>
            </th>
          );
        })}
        <th></th>
      </tr>
    </Thead>
  );
}

TableHeader.defaultProps = {
  isBulkable: true,
  headers: [],
};

TableHeader.propTypes = {
  headers: PropTypes.array,
  isBulkable: PropTypes.bool,
};

export default memo(TableHeader);
