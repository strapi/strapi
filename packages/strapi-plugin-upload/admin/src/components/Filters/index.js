import React from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';

import FiltersList from '../FiltersList';
import FiltersPicker from '../FiltersPicker';

const Filters = ({ onChange, onClick, filters }) => {
  return (
    <>
      <FiltersPicker onChange={onChange} />
      <Padded left size="sm" />
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
  filters: PropTypes.arrayOf(PropTypes.object),
  onChange: PropTypes.func,
  onClick: PropTypes.func,
};

export default Filters;
