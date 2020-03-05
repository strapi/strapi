import React from 'react';
import PropTypes from 'prop-types';

import FiltersList from '../FiltersList';
import FiltersPicker from '../FiltersPicker';

const Filters = ({ onChange, onClick, filters }) => {
  return (
    <>
      <FiltersPicker onChange={onChange} />
      <FiltersList filters={filters} onClick={onClick} />
    </>
  );
};

Filters.defaultProps = {
  filters: [],
  onChange: () => {},
  onClick: () => {},
};

Filters.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      filter: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
  onChange: PropTypes.func,
  onClick: PropTypes.func,
};

export default Filters;
