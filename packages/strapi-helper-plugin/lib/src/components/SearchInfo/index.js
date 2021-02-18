import React from 'react';
import PropTypes from 'prop-types';
import FilterIcon from '../../svgs/Filter';
import Wrapper from './Wrapper';

const SearchInfos = ({ label }) => {
  return (
    <Wrapper>
      <FilterIcon />
      {label}
    </Wrapper>
  );
};

SearchInfos.defaultProps = {
  label: null,
};

SearchInfos.propTypes = {
  label: PropTypes.string,
};

export default SearchInfos;
