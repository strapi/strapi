import React, { memo } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';

import { useListView } from '../../contexts/ListView';
import CustomInputCheckbox from '../CustomInputCheckbox';
import { Icon, Thead } from './styledComponents';

function TableHeader({ headers, isBulkable }) {
  const {
    firstSortableElement,
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
              entriesToDelete={[]}
              isAll
              name="all"
              onChange={() => {}}
              value
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

export default withRouter(memo(TableHeader));
