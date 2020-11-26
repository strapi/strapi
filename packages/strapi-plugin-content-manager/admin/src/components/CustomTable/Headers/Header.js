import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';
import { useListView } from '../../../hooks';
import Arrow from './Arrow';

const Header = ({ fieldSchema: { type }, metadatas: { label, sortable, mainField }, name }) => {
  const { _sort, firstSortableHeader, setQuery } = useListView();
  const { emitEvent } = useGlobalContext();
  const [sortBy, sortOrder] = _sort.split(':');

  let sortField = name;

  if (type === 'relation') {
    sortField = `${name}.${mainField}`;
  }

  const handleClick = () => {
    if (sortable) {
      emitEvent('didSortEntries');

      const isCurrentSort = sortField === sortBy;
      const nextOrder = isCurrentSort && sortOrder === 'ASC' ? 'DESC' : 'ASC';
      let value = `${sortField}:${nextOrder}`;

      if (isCurrentSort && sortOrder === 'DESC') {
        value = `${firstSortableHeader}:ASC`;
      }

      setQuery({
        _sort: value,
      });
    }
  };

  return (
    <th onClick={handleClick}>
      <span className={sortable ? 'sortable' : ''}>
        {label}
        {sortBy === sortField && <Arrow fill="#212529" isUp={sortOrder === 'ASC' && 'isAsc'} />}
      </span>
    </th>
  );
};

Header.propTypes = {
  fieldSchema: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
  metadatas: PropTypes.shape({
    label: PropTypes.string.isRequired,
    sortable: PropTypes.bool.isRequired,
    mainField: PropTypes.string,
  }).isRequired,
  name: PropTypes.string.isRequired,
};

export default memo(Header);
