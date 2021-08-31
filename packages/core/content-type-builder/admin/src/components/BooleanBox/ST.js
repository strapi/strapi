import React from 'react';
import PropTypes from 'prop-types';
import STSelected from './icons/STSelected';
import STUnselected from './icons/STUnselected';

const ST = ({ selected }) =>
  selected ? (
    <STSelected aria-hidden data-testid="st-selected" />
  ) : (
    <STUnselected aria-hidden data-testid="st-unselected" />
  );

ST.defaultProps = {
  selected: false,
};

ST.propTypes = {
  selected: PropTypes.bool,
};

export default ST;
