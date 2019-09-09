/**
 *
 * BackButton
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import StyledBackButton from './StyledBackButton';

function BackButton({ onClick }) {
  return (
    <StyledBackButton onClick={onClick}>
      <i className="fa fa-chevron-left"></i>
    </StyledBackButton>
  );
}

BackButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default BackButton;
