import React, { memo } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import { getQueryParameters } from 'strapi-helper-plugin';
import CustomInputCheckbox from '../CustomInputCheckbox';
import { Icon, Thead } from './styledComponents';

function TableHeader({
  defaultSortBy,
  defaultSortOrder,
  headers,
  isBulkable,
  onChangeParams,
  location: { search },
}) {
  let sortBy = defaultSortBy;
  let sortOrder = defaultSortOrder;
  const searchSort = getQueryParameters(search, '_sort');
  const firstSortableHeader = headers.filter(
    header => header.sortable === true
  )[0];

  if (searchSort) {
    const [sort, order] = searchSort.split(':');
    sortBy = sort;
    sortOrder = order;
  }

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
                  const nextOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
                  let value = `${header.name}:${nextOrder}`;

                  if (sortBy === header.name && sortOrder === 'DESC') {
                    value = `${get(firstSortableHeader, 'name', 'id')}:ASC`;
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
  defaultSortBy: 'id',
  defaultSortOrder: 'ASC',
  isBulkable: true,
  headers: [],
};

TableHeader.propTypes = {
  defaultSortBy: PropTypes.string,
  defaultSortOrder: PropTypes.string,
  headers: PropTypes.array,
  isBulkable: PropTypes.bool,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }),
  onChangeParams: PropTypes.func.isRequired,
};

export default withRouter(memo(TableHeader));
