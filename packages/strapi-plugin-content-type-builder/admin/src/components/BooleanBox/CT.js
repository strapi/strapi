import React from 'react';
import PropTypes from 'prop-types';
import CTSelected from './icons/CTSelected';
import CTUnselected from './icons/CTUnselected';

const CT = ({ selected }) =>
  selected ? (
    <CTSelected aria-hidden data-testid="ct-selected" />
  ) : (
    <CTUnselected aria-hidden data-testid="ct-unselected" />
  );

CT.defaultProps = {
  selected: false,
};

CT.propTypes = {
  selected: PropTypes.bool,
};

export default CT;
